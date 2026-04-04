import { NextRequest, NextResponse } from "next/server";

const MARCOS_ENDPOINT = "https://unindicated-latrice-snobbishly.ngrok-free.dev/api/intents/memo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const upstream = await fetch(MARCOS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ngrok free tier intercepts browser requests — this skips the warning page
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error("[intent proxy] upstream error", upstream.status, text);
      return NextResponse.json(
        { error: `Upstream ${upstream.status}`, detail: text },
        { status: upstream.status }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[intent proxy] error:", err);
    return NextResponse.json(
      { error: "Proxy failed", detail: String(err) },
      { status: 500 }
    );
  }
}
