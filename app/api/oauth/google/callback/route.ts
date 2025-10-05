import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Pool } from "pg";

import { requireEnv, resolveRedirectUri } from "../utils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function enc(plain: string) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "utf8"); // 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]); // [12b IV][16b TAG][N]
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let username: string | undefined;
  try {
    const parsed = JSON.parse(stateRaw);
    if (parsed && typeof parsed.username === "string" && parsed.username) {
      username = parsed.username;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_state", details: (error as Error).message },
      { status: 400 }
    );
  }

  if (!username) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const redirectUri = resolveRedirectUri(req);

  let clientId: string;
  let clientSecret: string;
  try {
    clientId = requireEnv("GOOGLE_CLIENT_ID");
    clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  } catch (error) {
    return NextResponse.json(
      { error: "missing_google_credentials", details: (error as Error).message },
      { status: 500 }
    );
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "token_exchange_failed", details: tokenJson },
      { status: tokenRes.status }
    );
  }

  const refreshToken = tokenJson.refresh_token as string | undefined;

  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 400 });
  }

  // Also get the Google account email (who will send)
  const accessToken = tokenJson.access_token as string;
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json();
  const googleEmail = profile.email as string;

  // Store (upsert)
  const encBuf = enc(refreshToken);
  await pool.query(
    `insert into user_gmail_tokens (user_id, google_email, refresh_token_enc)
     values ($1, $2, $3)
     on conflict (user_id) do update set google_email = excluded.google_email,
                                          refresh_token_enc = excluded.refresh_token_enc,
                                          updated_at = now()`,
    [username, googleEmail, encBuf]
  );

  return NextResponse.redirect(`/settings?gmail=connected`);
}
