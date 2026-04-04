import { NextResponse } from "next/server";
import type { IntentV1 } from "@/types/intent";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Mock TEE quote engine
// In production this calls the Flare Compute Extension (FCE) inside Intel TDX
// and returns a real Monte Carlo price + on-chain attestation token.
// ---------------------------------------------------------------------------

function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  isPut: boolean
): number {
  if (T <= 0) return Math.max(0, isPut ? K - S : S - K);

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const N = (x: number) => {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  };

  if (isPut) {
    return K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
  }
  return S * N(d1) - K * Math.exp(-r * T) * N(d2);
}

export async function POST(req: Request) {
  try {
    const body: IntentV1 = await req.json();

    const S = 2.35; // fXRP spot price (mocked — in prod: Flare FTSO)
    const K = parseFloat(body.strike);
    const amount = parseFloat(body.amount);
    const now = Math.floor(Date.now() / 1000);
    const T = Math.max(0, (body.expiry - now) / (365 * 24 * 3600));
    const r = 0.045;
    const sigma = 0.82; // 82% IV for fXRP (mocked)

    // Black-Scholes reference price (per unit)
    const bsPrice = blackScholes(S, K, T, r, sigma, body.isPut);

    // Monte Carlo: add small noise to simulate TEE computation
    const noise = (Math.random() - 0.5) * 0.004 * bsPrice;
    const mcPrice = Math.max(0, bsPrice + noise);

    // Greeks
    const dS = 0.001;
    const delta =
      (blackScholes(S + dS, K, T, r, sigma, body.isPut) -
        blackScholes(S - dS, K, T, r, sigma, body.isPut)) /
      (2 * dS);

    const dSigma = 0.001;
    const vega =
      (blackScholes(S, K, T, r, sigma + dSigma, body.isPut) -
        blackScholes(S, K, T, r, sigma - dSigma, body.isPut)) /
      (2 * dSigma);

    // Attestation stub — in prod: FCE returns real attestation token
    const seed = "0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const imageHash = "sha256:a3f2c1" + Array.from({ length: 58 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    const totalPremiumXRP = mcPrice * amount;

    return NextResponse.json({
      intentId: body.intentId,
      // Prices
      spotPrice: S,
      impliedVol: sigma,
      priceMC: mcPrice,
      priceBS: bsPrice,
      totalPremiumXRP,
      // Greeks
      delta,
      vega,
      // Attestation
      seed,
      imageHash,
      attestedAt: Date.now(),
      // Quote validity
      validUntil: Date.now() + 30_000,
      quoteId: uuidv4(),
    });
  } catch {
    return NextResponse.json({ error: "Quote failed." }, { status: 500 });
  }
}
