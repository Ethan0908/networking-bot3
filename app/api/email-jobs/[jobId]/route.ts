import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getJob } from "../../../../lib/jobStore";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
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

  const { done, total } = job.progress;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  const response: Record<string, unknown> = {
    jobId: job.jobId,
    status: job.status,
    stage: job.stage ?? null,
    detail: job.detail ?? null,
    progress: { done, total, percent },
    previews: job.previews,
    messagesAvailable: job.messages.length > 0,
    sendSummary: job.sendSummary,
    error: job.lastError ?? null,
  };

  if (job.status === "ready") {
    response.messages = job.messages;
  }

  return NextResponse.json(response);
}
