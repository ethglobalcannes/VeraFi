import { NextResponse } from "next/server";

// ─── Config ──────────────────────────────────────────────────────────────────
// Try multiple RPCs in order — first one that works wins
const RPCS = [
  "https://coston2-api.flare.network/ext/C/rpc",
  "https://coston2.enosys.global/ext/C/rpc",
  "https://rpc.ankr.com/flare_coston2",
];

const MOCK_GAMMA_ADDRESS = "0x51947aC30bB1F289F20bA740E1664cE20E23F94A";

// keccak256("OptionFilled(bytes32,address,address,uint256,uint256,uint256,uint256,bool)")
const OPTION_FILLED_TOPIC =
  "0x64c9231d52e98cebefa67891f33224bc2ae638a2cc08553bab531c0df0b9733e";

export type FilledEvent = {
  quoteHash: string;
  taker: string;
  maker: string;
  price: string;
  quantity: string;
  strike: string;
  expiry: number;
  isPut: boolean;
  blockNumber: number;
  txHash: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function rpcCall(rpc: string, method: string, params: unknown[]) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

async function tryRpcs(method: string, params: unknown[]) {
  let lastErr: Error | null = null;
  for (const rpc of RPCS) {
    try {
      return await rpcCall(rpc, method, params);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("All RPCs failed");
}

function decode32(hex: string, offset: number): string {
  return "0x" + hex.slice(2 + offset * 64, 2 + (offset + 1) * 64);
}

function decodeBigInt(hex: string, offset: number): bigint {
  return BigInt(decode32(hex, offset));
}

function decodeAddress(hex: string, offset: number): string {
  return "0x" + hex.slice(2 + offset * 64 + 24, 2 + (offset + 1) * 64);
}

function decodeBool(hex: string, offset: number): boolean {
  return decodeBigInt(hex, offset) !== BigInt(0);
}

// ─── Route ───────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Get latest block
    const latestHex: string = await tryRpcs("eth_blockNumber", []);
    const latest = parseInt(latestHex, 16);
    const fromBlock = Math.max(0, latest - 100); // last ~100 blocks (Coston2 RPC limit)

    // 2. Get logs
    const logs: Array<{
      address: string;
      topics: string[];
      data: string;
      blockNumber: string;
      transactionHash: string;
    }> = await tryRpcs("eth_getLogs", [
      {
        address: MOCK_GAMMA_ADDRESS,
        topics: [OPTION_FILLED_TOPIC],
        fromBlock: "0x" + fromBlock.toString(16),
        toBlock: "0x" + latest.toString(16),
      },
    ]);

    // 3. Decode events
    // OptionFilled(bytes32 indexed quoteHash, address indexed taker, address indexed maker,
    //   uint256 price, uint256 quantity, uint256 strike, uint256 expiry, bool isPut)
    // topics[0] = sig, topics[1] = quoteHash, topics[2] = taker, topics[3] = maker
    // data = abi.encode(price, quantity, strike, expiry, isPut)
    const events: FilledEvent[] = logs
      .slice()
      .reverse()
      .map((log) => ({
        quoteHash: log.topics[1],
        taker:     "0x" + log.topics[2].slice(26),
        maker:     "0x" + log.topics[3].slice(26),
        price:     decodeBigInt(log.data, 0).toString(),
        quantity:  decodeBigInt(log.data, 1).toString(),
        strike:    decodeBigInt(log.data, 2).toString(),
        expiry:    Number(decodeBigInt(log.data, 3)),
        isPut:     decodeBool(log.data, 4),
        blockNumber: parseInt(log.blockNumber, 16),
        txHash:    log.transactionHash,
      }));

    return NextResponse.json({ events, latestBlock: latest, scannedFrom: fromBlock });
  } catch (err) {
    console.error("[/api/events]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch events." },
      { status: 500 }
    );
  }
}
