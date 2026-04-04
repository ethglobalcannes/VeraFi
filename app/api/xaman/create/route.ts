import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.XUMM_API_KEY;
  const apiSecret = process.env.XUMM_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Xumm API credentials are not configured." },
      { status: 500 }
    );
  }

  const res = await fetch("https://xumm.app/api/v1/platform/payload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
    },
    body: JSON.stringify({ txjson: { TransactionType: "SignIn" } }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Xumm API error." },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({ qrUrl: data.refs.qr_png, uuid: data.uuid });
}
