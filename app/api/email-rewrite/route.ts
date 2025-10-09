import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export const runtime = "nodejs";

type SessionLike = (Awaited<ReturnType<typeof getServerSession>> & {
  access_token?: string;
  refresh_token?: string;
  user?: {
    email?: string | null;
  } | null;
}) | null;

type RewriteRequestBody = {
  template?: Record<string, unknown> | null;
  dataset?: Record<string, unknown> | null;
  options?: Record<string, unknown> | null;
};

type EmailResult = {
  to?: string | string[] | null;
  subject?: string | null;
  body?: unknown;
};

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function normaliseRecipient(value: EmailResult["to"]) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  return String(value);
}

function resolveBodyContent(body: EmailResult["body"]) {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    const candidate = body as Record<string, unknown>;
    if (typeof candidate.html === "string") {
      return candidate.html;
    }
    if (typeof candidate.text === "string") {
      return candidate.text.replace(/\n/g, "<br/>");
    }
  }
  return String(body);
}

async function sendWithGmail(session: NonNullable<SessionLike>, emails: EmailResult[]) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2.setCredentials({
    access_token: (session as any)?.access_token,
    refresh_token: (session as any)?.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const fromAddress = session?.user?.email;
  if (!fromAddress) {
    throw new Error("Authenticated user email is required to send messages.");
  }

  const outcomes: { to: string; success: boolean; error?: string }[] = [];

  for (const email of emails) {
    const toAddress = normaliseRecipient(email?.to);
    if (!toAddress) {
      outcomes.push({ to: "", success: false, error: "Missing recipient" });
      continue;
    }

    const subjectLine = email?.subject ? String(email.subject) : "";
    const htmlBody = resolveBodyContent(email?.body);
    const rawMessage = toBase64Url(
      [
        `From: ${fromAddress}`,
        `To: ${toAddress}`,
        `Subject: ${subjectLine}`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "",
        htmlBody,
      ].join("\n")
    );

    try {
      await gmail.users.messages.send({ userId: "me", requestBody: { raw: rawMessage } });
      outcomes.push({ to: toAddress, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send";
      outcomes.push({ to: toAddress, success: false, error: message });
    }
  }

  return outcomes;
}

async function callN8n(body: Record<string, unknown>) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error("Missing N8N_WEBHOOK_URL environment variable.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      response.statusText ||
      "Rewrite request failed";
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

export async function POST(req: NextRequest) {
  const session: SessionLike = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { template, dataset, options }: RewriteRequestBody = await req.json();

  const payload = {
    action: "email",
    template: template ? { ...template } : {},
    dataset: dataset ? { ...dataset } : {},
    options: options ? { ...options } : {},
  } as Record<string, unknown>;

  if (typeof (payload.template as any)?.body === "string") {
    (payload.template as any).rewriteSource = (payload.template as any).body;
  }

  if ((payload.dataset as any) && typeof (payload.dataset as any) === "object") {
    (payload.dataset as any).templateBody = (payload.template as any)?.body ?? null;
  }

  if ((payload.options as any) && typeof (payload.options as any) === "object") {
    if (!("rewriteMode" in (payload.options as any))) {
      (payload.options as any).rewriteMode = "rewrite-non-variables";
    }
  }

  let data: any;
  try {
    data = await callN8n(payload);
  } catch (error) {
    const status = (error as any)?.status || 502;
    const detail = (error as any)?.data;
    const message = error instanceof Error ? error.message : "Rewrite request failed";
    return NextResponse.json({ error: message, detail }, { status });
  }

  const emails: EmailResult[] = Array.isArray(data?.emails) ? data.emails : [];
  let sendResults: Awaited<ReturnType<typeof sendWithGmail>> | null = null;

  if (emails.length > 0) {
    try {
      sendResults = await sendWithGmail(session, emails);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send via Gmail";
      return NextResponse.json(
        { error: message, emails, sendResults: sendResults ?? [] },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ...data, sendResults: sendResults ?? [] });
}
