import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  const scope = "https://www.googleapis.com/auth/gmail.send";
  // Replace with your auth/session user id
  const userId = req.nextUrl.searchParams.get("userId") || "demo-user";
  const state = encodeURIComponent(JSON.stringify({ userId }));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // ensures refresh_token
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}