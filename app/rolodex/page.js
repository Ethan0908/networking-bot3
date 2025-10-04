"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import "./rolodex.css";

const TOAST_TIMEOUT = 4500;
const EMAIL_REGEX = /.+@.+\..+/;
const PROFILE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

const tabs = [
  { id: "create", label: "Create" },
  { id: "update", label: "Update" },
  { id: "view", label: "View" },
  { id: "email", label: "Email" },
];

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

function IconMail(props) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
      <polyline points="3 7 12 13 21 7" />
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

function IconCopy(props) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function formatSummary(record) {
  if (!record || typeof record !== "object") {
    return "Contact loaded.";
  }
  const parts = [];
  if (record.last_contacted) {
    parts.push(`Last contacted: ${record.last_contacted}`);
  }
  if (record.notes_updated_at) {
    parts.push(`Notes updated ${formatRelativeTime(record.notes_updated_at)}`);
  }
  if (record.updated_at && !record.notes_updated_at) {
    parts.push(`Updated ${formatRelativeTime(record.updated_at)}`);
  }
  if (record.status) {
    parts.push(`Status: ${record.status}`);
  }
  if (parts.length === 0) {
    parts.push("Contact loaded.");
  }
  return parts.join(" • ");
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) <= 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(diffHours) <= 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      if (diffMinutes === 0) return "just now";
      return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) === 1 ? "" : "s"} ${diffMinutes > 0 ? "ago" : "from now"}`;
    }
    return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? "" : "s"} ${diffHours > 0 ? "ago" : "from now"}`;
  }
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ${diffDays > 0 ? "ago" : "from now"}`;
}

function normalizeProfileUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function ResultTable({ data }) {
  const rows = useMemo(() => {
    if (!data) return [];
    const records = Array.isArray(data) ? data : [data];
    return records.filter((record) => record && typeof record === "object");
  }, [data]);

  if (!rows.length) {
    return null;
  }

  const columns = [
    { key: "local_id", label: "Local ID" },
    { key: "full_name", label: "Full Name" },
    { key: "title", label: "Title" },
    { key: "company", label: "Company" },
    { key: "location", label: "Location" },
    { key: "profile_url", label: "Profile URL" },
    { key: "email", label: "Email" },
    { key: "last_updated", label: "Last Updated" },
  ];

  return (
    <div className="result-table-wrapper" role="region" aria-live="polite">
      <table className="result-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => {
                const value = row[column.key];
                const hasValue = value !== undefined && value !== null && value !== "";
                return (
                  <td key={column.key}>
                    {hasValue ? (
                      column.key === "profile_url" ? (
                        <a
                          href={normalizeProfileUrl(String(value))}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {value}
                        </a>
                      ) : (
                        String(value)
                      )
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Rolodex() {
  const [form, setForm] = useState({
    username: "",
    contactId: "",
    fullName: "",
    title: "",
    company: "",
    location: "",
    email: "",
    profileUrl: "",
    subject: "",
    message: "",
  });
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [inlineSummary, setInlineSummary] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [toasts, setToasts] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ email: "", profileUrl: "" });
  const [fieldStatus, setFieldStatus] = useState({ email: null, profileUrl: null });
  const [fieldTouched, setFieldTouched] = useState({ email: false, profileUrl: false });
  const [highlight, setHighlight] = useState({ username: false, contactId: false });
  const validationTimers = useRef({});
  const formRef = useRef(null);
  const { status: sessionStatus } = useSession();
  const [gmailConnecting, setGmailConnecting] = useState(false);

  const gmailState = sessionStatus === "authenticated" ? "connected" : gmailConnecting ? "connecting" : "disconnected";
  const gmailLabel = gmailState === "connected" ? "Connected" : gmailState === "connecting" ? "Connecting…" : "Connect Gmail";

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

  const runValidation = useCallback((field, value) => {
    const trimmed = value.trim();
    if (field === "email") {
      if (!trimmed) {
        setFieldErrors((prev) => ({ ...prev, email: "" }));
        setFieldStatus((prev) => ({ ...prev, email: null }));
        return { status: null, message: "" };
      }
      if (!EMAIL_REGEX.test(trimmed)) {
        const message = "Please enter a valid email.";
        setFieldErrors((prev) => ({ ...prev, email: message }));
        setFieldStatus((prev) => ({ ...prev, email: "error" }));
        return { status: "error", message };
      }
      setFieldErrors((prev) => ({ ...prev, email: "" }));
      setFieldStatus((prev) => ({ ...prev, email: "success" }));
      return { status: "success", message: "" };
    }

    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, profileUrl: "" }));
      setFieldStatus((prev) => ({ ...prev, profileUrl: null }));
      return { status: null, message: "" };
    }
    if (!PROFILE_REGEX.test(trimmed)) {
      const message = "Please enter a valid profile link.";
      setFieldErrors((prev) => ({ ...prev, profileUrl: message }));
      setFieldStatus((prev) => ({ ...prev, profileUrl: "error" }));
      return { status: "error", message };
    }
    setFieldErrors((prev) => ({ ...prev, profileUrl: "" }));
    setFieldStatus((prev) => ({ ...prev, profileUrl: "success" }));
    return { status: "success", message: "" };
  }, []);

  useEffect(() => {
    if (!fieldTouched.email) return;
    validationTimers.current.email && clearTimeout(validationTimers.current.email);
    validationTimers.current.email = setTimeout(() => {
      runValidation("email", form.email);
    }, 150);
    return () => {
      validationTimers.current.email && clearTimeout(validationTimers.current.email);
    };
  }, [form.email, fieldTouched.email, runValidation]);

  useEffect(() => {
    if (!fieldTouched.profileUrl) return;
    validationTimers.current.profileUrl && clearTimeout(validationTimers.current.profileUrl);
    validationTimers.current.profileUrl = setTimeout(() => {
      runValidation("profileUrl", form.profileUrl);
    }, 150);
    return () => {
      validationTimers.current.profileUrl && clearTimeout(validationTimers.current.profileUrl);
    };
  }, [form.profileUrl, fieldTouched.profileUrl, runValidation]);

  useEffect(() => {
    if (gmailState !== "connecting") {
      setGmailConnecting(false);
    }
  }, [gmailState]);

  useEffect(() => {
    if (highlight.username && form.username.trim()) {
      setHighlight((prev) => ({ ...prev, username: false }));
    }
  }, [highlight.username, form.username]);

  useEffect(() => {
    if (highlight.contactId && form.contactId.trim()) {
      setHighlight((prev) => ({ ...prev, contactId: false }));
    }
  }, [highlight.contactId, form.contactId]);

  const handleBlur = useCallback(
    (field, value) => {
      setFieldTouched((prev) => ({ ...prev, [field]: true }));
      runValidation(field, value);
    },
    [runValidation]
  );

  const handleFieldChange = useCallback((field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGmailClick = useCallback(() => {
    if (gmailState === "connected" || gmailConnecting) {
      return;
    }
    setGmailConnecting(true);
    signIn("google", { callbackUrl: "/" }).catch(() => {
      setGmailConnecting(false);
      pushToast("error", "Unable to start Google sign-in.");
    });
  }, [gmailConnecting, gmailState, pushToast]);

  const handleSubjectKeyDown = useCallback((event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
    }
  }, []);

  const handleEmailKeyDown = handleSubjectKeyDown;

  const handleMessageKeyDown = useCallback(
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (activeTab === "email") {
          formRef.current?.requestSubmit();
        }
      }
    },
    [activeTab]
  );

  const handleCopyContactId = useCallback(() => {
    const value = form.contactId.trim();
    if (!value) return;
    if (!navigator.clipboard?.writeText) {
      pushToast("info", "Contact ID copied.");
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => pushToast("info", "Contact ID copied."))
      .catch(() => pushToast("error", "Unable to copy contact ID."));
  }, [form.contactId, pushToast]);

  const resetResponses = useCallback(() => {
    setResponse(null);
    setInlineSummary("");
    setErrorMessage("");
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const action = activeTab;
      if (loading) return;

      setLoading(true);
      resetResponses();
      setHighlight({ username: false, contactId: false });

      const trimmedUsername = form.username.trim();
      const trimmedContactId = form.contactId.trim();
      const trimmedEmail = form.email.trim();
      const trimmedProfileUrl = form.profileUrl.trim();
      const trimmedSubject = form.subject.trim();
      const trimmedMessage = form.message.trim();

      if (action === "view" && !trimmedUsername) {
        const messageText = "Username is required to view a contact.";
        setErrorMessage(messageText);
        pushToast("error", messageText);
        setHighlight((prev) => ({ ...prev, username: true }));
        setLoading(false);
        return;
      }

      if (action === "update" && !trimmedContactId) {
        const messageText = "Contact ID is required to update.";
        setErrorMessage(messageText);
        pushToast("error", messageText);
        setHighlight((prev) => ({ ...prev, contactId: true }));
        setLoading(false);
        return;
      }

      if (action === "email" && !trimmedMessage) {
        const messageText = "Message is required to send an email.";
        setErrorMessage(messageText);
        pushToast("error", messageText);
        setLoading(false);
        return;
      }

      if (action === "create" || action === "update") {
        if (trimmedEmail) {
          const result = runValidation("email", trimmedEmail);
          if (result.status === "error") {
            setLoading(false);
            return;
          }
        }
        if (trimmedProfileUrl) {
          const result = runValidation("profileUrl", trimmedProfileUrl);
          if (result.status === "error") {
            setLoading(false);
            return;
          }
        }
      }

      const body = { action };
      if (trimmedUsername) {
        body.username = trimmedUsername;
      }

      if (action === "create" || action === "update") {
        if (trimmedContactId) {
          body.local_id = trimmedContactId;
        }
        const contactDetailsEntries = Object.entries({
          full_name: form.fullName,
          title: form.title,
          company: form.company,
          location: form.location,
          email: trimmedEmail,
          profile_url: trimmedProfileUrl ? normalizeProfileUrl(trimmedProfileUrl) : "",
        })
          .map(([key, value]) => [key, value?.trim?.() ?? value])
          .filter(([, value]) => Boolean(value));
        Object.assign(body, Object.fromEntries(contactDetailsEntries));
      }

      if (action === "view") {
        if (trimmedContactId) {
          body.local_id = trimmedContactId;
        }
      }

      if (action === "email") {
        if (trimmedSubject) {
          body.subject = trimmedSubject;
        }
        body.message = trimmedMessage;
      }

      try {
        const response = await fetch("/api/rolodex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        if (!response.ok) {
          const messageText =
            (typeof data === "string" && data) ||
            (data && typeof data === "object" && "error" in data && data.error) ||
            response.statusText ||
            "Request failed";
          throw new Error(messageText);
        }
        setResponse(data ?? { success: true });
        if (action === "create") {
          pushToast("success", "Contact created.");
        } else if (action === "update") {
          pushToast("success", "Contact updated.");
        } else if (action === "email") {
          pushToast("success", "Email sent.");
        } else if (action === "view") {
          if (!data || (Array.isArray(data) && data.length === 0)) {
            pushToast("info", "0 results found.");
          } else {
            const record = Array.isArray(data) ? data[0] : data;
            setInlineSummary(formatSummary(record));
            pushToast("success", "Contact loaded.");
          }
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Request failed";
        setErrorMessage(messageText);
        pushToast("error", messageText);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    [
      activeTab,
      fieldErrors.email,
      fieldErrors.profileUrl,
      form.company,
      form.contactId,
      form.email,
      form.fullName,
      form.location,
      form.message,
      form.profileUrl,
      form.subject,
      form.title,
      form.username,
      loading,
      pushToast,
      resetResponses,
      runValidation,
    ]
  );

  const actionButton = useMemo(() => {
    switch (activeTab) {
      case "create":
        return { label: "Create", loadingLabel: "Creating…" };
      case "update":
        return { label: "Update", loadingLabel: "Updating…" };
      case "view":
        return { label: "View", loadingLabel: "Viewing…" };
      case "email":
        return { label: "Send Email", loadingLabel: "Sending…" };
      default:
        return { label: "Submit", loadingLabel: "Submitting…" };
    }
  }, [activeTab]);

  return (
    <div className="rolodex-page">
      <div className="rolodex-card">
        <div className="rolodex-header">
          <div className="rolodex-heading">
            <h1>Rolodex</h1>
            <p>Track contacts and follow-ups.</p>
          </div>
          <button
            type="button"
            className={`gmail-button${gmailState === "connected" ? " connected" : ""}`}
            onClick={handleGmailClick}
            disabled={gmailState === "connected"}
            aria-busy={gmailState === "connecting"}
          >
            <span className="icon">
              {gmailState === "connected" ? <IconCheck /> : gmailState === "connecting" ? <IconLoader /> : <IconMail />}
            </span>
            {gmailLabel}
            <span className="gmail-tooltip">Use Gmail to auto-log emails.</span>
          </button>
        </div>

        <nav className="tab-list" role="tablist" aria-label="Rolodex actions">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`tab-button${activeTab === tab.id ? " active" : ""}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <form ref={formRef} className="rolodex-form" onSubmit={handleSubmit} noValidate>
          {(activeTab === "create" || activeTab === "update") && (
            <div className="rolodex-form-grid">
              <div className={`field${highlight.username ? " required" : ""}`}>
                <label className="field-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="text-input"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleFieldChange("username")}
                />
                <div className="helper-text">Use both to update an existing contact.</div>
              </div>

              <div className={`field${highlight.contactId ? " required" : ""}`}>
                <label className="field-label" htmlFor="contactId">
                  Contact ID
                </label>
                <input
                  id="contactId"
                  className="text-input"
                  placeholder="Contact ID"
                  value={form.contactId}
                  onChange={handleFieldChange("contactId")}
                />
                <button
                  type="button"
                  className="copy-button"
                  onClick={handleCopyContactId}
                  aria-label="Copy contact ID"
                >
                  <IconCopy />
                </button>
                <div className="helper-text">Use both to update an existing contact.</div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  className="text-input"
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={handleFieldChange("fullName")}
                />
                <div className="helper-text" />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className="text-input"
                  placeholder="Title"
                  value={form.title}
                  onChange={handleFieldChange("title")}
                />
                <div className="helper-text" />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="company">
                  Company
                </label>
                <input
                  id="company"
                  className="text-input"
                  placeholder="Company"
                  value={form.company}
                  onChange={handleFieldChange("company")}
                />
                <div className="helper-text" />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  className="text-input"
                  placeholder="Location"
                  value={form.location}
                  onChange={handleFieldChange("location")}
                />
                <div className="helper-text" />
              </div>

              <div
                className={`field${
                  fieldStatus.email === "error"
                    ? " error"
                    : fieldStatus.email === "success"
                    ? " success"
                    : ""
                }`}
              >
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="text-input"
                  placeholder="Email"
                  value={form.email}
                  inputMode="email"
                  autoComplete="email"
                  onChange={handleFieldChange("email")}
                  onBlur={(event) => handleBlur("email", event.target.value)}
                  onKeyDown={handleEmailKeyDown}
                />
                <span className="success-indicator">
                  <IconCheck />
                </span>
                <div className={`validation-text${fieldErrors.email ? " error" : ""}`}>
                  {fieldErrors.email}
                </div>
              </div>

              <div
                className={`field${
                  fieldStatus.profileUrl === "error"
                    ? " error"
                    : fieldStatus.profileUrl === "success"
                    ? " success"
                    : ""
                }`}
              >
                <label className="field-label" htmlFor="profileUrl">
                  Profile URL
                </label>
                <input
                  id="profileUrl"
                  className="text-input"
                  placeholder="Profile URL"
                  value={form.profileUrl}
                  inputMode="url"
                  onChange={handleFieldChange("profileUrl")}
                  onBlur={(event) => handleBlur("profileUrl", event.target.value)}
                />
                <span className="success-indicator">
                  <IconCheck />
                </span>
                <div className={`validation-text${fieldErrors.profileUrl ? " error" : ""}`}>
                  {fieldErrors.profileUrl}
                </div>
              </div>

              <div className="field double">
                <label className="field-label" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  className="text-input"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={handleFieldChange("subject")}
                  onKeyDown={handleSubjectKeyDown}
                />
                <div className="helper-text" />
              </div>

              <div className="field double">
                <label className="field-label" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  className="text-area"
                  placeholder="Message"
                  rows={6}
                  value={form.message}
                  onChange={handleFieldChange("message")}
                  onKeyDown={handleMessageKeyDown}
                />
                <div className="helper-text" />
              </div>
            </div>
          )}

          {activeTab === "view" && (
            <div className="rolodex-form-grid single">
              <div className={`field${highlight.username ? " required" : ""}`}>
                <label className="field-label" htmlFor="view-username">
                  Username
                </label>
                <input
                  id="view-username"
                  className="text-input"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleFieldChange("username")}
                />
                <div className="helper-text">Only username is required to view.</div>
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div className="rolodex-form-grid single">
              <div className="field">
                <label className="field-label" htmlFor="email-subject">
                  Subject
                </label>
                <input
                  id="email-subject"
                  className="text-input"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={handleFieldChange("subject")}
                  onKeyDown={handleSubjectKeyDown}
                />
                <div className="helper-text" />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="email-message">
                  Message
                </label>
                <textarea
                  id="email-message"
                  className="text-area"
                  placeholder="Message"
                  rows={6}
                  value={form.message}
                  onChange={handleFieldChange("message")}
                  onKeyDown={handleMessageKeyDown}
                />
                <div className="helper-text">Press Ctrl/Cmd+Enter to send.</div>
              </div>
            </div>
          )}

          <div className="action-row single">
            <button
              type="submit"
              className="button"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <IconLoader /> : null}
              {loading ? actionButton.loadingLabel : actionButton.label}
            </button>
          </div>
        </form>

        <div className="result-area">
          {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
          {inlineSummary ? <div className="inline-result">{inlineSummary}</div> : null}
          <ResultTable data={response} />
          {!response && !inlineSummary && !errorMessage ? (
            <div className="empty-footer">No contact selected.</div>
          ) : null}
        </div>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
