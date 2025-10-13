import { NextRequest, NextResponse } from "next/server";
import {
  appendPreviews,
  getJob,
  markJobStatus,
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

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  const increment = Number(body?.count ?? 0);
  const total = body?.total != null ? Number(body.total) : undefined;
  const stage = typeof body?.stage === "string" ? body.stage : undefined;
  const detail = typeof body?.detail === "string" ? body.detail : undefined;
  const done = Number.isFinite(increment) ? job.progress.done + increment : job.progress.done;
  updateProgress(
    jobId,
    {
      done,
      total: Number.isFinite(total) ? total : undefined,
    },
    stage,
    detail
  );

  if (Array.isArray(body?.previews)) {
    appendPreviews(jobId, body.previews);
  }

  markJobStatus(jobId, "running", { stage, detail });

  return NextResponse.json({ ok: true });
}
