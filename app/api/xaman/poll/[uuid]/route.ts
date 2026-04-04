import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { uuid: string } }
) {
  const apiKey = process.env.XUMM_API_KEY;
  const apiSecret = process.env.XUMM_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Xumm API credentials are not configured." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://xumm.app/api/v1/platform/payload/${params.uuid}`,
    {
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Xumm API error." },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    signed: data?.meta?.signed ?? false,
    resolved: data?.meta?.resolved ?? false,
    expired: data?.meta?.expired ?? false,
    cancelled: data?.meta?.cancelled ?? false,
    account: data?.response?.account ?? null,
  });
}
