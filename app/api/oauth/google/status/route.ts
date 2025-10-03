import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ error: "missing_username" }, { status: 400 });
  }

  const result = await pool.query(
    "select google_email from user_gmail_tokens where user_id = $1",
    [username]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }

  return NextResponse.json({ email: result.rows[0].google_email });
}
