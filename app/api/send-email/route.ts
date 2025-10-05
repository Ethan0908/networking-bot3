import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // adjust import if needed

// Helper: base64url
function toBase64Url(str: string) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorised", { status: 401 });

  const { to, subject, text, html } = await req.json();

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Use user tokens from NextAuth
  oauth2.setCredentials({
    access_token: (session as any).access_token,
    refresh_token: (session as any).refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  const from = session.user?.email!;
  const body = html ?? (text ? text.replace(/\n/g, "<br/>") : "");
  const rawLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ];
  const raw = toBase64Url(rawLines.join("\n"));

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return Response.json({ ok: true });
}