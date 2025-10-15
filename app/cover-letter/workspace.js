"use client";

import { useCallback, useMemo, useState } from "react";
import "../rolodex/rolodex.css";
import "./cover-letter.css";

const TOAST_TIMEOUT = 4500;

function IconLoader(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`loader ${props.className ?? ""}`}
    >
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}

function IconAlert(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconInfo(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function IconDocument(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function IconDownload(props) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === "success" && <IconCheck />}
          {toast.type === "info" && <IconInfo />}
          {toast.type === "error" && <IconAlert />}
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  if (!bytes || typeof bytes !== "number") return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CoverLetterWorkspace({ variant = "standalone" }) {
  const [toasts, setToasts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [changingDraft, setChangingDraft] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [submissionId, setSubmissionId] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [statusWarnings, setStatusWarnings] = useState([]);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [jobUrl, setJobUrl] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("Professional");

  const [draftFormat, setDraftFormat] = useState("plain");
  const [draftContent, setDraftContent] = useState("");
  const [draftDetails, setDraftDetails] = useState(null);
  const [changeInstructions, setChangeInstructions] = useState("");
  const [changeMode, setChangeMode] = useState("apply");

  const [approvalResult, setApprovalResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const pushToast = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const callCoverLetter = useCallback(
    async (operation, payload = {}, includeSubmission = true) => {
      const context = {
        name: studentName,
        email: studentEmail,
        resumeText,
        resumeFile: resumeFile
          ? {
              name: resumeFile.name,
              type: resumeFile.type,
              size: resumeFile.size,
              base64: resumeFile.base64,
            }
          : null,
        jobUrl,
        role,
        tone,
        draftContent,
      };

      const requestBody = {
        action: "Cover Letter",
        operation,
        ...(includeSubmission && submissionId ? { submissionId } : {}),
        context,
        ...payload,
      };

      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error("Unable to parse response from the Cover Letter webhook.");
      }

      if (!response.ok) {
        const message =
          (data && typeof data === "object" && data.error) ||
          (data && typeof data === "object" && data.detail) ||
          `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (data && typeof data === "object" && "data" in data) {
        return data.data;
      }

      return data;
    },
    [
      submissionId,
      studentName,
      studentEmail,
      resumeText,
      resumeFile,
      jobUrl,
      role,
      tone,
      draftContent,
    ]
  );

  const handleResumeFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeFile(null);
      return;
    }
    try {
      const [base64, text] = await Promise.all([
        readFileAsBase64(file),
        file.text().catch(() => ""),
      ]);
      setResumeFile({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
      });
      if (!resumeText) {
        setResumeText(text);
      }
    } catch (error) {
      console.error("Unable to read resume file", error);
      setResumeFile(null);
      pushToast("error", "We couldn't read that resume file. Try another format.");
    }
  };

  const resetSubmissionState = () => {
    setSubmissionStatus(null);
    setStatusWarnings([]);
    setDraftContent("");
    setDraftDetails(null);
    setChangeInstructions("");
    setChangeMode("apply");
    setApprovalResult(null);
    setExportResult(null);
  };

  const handleCreateSubmission = async () => {
    setCreating(true);
    try {
      const payload = {
        submission: {
          name: studentName,
          email: studentEmail,
          resumeText,
          resumeFile: resumeFile
            ? {
                name: resumeFile.name,
                type: resumeFile.type,
                size: resumeFile.size,
                base64: resumeFile.base64,
              }
            : null,
          jobUrl,
          role,
          tone,
        },
      };
      const data = await callCoverLetter("receiveSubmission", payload, false);
      const nextId =
        data?.submissionId ??
        data?.submission_id ??
        data?.id ??
        data?.submission?.id ??
        "";
      if (nextId) {
        setSubmissionId(String(nextId));
        resetSubmissionState();
        pushToast("success", "Submission created. We'll track it for you.");
        if (Array.isArray(data?.warnings)) {
          setStatusWarnings(data.warnings);
        }
        if (data?.status || data?.state) {
          setSubmissionStatus(data.status ?? data.state);
        }
      } else {
        pushToast("info", "Submission created, but we didn't receive an identifier.");
      }
    } catch (error) {
      console.error("Failed to create submission", error);
      pushToast("error", error.message || "Unable to create submission.");
    } finally {
      setCreating(false);
    }
  };

  const handleGetDraft = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setLoadingDraft(true);
    try {
      const data = await callCoverLetter("getDraft", { format: draftFormat });
      const draft = data?.draft ?? data;
      const text =
        draft?.text ??
        draft?.content ??
        draft?.body ??
        (typeof draft === "string" ? draft : "");
      setDraftContent(text || "");
      setDraftDetails({
        format: draft?.format ?? draftFormat,
        wordCount:
          draft?.wordCount ??
          draft?.word_count ??
          (typeof draft?.wordCount === "number" ? draft.wordCount : null),
        matchScore: draft?.matchScore ?? draft?.score ?? data?.matchScore ?? null,
        warnings: Array.isArray(data?.warnings)
          ? data.warnings
          : Array.isArray(draft?.warnings)
          ? draft.warnings
          : [],
      });
      pushToast("success", "Draft loaded. Feel free to edit below.");
    } catch (error) {
      console.error("Failed to load draft", error);
      pushToast("error", error.message || "Unable to load draft.");
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    if (!changeInstructions.trim() && changeMode === "regenerate") {
      pushToast("info", "Tell us what to change before requesting a new draft.");
      return;
    }
    setChangingDraft(true);
    try {
      const operation = changeMode === "regenerate" ? "regenerateDraft" : "applyEdits";
      const data = await callCoverLetter(operation, {
        instructions: changeInstructions,
        currentDraft: draftContent,
        format: draftFormat,
      });
      const draft = data?.draft ?? data;
      const text =
        draft?.text ??
        draft?.content ??
        draft?.body ??
        (typeof draft === "string" ? draft : "");
      setDraftContent(text || "");
      setDraftDetails((prev) => ({
        format: draft?.format ?? draftFormat,
        wordCount:
          draft?.wordCount ??
          draft?.word_count ??
          prev?.wordCount ?? null,
        matchScore: draft?.matchScore ?? draft?.score ?? prev?.matchScore ?? null,
        warnings: Array.isArray(data?.warnings)
          ? data.warnings
          : Array.isArray(draft?.warnings)
          ? draft.warnings
          : prev?.warnings ?? [],
      }));
      pushToast("success", "Draft updated with your changes.");
    } catch (error) {
      console.error("Failed to request changes", error);
      pushToast("error", error.message || "Unable to update draft.");
    } finally {
      setChangingDraft(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setApproving(true);
    try {
      const data = await callCoverLetter("requestApproval");
      setApprovalResult(data);
      pushToast("success", "Draft approved and stored.");
    } catch (error) {
      console.error("Failed to approve draft", error);
      pushToast("error", error.message || "Unable to approve draft.");
    } finally {
      setApproving(false);
    }
  };

  const handleExportDraft = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setExporting(true);
    try {
      const data = await callCoverLetter("exportFile", { format: draftFormat });
      setExportResult(data);
      pushToast("success", "Export ready. Use the link below to download.");
    } catch (error) {
      console.error("Failed to export draft", error);
      pushToast("error", error.message || "Unable to export draft.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setDeleting(true);
    try {
      await callCoverLetter("deleteData");
      setSubmissionId("");
      resetSubmissionState();
      pushToast("success", "Submission data deleted.");
    } catch (error) {
      console.error("Failed to delete submission data", error);
      pushToast("error", error.message || "Unable to delete submission data.");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (!submissionStatus) return "Waiting";
    if (typeof submissionStatus === "string") {
      return submissionStatus.replace(/_/g, " ");
    }
    if (submissionStatus?.label) return submissionStatus.label;
    if (submissionStatus?.status) return submissionStatus.status;
    if (submissionStatus?.state) return submissionStatus.state;
    return "Waiting";
  }, [submissionStatus]);

  const draftWordCount = draftDetails?.wordCount;
  const draftWarnings = draftDetails?.warnings ?? [];
  const matchScore = draftDetails?.matchScore;

  return (
    <div
      className={`rolodex-page cover-letter-page${
        variant === "embedded" ? " cover-letter-embedded" : ""
      }`}
    >
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <section className="rolodex-card cover-letter-card" aria-labelledby="cover-letter-heading">
        {variant === "standalone" && (
          <header className="rolodex-header">
            <div className="rolodex-heading">
              <h1 id="cover-letter-heading">Cover letters</h1>
              <p>Send the “Cover Letter” webhook to draft, revise, and export letters.</p>
            </div>
            <div className="header-actions">
              <a className="header-link" href="/">Back to contacts</a>
            </div>
          </header>
        )}

        {variant === "embedded" && (
          <div className="cover-letter-embedded-heading">
            <h2 id="cover-letter-heading">Cover letter</h2>
            <p>Draft letters for applications without leaving this workspace.</p>
          </div>
        )}

        <div className="cover-letter-layout">
          <section
            className="cover-letter-section details"
            aria-labelledby="cover-letter-details-heading"
          >
            <div className="section-heading">
              <h3 id="cover-letter-details-heading">Student details</h3>
              <p>Share who you are and link the job application before drafting.</p>
            </div>

            <div className="cover-letter-info-grid">
              <label>
                <span>Name</span>
                <input
                  className="text-input"
                  type="text"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  placeholder="Alex Student"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  className="text-input"
                  type="email"
                  value={studentEmail}
                  onChange={(event) => setStudentEmail(event.target.value)}
                  placeholder="alex@example.com"
                />
              </label>
              <label>
                <span>Job application link</span>
                <input
                  className="text-input"
                  type="url"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://company.com/careers/role"
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  className="text-input"
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Product Design Intern"
                />
              </label>
              <label>
                <span>Tone</span>
                <input
                  className="text-input"
                  type="text"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="Professional, confident"
                />
              </label>
            </div>

            <label className="cover-letter-textarea">
              <span>Résumé highlights</span>
              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste your résumé summary here..."
                rows={6}
              />
            </label>

            <label className="cover-letter-file">
              <span>Upload résumé file (optional)</span>
              <input type="file" onChange={handleResumeFileChange} />
              {resumeFile && (
                <p className="cover-letter-file-detail">
                  <IconDocument /> {resumeFile.name} {formatSize(resumeFile.size)}
                </p>
              )}
            </label>

            <div className="cover-letter-actions">
              <button
                type="button"
                className="button"
                onClick={handleCreateSubmission}
                disabled={creating}
                aria-busy={creating}
              >
                {creating ? <IconLoader /> : null}
                {creating ? "Creating…" : "Draft with AI"}
              </button>
            </div>

            <dl className="cover-letter-meta">
              <div>
                <dt>Submission ID</dt>
                <dd>{submissionId ? <code>{submissionId}</code> : "—"}</dd>
              </div>
              <div>
                <dt>Current status</dt>
                <dd className="status-chip">{statusLabel}</dd>
              </div>
            </dl>

            {statusWarnings.length > 0 && (
              <ul className="cover-letter-warning-list">
                {statusWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="cover-letter-section draft"
            aria-labelledby="cover-letter-draft-heading"
          >
            <div className="section-heading">
              <h3 id="cover-letter-draft-heading">Draft workspace</h3>
              <p>Load the generated draft, edit it directly, and request updates.</p>
            </div>

            <div className="draft-toolbar">
              <label>
                <span>Format</span>
                <select
                  value={draftFormat}
                  onChange={(event) => setDraftFormat(event.target.value)}
                >
                  <option value="plain">Plain text</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                </select>
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={handleGetDraft}
                disabled={!submissionId || loadingDraft}
                aria-busy={loadingDraft}
              >
                {loadingDraft ? <IconLoader /> : null}
                {loadingDraft ? "Loading…" : "Load latest draft"}
              </button>
              <button
                type="button"
                className="button tertiary"
                onClick={handleExportDraft}
                disabled={!submissionId || exporting}
                aria-busy={exporting}
              >
                {exporting ? <IconLoader /> : <IconDownload />}
                {exporting ? "Exporting…" : "Export draft"}
              </button>
              <button
                type="button"
                className="button tertiary"
                onClick={handleApproveDraft}
                disabled={!submissionId || approving}
                aria-busy={approving}
              >
                {approving ? <IconLoader /> : <IconCheck />}
                {approving ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                className="button tertiary"
                onClick={handleDeleteData}
                disabled={!submissionId || deleting}
                aria-busy={deleting}
              >
                {deleting ? <IconLoader /> : null}
                {deleting ? "Deleting…" : "Delete data"}
              </button>
            </div>

            <label className="cover-letter-draft-editor">
              <span>Editable draft</span>
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder="Your cover letter draft will appear here."
                rows={14}
              />
            </label>

            <div className="draft-meta">
              <div>
                <span className="meta-label">Word count</span>
                <strong>{draftWordCount ?? "—"}</strong>
              </div>
              <div>
                <span className="meta-label">Match score</span>
                <strong>{typeof matchScore === "number" ? `${Math.round(matchScore * 100) / 100}` : "—"}</strong>
              </div>
            </div>

            {draftWarnings.length > 0 && (
              <ul className="cover-letter-warning-list">
                {draftWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            )}

            <div className="change-request">
              <label>
                <span>Request changes</span>
                <textarea
                  value={changeInstructions}
                  onChange={(event) => setChangeInstructions(event.target.value)}
                  placeholder="Tell us how to tweak the draft..."
                  rows={4}
                />
              </label>
              <div className="change-controls">
                <div className="change-mode">
                  <label>
                    <input
                      type="radio"
                      name="cover-letter-change-mode"
                      value="apply"
                      checked={changeMode === "apply"}
                      onChange={() => setChangeMode("apply")}
                    />
                    Apply edits
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="cover-letter-change-mode"
                      value="regenerate"
                      checked={changeMode === "regenerate"}
                      onChange={() => setChangeMode("regenerate")}
                    />
                    Regenerate draft
                  </label>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={handleRequestChanges}
                  disabled={!submissionId || changingDraft}
                  aria-busy={changingDraft}
                >
                  {changingDraft ? <IconLoader /> : null}
                  {changingDraft ? "Updating…" : "Send to webhook"}
                </button>
              </div>
            </div>

            {approvalResult && (
              <div className="cover-letter-result">
                <h4>Approval</h4>
                <pre>{JSON.stringify(approvalResult, null, 2)}</pre>
              </div>
            )}

            {exportResult && (
              <div className="cover-letter-result">
                <h4>Export link</h4>
                {exportResult?.url ? (
                  <a href={exportResult.url} target="_blank" rel="noreferrer">
                    Download exported draft
                  </a>
                ) : (
                  <pre>{JSON.stringify(exportResult, null, 2)}</pre>
                )}
              </div>
            )}

          </section>
        </div>
      </section>
    </div>
  );
}

