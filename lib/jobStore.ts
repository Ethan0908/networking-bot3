export type EmailJobStatus = "queued" | "running" | "ready" | "error";

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export type DeliveryRecord = EmailMessage & {
  status: "pending" | "sent" | "failed";
  error?: string | null;
  sentAt?: number | null;
};

export type EmailJob = {
  jobId: string;
  userId: string;
  status: EmailJobStatus;
  createdAt: number;
  updatedAt: number;
  progress: {
    done: number;
    total: number;
  };
  stage?: string | null;
  detail?: string | null;
  previews: EmailMessage[];
  messages: DeliveryRecord[];
  lastError?: string | null;
  sendSummary: {
    sent: number;
    failed: number;
  };
};

const STORE_SYMBOL = Symbol.for("app.email.jobStore");

const globalStore = (globalThis as any)[STORE_SYMBOL] as
  | Map<string, EmailJob>
  | undefined;

const jobStore: Map<string, EmailJob> = globalStore ?? new Map();

if (!globalStore) {
  (globalThis as any)[STORE_SYMBOL] = jobStore;
}

function cloneJob(job: EmailJob): EmailJob {
  return {
    ...job,
    progress: { ...job.progress },
    previews: job.previews.map((item) => ({ ...item })),
    messages: job.messages.map((message) => ({ ...message })),
    sendSummary: { ...job.sendSummary },
  };
}

export function createJob(params: {
  jobId: string;
  userId: string;
  total: number;
}): EmailJob {
  const now = Date.now();
  const job: EmailJob = {
    jobId: params.jobId,
    userId: params.userId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    progress: { done: 0, total: Math.max(0, params.total) },
    previews: [],
    messages: [],
    sendSummary: { sent: 0, failed: 0 },
  };
  jobStore.set(job.jobId, job);
  return cloneJob(job);
}

export function getJob(jobId: string) {
  const job = jobStore.get(jobId);
  return job ? cloneJob(job) : null;
}

export function updateJob(
  jobId: string,
  updater: (job: EmailJob) => void
) {
  const current = jobStore.get(jobId);
  if (!current) return null;
  const draft = cloneJob(current);
  updater(draft);
  draft.updatedAt = Date.now();
  jobStore.set(jobId, draft);
  return cloneJob(draft);
}

export function appendPreviews(jobId: string, previews: EmailMessage[], limit = 5) {
  return updateJob(jobId, (job) => {
    const existing = job.previews.slice();
    for (const preview of previews) {
      if (!preview) continue;
      const to = preview.to ? String(preview.to).trim() : "";
      const subject = preview.subject ? String(preview.subject) : "";
      const body = preview.body ? String(preview.body) : "";
      if (!to && !subject && !body) {
        continue;
      }
      existing.push({ to, subject, body });
    }
    job.previews = existing.slice(-limit);
  });
}

export function setJobMessages(jobId: string, messages: EmailMessage[]) {
  return updateJob(jobId, (job) => {
    job.messages = messages.map((message) => ({
      to: message.to,
      subject: message.subject,
      body: message.body,
      status: "pending",
    }));
    job.sendSummary = { sent: 0, failed: 0 };
  });
}

export function markJobStatus(
  jobId: string,
  status: EmailJobStatus,
  detail?: { stage?: string | null; detail?: string | null; error?: string | null }
) {
  return updateJob(jobId, (job) => {
    job.status = status;
    if (detail) {
      job.stage = detail.stage ?? job.stage;
      job.detail = detail.detail ?? job.detail;
      job.lastError = detail.error ?? job.lastError;
      if (status === "error" && detail.error) {
        job.lastError = detail.error;
      }
    }
  });
}

export function updateProgress(
  jobId: string,
  progress: { done?: number; total?: number },
  stage?: string | null,
  detail?: string | null
) {
  return updateJob(jobId, (job) => {
    if (typeof progress.done === "number") {
      job.progress.done = Math.max(0, progress.done);
    }
    if (typeof progress.total === "number") {
      job.progress.total = Math.max(0, progress.total);
    }
    if (stage !== undefined) {
      job.stage = stage ?? null;
    }
    if (detail !== undefined) {
      job.detail = detail ?? null;
    }
  });
}

export function recordSendOutcome(
  jobId: string,
  index: number,
  outcome: { status: "sent" | "failed"; error?: string | null }
) {
  return updateJob(jobId, (job) => {
    const record = job.messages[index];
    if (!record) return;
    record.status = outcome.status;
    record.sentAt = Date.now();
    record.error = outcome.error ?? null;
    if (outcome.status === "sent") {
      job.sendSummary.sent += 1;
    } else {
      job.sendSummary.failed += 1;
    }
  });
}

export function resetSendProgress(jobId: string) {
  return updateJob(jobId, (job) => {
    job.messages = job.messages.map((message) => ({
      ...message,
      status: "pending",
      error: null,
      sentAt: null,
    }));
    job.sendSummary = { sent: 0, failed: 0 };
  });
}
