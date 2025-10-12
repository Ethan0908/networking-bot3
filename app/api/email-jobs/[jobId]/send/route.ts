import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import {
  getJob,
  recordSendOutcome,
} from "../../../../../lib/jobStore";
import { loadUserTokens, saveUserTokens } from "../../../../../lib/tokenStore";

export const runtime = "nodejs";

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function refreshAccessToken(userEmail: string, refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  const response = await oauth2.refreshAccessToken();
  const credentials = response.credentials;
  const accessToken = credentials.access_token;
  const expiry = credentials.expiry_date ?? Date.now() + 60 * 60 * 1000;
  if (!accessToken) {
    throw new Error("Unable to refresh Gmail access token");
  }
  saveUserTokens(userEmail, {
    accessToken,
    refreshToken,
    expiresAt: expiry,
  });
  return { accessToken, expiresAt: expiry };
}

async function ensureCredentials(userEmail: string) {
  const tokens = loadUserTokens(userEmail);
  if (!tokens) {
    throw new Error("Gmail is not connected for this account");
  }
  let { accessToken, refreshToken, expiresAt } = tokens;
  if (!accessToken || !expiresAt || expiresAt <= Date.now() + 60_000) {
    if (!refreshToken) {
      throw new Error("Refresh token missing; reconnect Gmail");
    }
    const refreshed = await refreshAccessToken(userEmail, refreshToken);
    accessToken = refreshed.accessToken;
    expiresAt = refreshed.expiresAt;
  }
  return { accessToken: accessToken!, refreshToken: refreshToken ?? null };
}

function buildMimeMessage(from: string, to: string, subject: string, body: string) {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ].join("\n");
}

export async function POST(
  req: NextRequest,
  context: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!session || !userEmail) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const jobId = context.params?.jobId;
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job || job.userId !== userEmail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (job.status !== "ready" || job.messages.length === 0) {
    return NextResponse.json(
      { error: "Drafts are not ready yet" },
      { status: 409 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const batchSize = Math.max(1, Math.min(50, Number(body?.batchSize) || 10));
  const paceMs = Math.max(0, Number(body?.paceMs) || 250);

  const pending = job.messages
    .map((message, index) => ({ ...message, index }))
    .filter((message) => message.status === "pending");

  if (pending.length === 0) {
    return NextResponse.json({
      jobId,
      sent: 0,
      failed: 0,
      remaining: 0,
      totals: job.sendSummary,
    });
  }

  const slice = pending.slice(0, batchSize);

  const credentials = await ensureCredentials(userEmail);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken ?? undefined,
  });
  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  let sent = 0;
  let failed = 0;

  for (const item of slice) {
    const to = String(item.to || "").trim();
    if (!to) {
      recordSendOutcome(jobId, item.index, {
        status: "failed",
        error: "Missing recipient",
      });
      failed += 1;
      continue;
    }

    const subject = String(item.subject || "");
    const bodyHtml = String(item.body || "");
    const raw = toBase64Url(buildMimeMessage(userEmail, to, subject, bodyHtml));

    try {
      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });
      recordSendOutcome(jobId, item.index, { status: "sent" });
      sent += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      recordSendOutcome(jobId, item.index, { status: "failed", error: message });
      failed += 1;
    }

    if (paceMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, paceMs));
    }
  }

  const updatedJob = getJob(jobId);
  const remaining = updatedJob
    ? updatedJob.messages.filter((item) => item.status === "pending").length
    : 0;

  return NextResponse.json({
    jobId,
    sent,
    failed,
    remaining,
    totals: updatedJob?.sendSummary ?? { sent: 0, failed: 0 },
  });
}
