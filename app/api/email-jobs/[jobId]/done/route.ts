import { NextRequest, NextResponse } from "next/server";
import {
  markJobStatus,
  setJobMessages,
  updateProgress,
} from "../../../../../lib/jobStore";
import { verifyHmacSignature } from "../../../../../lib/hmac";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: { jobId: string } }
) {
  const jobId = context.params?.jobId;
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  const secret = process.env.CALLBACK_HMAC_SECRET || process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    return NextResponse.json({ error: "HMAC secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-signature");
  const rawPayload = await req.text();
  if (!verifyHmacSignature(signature, rawPayload, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = rawPayload ? JSON.parse(rawPayload) : {};
  } catch {
    body = {};
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const total = body?.total != null ? Number(body.total) : undefined;

  if (messages.length > 0) {
    setJobMessages(jobId, messages);
  }

  updateProgress(
    jobId,
    {
      done: total ?? messages.length,
      total: total ?? messages.length,
    },
    typeof body?.stage === "string" ? body.stage : "done",
    typeof body?.detail === "string" ? body.detail : "Drafts ready"
  );

  markJobStatus(jobId, "ready", {
    stage: typeof body?.stage === "string" ? body.stage : "done",
    detail: typeof body?.detail === "string" ? body.detail : "Drafts generated.",
  });

  return NextResponse.json({ ok: true });
}
