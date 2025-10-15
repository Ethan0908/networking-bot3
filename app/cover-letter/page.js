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

function formatDate(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch (error) {
    console.warn("Unable to format date", error);
    return String(value);
  }
}

function formatSize(bytes) {
  if (!bytes || typeof bytes !== "number") return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CoverLetterPage() {
  const [toasts, setToasts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [changingDraft, setChangingDraft] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSimilarity, setLoadingSimilarity] = useState(false);

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
  const [profileForm, setProfileForm] = useState({
    programme: "",
    graduationDate: "",
    skills: "",
    achievements: "",
    tone: "",
  });
  const [profileId, setProfileId] = useState("");
  const [history, setHistory] = useState([]);
  const [similarity, setSimilarity] = useState(null);

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
      const requestBody = {
        action: "Cover Letter",
        operation,
        ...(includeSubmission && submissionId ? { submissionId } : {}),
        ...payload,
      };

      const response = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error("Unable to parse response from automation service.");
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
    [submissionId]
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
    setSimilarity(null);
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
        pushToast(
          "info",
          "Submission created, but we didn't receive an identifier."
        );
      }
    } catch (error) {
      console.error("Failed to create submission", error);
      pushToast("error", error.message || "Unable to create submission.");
    } finally {
      setCreating(false);
    }
  };

  const handlePollStatus = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setPolling(true);
    try {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const data = await callCoverLetter("pollStatus");
        const status =
          data?.status ??
          data?.state ??
          (typeof data === "string" ? data : null) ??
          data;
        setSubmissionStatus(status);
        if (Array.isArray(data?.warnings)) {
          setStatusWarnings(data.warnings);
        }
        const normalized =
          (typeof status === "string" && status.toLowerCase()) ||
          (typeof status === "object" &&
            (status.state || status.status || "").toLowerCase());
        if (normalized && ["ready", "error"].includes(normalized)) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    } catch (error) {
      console.error("Failed to poll status", error);
      pushToast("error", error.message || "Unable to poll submission status.");
    } finally {
      setPolling(false);
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
      pushToast(
        "info",
        "Tell us what to change before requesting a new draft."
      );
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
      pushToast("success", "Export ready. Use the link below.");
    } catch (error) {
      console.error("Failed to export draft", error);
      pushToast("error", error.message || "Unable to export draft.");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const data = await callCoverLetter("saveProfile", {
        profile: {
          ...profileForm,
          skills: profileForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
          achievements: profileForm.achievements
            .split("\n")
            .map((achievement) => achievement.trim())
            .filter(Boolean),
        },
      });
      const id = data?.profileId ?? data?.id ?? data;
      if (id) {
        setProfileId(String(id));
        pushToast("success", "Profile saved for future submissions.");
      } else {
        pushToast("info", "Profile saved.");
      }
    } catch (error) {
      console.error("Failed to save profile", error);
      pushToast("error", error.message || "Unable to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteData = async () => {
    if (!submissionId) {
      pushToast("info", "Select a submission before deleting data.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this submission?")) {
      return;
    }
    setDeleting(true);
    try {
      await callCoverLetter("deleteData");
      pushToast("success", "Submission data deleted.");
      setSubmissionId("");
      resetSubmissionState();
    } catch (error) {
      console.error("Failed to delete data", error);
      pushToast("error", error.message || "Unable to delete data.");
    } finally {
      setDeleting(false);
    }
  };

  const handleListSubmissions = async () => {
    setLoadingHistory(true);
    try {
      const data = await callCoverLetter("listSubmissions", {}, false);
      const rows = Array.isArray(data?.submissions)
        ? data.submissions
        : Array.isArray(data)
        ? data
        : [];
      setHistory(rows);
      if (rows.length === 0) {
        pushToast("info", "No recent submissions yet.");
      }
    } catch (error) {
      console.error("Failed to list submissions", error);
      pushToast("error", error.message || "Unable to fetch submission history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePreviewSimilarity = async () => {
    if (!submissionId) {
      pushToast("info", "Create a submission first.");
      return;
    }
    setLoadingSimilarity(true);
    try {
      const data = await callCoverLetter("matchRequirements");
      setSimilarity(data);
      pushToast("success", "Similarity preview updated.");
    } catch (error) {
      console.error("Failed to load similarity preview", error);
      pushToast("error", error.message || "Unable to preview similarity.");
    } finally {
      setLoadingSimilarity(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (!submissionStatus) return "Waiting";
    if (typeof submissionStatus === "string") return submissionStatus;
    if (typeof submissionStatus === "object") {
      return (
        submissionStatus.status ||
        submissionStatus.state ||
        submissionStatus.label ||
        "Waiting"
      );
    }
    return "Waiting";
  }, [submissionStatus]);

  const draftWordCount = draftDetails?.wordCount;
  const draftWarnings = draftDetails?.warnings ?? [];
  const matchScore = draftDetails?.matchScore;

  return (
    <div className="rolodex-page cover-letter-page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <section className="rolodex-card cover-letter-card" aria-labelledby="cover-letter-heading">
        <header className="rolodex-header cover-letter-header">
          <div className="rolodex-heading">
            <h1 id="cover-letter-heading">Cover Letter Builder</h1>
            <p>Send a “Cover Letter” webhook to draft, revise, and export your letters.</p>
          </div>
          <div className="header-actions">
            <a className="header-link" href="/rolodex">
              View contacts
            </a>
          </div>
        </header>

        <div className="cover-letter-sections">
          <section className="cover-letter-group" aria-labelledby="cover-letter-submission">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-submission">1. Create submission</h2>
              <p>Share the job details and résumé to start a new draft.</p>
            </div>
            <div className="cover-letter-form-grid">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  placeholder="Alex Student"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(event) => setStudentEmail(event.target.value)}
                  placeholder="alex@example.com"
                />
              </label>
              <label>
                <span>Job URL</span>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://company.com/jobs/123"
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Software Engineer Intern"
                />
              </label>
              <label>
                <span>Tone</span>
                <input
                  type="text"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="Professional, confident"
                />
              </label>
            </div>
            <label className="cover-letter-textarea">
              <span>Résumé text</span>
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
                className="primary"
                onClick={handleCreateSubmission}
                disabled={creating}
                aria-busy={creating}
              >
                {creating ? <IconLoader /> : "Create submission"}
              </button>
              {submissionId && (
                <div className="cover-letter-submission-meta">
                  <span className="meta-label">Submission ID</span>
                  <code>{submissionId}</code>
                </div>
              )}
            </div>
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-status">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-status">2. Track status</h2>
              <p>Check whether the automation finished drafting.</p>
            </div>
            <div className="cover-letter-actions">
              <button
                type="button"
                onClick={handlePollStatus}
                disabled={!submissionId || polling}
                aria-busy={polling}
              >
                {polling ? <IconLoader /> : "Poll status"}
              </button>
              <div className="cover-letter-status-chip" aria-live="polite">
                <span className="meta-label">Current state</span>
                <strong>{statusLabel}</strong>
              </div>
            </div>
            {statusWarnings.length > 0 && (
              <ul className="cover-letter-warning-list">
                {statusWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-draft">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-draft">3. Review draft</h2>
              <p>Load the latest version, edit directly, and keep notes.</p>
            </div>
            <div className="cover-letter-row">
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
                onClick={handleGetDraft}
                disabled={!submissionId || loadingDraft}
                aria-busy={loadingDraft}
              >
                {loadingDraft ? <IconLoader /> : "Get draft"}
              </button>
            </div>
            <label className="cover-letter-textarea">
              <span>Draft preview</span>
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder="Draft content will appear here once ready."
                rows={10}
              />
            </label>
            <div className="cover-letter-draft-meta">
              <div>
                <span className="meta-label">Word count</span>
                <strong>{typeof draftWordCount === "number" ? draftWordCount : "—"}</strong>
              </div>
              <div>
                <span className="meta-label">Match score</span>
                <strong>{matchScore != null ? matchScore : "—"}</strong>
              </div>
            </div>
            {draftWarnings.length > 0 && (
              <ul className="cover-letter-warning-list">
                {draftWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            )}
            <div className="cover-letter-row cover-letter-request-changes">
              <label className="cover-letter-textarea">
                <span>Change requests</span>
                <textarea
                  value={changeInstructions}
                  onChange={(event) => setChangeInstructions(event.target.value)}
                  placeholder="Ask for tone adjustments, highlight different projects, or request a fresh draft."
                  rows={4}
                />
              </label>
              <div className="cover-letter-change-controls">
                <fieldset>
                  <legend>Update style</legend>
                  <label>
                    <input
                      type="radio"
                      name="change-mode"
                      value="apply"
                      checked={changeMode === "apply"}
                      onChange={() => setChangeMode("apply")}
                    />
                    Small tweaks
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="change-mode"
                      value="regenerate"
                      checked={changeMode === "regenerate"}
                      onChange={() => setChangeMode("regenerate")}
                    />
                    Regenerate draft
                  </label>
                </fieldset>
                <button
                  type="button"
                  onClick={handleRequestChanges}
                  disabled={!submissionId || changingDraft}
                  aria-busy={changingDraft}
                >
                  {changingDraft ? <IconLoader /> : "Apply changes"}
                </button>
              </div>
            </div>
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-approval">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-approval">4. Approve & export</h2>
              <p>Finalise the draft and download a copy.</p>
            </div>
            <div className="cover-letter-actions">
              <button
                type="button"
                onClick={handleApproveDraft}
                disabled={!submissionId || approving}
                aria-busy={approving}
              >
                {approving ? <IconLoader /> : "Approve draft"}
              </button>
              <button
                type="button"
                onClick={handleExportDraft}
                disabled={!submissionId || exporting}
                aria-busy={exporting}
              >
                {exporting ? <IconLoader /> : "Export draft"}
              </button>
            </div>
            {approvalResult && (
              <div className="cover-letter-result">
                <span className="meta-label">Approval record</span>
                <code>{JSON.stringify(approvalResult)}</code>
              </div>
            )}
            {exportResult && (
              <div className="cover-letter-result">
                <span className="meta-label">Export file</span>
                {exportResult?.downloadUrl || exportResult?.url ? (
                  <a
                    href={exportResult.downloadUrl ?? exportResult.url}
                    className="cover-letter-download"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconDownload /> Download file
                  </a>
                ) : (
                  <code>{JSON.stringify(exportResult)}</code>
                )}
              </div>
            )}
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-profile">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-profile">5. Save profile (optional)</h2>
              <p>Store reusable details for future submissions.</p>
            </div>
            <div className="cover-letter-form-grid">
              <label>
                <span>Programme</span>
                <input
                  type="text"
                  value={profileForm.programme}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, programme: event.target.value }))
                  }
                  placeholder="BSc Computer Science"
                />
              </label>
              <label>
                <span>Graduation date</span>
                <input
                  type="text"
                  value={profileForm.graduationDate}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      graduationDate: event.target.value,
                    }))
                  }
                  placeholder="June 2026"
                />
              </label>
              <label>
                <span>Default tone</span>
                <input
                  type="text"
                  value={profileForm.tone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, tone: event.target.value }))
                  }
                  placeholder="Warm, excited"
                />
              </label>
            </div>
            <label className="cover-letter-textarea">
              <span>Skills (comma separated)</span>
              <textarea
                value={profileForm.skills}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, skills: event.target.value }))
                }
                rows={3}
              />
            </label>
            <label className="cover-letter-textarea">
              <span>Achievements (one per line)</span>
              <textarea
                value={profileForm.achievements}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    achievements: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
            <div className="cover-letter-actions">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                aria-busy={savingProfile}
              >
                {savingProfile ? <IconLoader /> : "Save profile"}
              </button>
              {profileId && (
                <div className="cover-letter-submission-meta">
                  <span className="meta-label">Profile ID</span>
                  <code>{profileId}</code>
                </div>
              )}
            </div>
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-history">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-history">6. Submission history</h2>
              <p>Review past cover letters and their current states.</p>
            </div>
            <div className="cover-letter-actions">
              <button
                type="button"
                onClick={handleListSubmissions}
                disabled={loadingHistory}
                aria-busy={loadingHistory}
              >
                {loadingHistory ? <IconLoader /> : "List submissions"}
              </button>
            </div>
            {history.length > 0 ? (
              <div className="cover-letter-table-wrap">
                <table className="view-table">
                  <caption className="view-table-caption">Recent submissions</caption>
                  <thead>
                    <tr>
                      <th scope="col">Role</th>
                      <th scope="col">Company</th>
                      <th scope="col">Created</th>
                      <th scope="col">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, index) => (
                      <tr key={`history-${index}`}>
                        <td>{row.role ?? row.title ?? "—"}</td>
                        <td>{row.company ?? row.organisation ?? "—"}</td>
                        <td>{formatDate(row.createdAt ?? row.created_at ?? row.created)}</td>
                        <td>{row.state ?? row.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cover-letter-empty">No submissions loaded yet.</p>
            )}
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-similarity">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-similarity">7. Similarity preview</h2>
              <p>See what the automation thinks about ATS alignment.</p>
            </div>
            <div className="cover-letter-actions">
              <button
                type="button"
                onClick={handlePreviewSimilarity}
                disabled={!submissionId || loadingSimilarity}
                aria-busy={loadingSimilarity}
              >
                {loadingSimilarity ? <IconLoader /> : "Preview similarity"}
              </button>
            </div>
            {similarity && (
              <div className="cover-letter-similarity">
                {typeof similarity.matchScore === "number" && (
                  <p>
                    <span className="meta-label">Match score</span> {similarity.matchScore}
                  </p>
                )}
                {Array.isArray(similarity.matches) && similarity.matches.length > 0 && (
                  <div>
                    <h3>Highlights</h3>
                    <ul>
                      {similarity.matches.map((item, index) => (
                        <li key={`match-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(similarity.gaps) && similarity.gaps.length > 0 && (
                  <div>
                    <h3>Gaps</h3>
                    <ul>
                      {similarity.gaps.map((item, index) => (
                        <li key={`gap-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="cover-letter-group" aria-labelledby="cover-letter-delete">
            <div className="cover-letter-group-heading">
              <h2 id="cover-letter-delete">8. Delete submission</h2>
              <p>Remove the automation data when you're done. This cannot be undone.</p>
            </div>
            <button
              type="button"
              className="danger"
              onClick={handleDeleteData}
              disabled={!submissionId || deleting}
              aria-busy={deleting}
            >
              {deleting ? <IconLoader /> : "Delete my data"}
            </button>
          </section>
        </div>

        <footer className="rolodex-legal" aria-label="Legal">
          <a className="rolodex-legal-link" href="/privacy">
            Privacy Policy
          </a>
          <span aria-hidden="true" className="rolodex-legal-divider">
            •
          </span>
          <a className="rolodex-legal-link" href="/terms">
            Terms of Service
          </a>
        </footer>
      </section>
    </div>
  );
}
