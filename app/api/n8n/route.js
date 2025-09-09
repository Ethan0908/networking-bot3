import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) return NextResponse.json({ error: "Missing N8N_WEBHOOK_URL" }, { status: 500 });

    const payload = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Proxy failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}