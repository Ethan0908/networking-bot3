import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function dec(buf: Buffer) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "utf8");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export async function GET(req: NextRequest) {
  // Simple internal auth so only n8n can call this
  if (req.headers.get("x-internal-key") !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "missing_userId" }, { status: 400 });

  const row = await pool.query(
    "select refresh_token_enc, google_email from user_gmail_tokens where user_id = $1",
    [userId]
  );
  if (!row.rowCount) return NextResponse.json({ error: "no_token" }, { status: 404 });

  const refresh_token = dec(row.rows[0].refresh_token_enc);
  const form = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = await res.json();

  // Return access token and the sender email
  return NextResponse.json({ access_token: json.access_token, sender: row.rows[0].google_email });
}