import { NextResponse } from "next/server";
import { ethers } from "ethers";

// ─── Flare Coston2 config ────────────────────────────────────────────────────
const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";
const MOCK_GAMMA_ADDRESS = "0x51947aC30bB1F289F20bA740E1664cE20E23F94A";
const DEPLOY_BLOCK = 0; // start scanning from genesis (fine for testnet)
const MAX_BLOCKS = 10_000; // cap so the query stays fast

// Only need the OptionFilled event — no full ABI required
const ABI = [
  "event OptionFilled(bytes32 indexed quoteHash, address indexed taker, address indexed maker, uint256 price, uint256 quantity, uint256 strike, uint256 expiry, bool isPut)",
];

export type FilledEvent = {
  quoteHash: string;
  taker: string;
  maker: string;
  price: string;      // raw uint256 string
  quantity: string;
  strike: string;
  expiry: number;
  isPut: boolean;
  blockNumber: number;
  txHash: string;
};

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
    const contract = new ethers.Contract(MOCK_GAMMA_ADDRESS, ABI, provider);

    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - MAX_BLOCKS);

    const rawEvents = await contract.queryFilter(
      contract.filters.OptionFilled(),
      fromBlock,
      latest
    );

    const events: FilledEvent[] = rawEvents
      .slice()
      .reverse() // most recent first
      .map((e) => {
        const log = e as ethers.EventLog;
        const [quoteHash, taker, maker, price, quantity, strike, expiry, isPut] =
          log.args;
        return {
          quoteHash: quoteHash as string,
          taker: taker as string,
          maker: maker as string,
          price: (price as bigint).toString(),
          quantity: (quantity as bigint).toString(),
          strike: (strike as bigint).toString(),
          expiry: Number(expiry as bigint),
          isPut: isPut as boolean,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        };
      });

    return NextResponse.json({ events, latestBlock: latest, scannedFrom: fromBlock });
  } catch (err) {
    console.error("[/api/events]", err);
    return NextResponse.json({ error: "Failed to fetch events." }, { status: 500 });
  }
}
