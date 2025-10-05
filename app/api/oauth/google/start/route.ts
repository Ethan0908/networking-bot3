import { NextRequest, NextResponse } from "next/server";

import { requireEnv, resolveRedirectUri } from "../utils";

export async function GET(req: NextRequest) {
  let redirectUri: string;
  try {
    redirectUri = resolveRedirectUri(req);
  } catch (error) {
    return NextResponse.json(
      { error: "missing_redirect_uri", details: (error as Error).message },
      { status: 500 }
    );
  }

  let clientId: string;
  try {
    clientId = requireEnv("GOOGLE_CLIENT_ID");
  } catch (error) {
    return NextResponse.json(
      { error: "missing_google_client_id", details: (error as Error).message },
      { status: 500 }
    );
  }
  const scope = "https://www.googleapis.com/auth/gmail.send";
  // Replace with your auth/session username
  const username =
    req.nextUrl.searchParams.get("username") ||
    req.nextUrl.searchParams.get("userId") ||
    "demo-user";
  const state = encodeURIComponent(JSON.stringify({ username }));

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
