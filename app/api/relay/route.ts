import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RELAY_ADDRESS = "0xef6061886eecf6879723b8c5a3A258dc72B12EBb";
const RELAY_ABI = [
  "function submitRFQ(address asset, uint256 strike, uint256 expiry, bool isPut, uint256 quantity)",
];

export async function POST(req: NextRequest) {
  try {
    const { strike, expiry, isPut, quantity } = await req.json();

    console.log("[relay] submitRFQ params:", { strike, expiry, isPut, quantity });

    const rawKey = process.env.PRIVATE_KEY;
    if (!rawKey) throw new Error("PRIVATE_KEY env var not set");

    const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const provider   = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet     = new ethers.Wallet(privateKey, provider);
    const relay      = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, wallet);

    const tx = await relay.submitRFQ(
      ethers.ZeroAddress,
      ethers.parseUnits(String(strike), 6),
      BigInt(expiry),
      isPut,
      ethers.parseUnits(String(quantity), 6),
    );

    console.log("[relay] tx broadcast — hash:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt) {
      console.error("[relay] tx.wait() returned null");
      return NextResponse.json({ error: "Transaction not mined" }, { status: 500 });
    }

    const success = receipt.status === 1;
    console.log("[relay] status:", success ? "SUCCESS" : "REVERTED");
    console.log("[relay] block:", receipt.blockNumber, "| gasUsed:", receipt.gasUsed.toString());
    console.log("[relay] tx mined — hash:", receipt.hash);

    return NextResponse.json({ txHash: receipt.hash, success });
  } catch (err: unknown) {
    const revertReason =
      (err as any)?.revert?.args?.[0] ??
      (err as any)?.reason ??
      (err as any)?.shortMessage ??
      null;
    console.error("[relay] submitRFQ failed:", err);
    if (revertReason) console.error("[relay] revert reason:", revertReason);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", revertReason },
      { status: 500 },
    );
  }
}
