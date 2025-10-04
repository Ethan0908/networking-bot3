import { NextRequest, NextResponse } from "next/server";

function buildRedirectUrl(req: NextRequest) {
  const target = new URL("/api/oauth/google/start", req.nextUrl.origin);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target;
}

export async function GET(req: NextRequest) {
  const target = buildRedirectUrl(req);
  return NextResponse.redirect(target);
}

export async function POST(req: NextRequest) {
  const target = buildRedirectUrl(req);
  return NextResponse.redirect(target, { status: 307 });
}
