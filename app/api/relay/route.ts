import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RELAY_ADDRESS = "0xef6061886eecf6879723b8c5a3A258dc72B12EBb";
const RELAY_ABI = [
  "function submitRFQ(address assets, uint256 strike, uint256 expiry, bool isPut, uint256 quantity)",
];

export async function POST(req: NextRequest) {
  try {
    const { strike, expiry, isPut, quantity } = await req.json();

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const relay = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, wallet);

    const tx = await relay.submitRFQ(
      ethers.ZeroAddress,
      ethers.parseUnits(String(strike), 6),
      BigInt(expiry),
      isPut,
      ethers.parseUnits(String(quantity), 6)
    );

    console.log("[relay] tx submitted — hash:", tx.hash);

    const receipt = await tx.wait();

    console.log("[relay] tx mined — hash:", receipt.hash);
    console.log("[relay] status:", receipt.status === 1 ? "SUCCESS" : "REVERTED");
    console.log("[relay] block:", receipt.blockNumber, "| gasUsed:", receipt.gasUsed.toString());

    return NextResponse.json({ txHash: receipt.hash });
  } catch (err) {
    console.error("[relay] submitRFQ failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
