import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const url = `${origin}/api/email-jobs`;
  const bodyText = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: bodyText,
  });

  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
