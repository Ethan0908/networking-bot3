import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function decrypt(buffer: Buffer) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "utf8");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function exchangeRefreshToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to refresh Gmail access token.");
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Missing access token from Google response.");
  }

  return json.access_token;
}

async function sendMessage(accessToken: string, rawMessage: string) {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64UrlEncode(rawMessage) }),
    }
  );

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      (typeof data === "string" && data) ||
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      response.statusText ||
      "Failed to send Gmail message.";
    throw new Error(message);
  }

  return data;
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = (payload ?? {}) as {
    username?: string;
    to?: string;
    subject?: string;
    message?: string;
  };

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!username) {
    return NextResponse.json({ error: "missing_username" }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ error: "missing_recipient" }, { status: 400 });
  }
  if (!message.trim()) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const tokenRow = await pool.query(
    "select refresh_token_enc, google_email from user_gmail_tokens where user_id = $1",
    [username]
  );

  if (tokenRow.rowCount === 0) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }

  const row = tokenRow.rows[0] as {
    refresh_token_enc: Buffer;
    google_email: string;
  };
  const refreshToken = decrypt(row.refresh_token_enc);

  let accessToken: string;
  try {
    accessToken = await exchangeRefreshToken(refreshToken);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Failed to refresh Gmail access token.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }

  const sender = row.google_email;
  const lines = [
    `From: ${sender}`,
    `To: ${to}`,
    `Subject: ${subject || ""}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "Content-Transfer-Encoding: 7bit",
    "",
    message,
  ];
  const raw = lines.join("\r\n");

  try {
    const gmailResponse = await sendMessage(accessToken, raw);
    return NextResponse.json({ success: true, gmail: gmailResponse });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to send Gmail message.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
