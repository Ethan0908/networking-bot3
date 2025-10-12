import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {
  createJob,
  getJob,
  markJobStatus,
  updateProgress,
} from "../../../lib/jobStore";
import { computeHmac } from "../../../lib/hmac";

export const runtime = "nodejs";

function normaliseObject(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return JSON.parse(JSON.stringify(value));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!session || !userEmail) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const template = normaliseObject(body.template);
  const dataset = normaliseObject(body.dataset);
  const options = normaliseObject(body.options);
  const contacts = Array.isArray(dataset.contacts) ? dataset.contacts : [];
  const totalContacts = contacts.length;

  const jobId = crypto.randomUUID();
  createJob({ jobId, userId: userEmail, total: totalContacts });
  markJobStatus(jobId, "queued", {
    stage: "queued",
    detail: "Waiting for rewrite to start.",
  });

  const origin = req.nextUrl.origin;
  const callbacks = {
    progress: `${origin}/api/email-jobs/${jobId}/progress`,
    done: `${origin}/api/email-jobs/${jobId}/done`,
  };

  const payload = {
    jobId,
    template,
    dataset,
    options,
    callbacks,
  };

  const webhookUrl = process.env.N8N_START_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    markJobStatus(jobId, "error", {
      detail: "Missing N8N webhook.",
      error: "N8N_START_WEBHOOK_URL not configured",
    });
    return NextResponse.json(
      { jobId, status: "error", error: "Missing N8N webhook." },
      { status: 500 }
    );
  }

  const secret = process.env.CALLBACK_HMAC_SECRET || process.env.APP_ENCRYPTION_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["X-Signature"] = computeHmac(payload, secret);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      markJobStatus(jobId, "error", {
        detail: "Failed to start rewrite job.",
        error: errorText || response.statusText,
      });
      return NextResponse.json(
        {
          jobId,
          status: "error",
          error: errorText || response.statusText || "Failed to start job",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach rewrite service";
    markJobStatus(jobId, "error", {
      detail: "Failed to reach rewrite service.",
      error: message,
    });
    return NextResponse.json(
      { jobId, status: "error", error: message },
      { status: 502 }
    );
  }

  updateProgress(jobId, { total: totalContacts }, "queued", "Rewrite job queued.");
  const job = getJob(jobId);
  return NextResponse.json(
    {
      jobId,
      status: job?.status ?? "queued",
      stage: job?.stage ?? "queued",
      detail: job?.detail ?? "Waiting for rewrite to start.",
    },
    { status: 202 }
  );
}
