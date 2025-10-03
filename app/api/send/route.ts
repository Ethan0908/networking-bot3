import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    oauth2.setCredentials({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    const raw = Buffer.from(
      [
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "Content-Transfer-Encoding: 7bit",
        `to: recipient@example.com`,
        `from: ${session.user?.email}`,
        "subject: Hello from Vercel + Gmail API",
        "",
        "It works. Cheers!",
      ].join("\n")
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
