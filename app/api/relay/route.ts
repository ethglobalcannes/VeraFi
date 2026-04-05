import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RELAY_ADDRESS = "0xef6061886eecf6879723b8c5a3A258dc72B12EBb";
const RELAY_ABI = [
  "function submitRFQ(address asset, uint256 strike, uint256 expiry, bool isPut, uint256 quantity)",
];

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const relay = new ethers.Contract(
      RELAY_ADDRESS,
      ["function owner() view returns (address)"],
      provider,
    );
    const owner: string = await relay.owner();
    const rawKey = process.env.PRIVATE_KEY ?? "";
    const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const wallet = new ethers.Wallet(privateKey);
    return NextResponse.json({ owner, ourWallet: wallet.address });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { strike, expiry, isPut, quantity } = await req.json();

    const rawKey = process.env.PRIVATE_KEY;
    if (!rawKey) throw new Error("PRIVATE_KEY env var not set");

    const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const relay = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, wallet);

    const fxrpAddress = process.env.FXRP_ADDRESS ?? "0x0b6A3645c240605887a5532109323A3E12273dc7";
    const strikeWei = ethers.parseUnits(String(strike), 18);
    const expiryTs = BigInt(Math.floor(new Date(expiry).getTime() / 1000));
    const quantityWei = ethers.parseUnits(String(quantity), 18);

    const tx = await relay.submitRFQ(
      fxrpAddress,
      strikeWei,
      expiryTs,
      isPut,
      quantityWei,
    );
    const receipt = await tx.wait();

    return NextResponse.json({ txHash: receipt.hash });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
