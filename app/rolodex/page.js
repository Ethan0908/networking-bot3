"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./rolodex.css";

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

const TOAST_TIMEOUT = 4500;

const EMAIL_REGEX = /.+@.+\..+/;

function validateEmail(value) {
  if (!value) {
    return { status: null, message: "" };
  }
  if (!EMAIL_REGEX.test(value)) {
    return { status: "error", message: "Please enter a valid email." };
  }
  return { status: "success", message: "" };
}

function validateProfileUrl(value) {
  if (!value) {
    return { status: null, message: "" };
  }
  if (!/^https?:\/\//i.test(value)) {
    return { status: "error", message: "Add https://" };
  }
  return { status: "success", message: "" };
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

export default function Rolodex() {
  const [username, setUsername] = useState("");
  const [contactId, setContactId] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [inlineSummary, setInlineSummary] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [gmailStatus, setGmailStatus] = useState("disconnected");
  const [toasts, setToasts] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ email: "", profileUrl: "" });
  const [fieldStatus, setFieldStatus] = useState({ email: null, profileUrl: null });
  const [fieldTouched, setFieldTouched] = useState({ email: false, profileUrl: false });
  const [usernameHighlight, setUsernameHighlight] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(false);
  const validationTimers = useRef({});
  const emailButtonRef = useRef(null);

  const trimmedUsernameForLink = username.trim();
  const oauthUrl = trimmedUsernameForLink
    ? `/api/oauth/google/start?userId=${encodeURIComponent(trimmedUsernameForLink)}`
    : "/api/oauth/google/start?userId=YOUR_USER_ID";

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
    const validator = field === "email" ? validateEmail : validateProfileUrl;
    const { status, message } = validator(value);
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    setFieldStatus((prev) => ({ ...prev, [field]: status }));
    return { status, message };
  }, []);

  useEffect(() => {
    if (!fieldTouched.email) {
      return;
    }
    validationTimers.current.email && clearTimeout(validationTimers.current.email);
    const value = email.trim();
    validationTimers.current.email = setTimeout(() => {
      if (!value) {
        setFieldErrors((prev) => ({ ...prev, email: "" }));
        setFieldStatus((prev) => ({ ...prev, email: null }));
        return;
      }
      runValidation("email", value);
    }, 150);
    return () => {
      validationTimers.current.email && clearTimeout(validationTimers.current.email);
    };
  }, [email, fieldTouched.email, runValidation]);

  useEffect(() => {
    if (!fieldTouched.profileUrl) {
      return;
    }
    validationTimers.current.profileUrl && clearTimeout(validationTimers.current.profileUrl);
    const value = profileUrl.trim();
    validationTimers.current.profileUrl = setTimeout(() => {
      if (!value) {
        setFieldErrors((prev) => ({ ...prev, profileUrl: "" }));
        setFieldStatus((prev) => ({ ...prev, profileUrl: null }));
        return;
      }
      runValidation("profileUrl", value);
    }, 150);
    return () => {
      validationTimers.current.profileUrl && clearTimeout(validationTimers.current.profileUrl);
    };
  }, [profileUrl, fieldTouched.profileUrl, runValidation]);

  const handleBlur = useCallback(
    (field, value) => {
      setFieldTouched((prev) => ({ ...prev, [field]: true }));
      runValidation(field, value.trim());
    },
    [runValidation]
  );

  const disableSubmit = Boolean(loadingAction);

  useEffect(() => {
    if (usernameHighlight && username.trim()) {
      setUsernameHighlight(false);
    }
  }, [usernameHighlight, username]);

  useEffect(() => {
    if (contactHighlight && contactId.trim()) {
      setContactHighlight(false);
    }
  }, [contactHighlight, contactId]);

  const handleCopyContactId = useCallback(() => {
    if (!contactId.trim()) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      pushToast("info", "Contact ID copied.");
      return;
    }
    navigator.clipboard
      .writeText(contactId.trim())
      .then(() => {
        pushToast("info", "Contact ID copied.");
      })
      .catch(() => {
        pushToast("error", "Unable to copy contact ID.");
      });
  }, [contactId, pushToast]);

  const handleGmailClick = useCallback(
    (event) => {
      event.preventDefault();
      if (gmailStatus === "connecting") return;
      setGmailStatus("connecting");
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 120);
    },
    [gmailStatus, oauthUrl]
  );

  const handleSubjectKeyDown = useCallback((event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
    }
  }, []);

  const handleEmailKeyDown = handleSubjectKeyDown;

  const handleMessageKeyDown = useCallback(
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (emailButtonRef.current) {
          emailButtonRef.current.click();
        }
      }
    },
    []
  );

  const resetResponses = useCallback(() => {
    setResponse(null);
    setInlineSummary("");
    setErrorMessage("");
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const action = event.nativeEvent.submitter?.value;
      if (!action) {
        setErrorMessage("Unknown action");
        pushToast("error", "Unknown action");
        return;
      }
      setLoadingAction(action);
      resetResponses();
      setUsernameHighlight(false);
      setContactHighlight(false);

      const trimmedUsernameValue = username.trim();
      const trimmedContactId = contactId.trim();
      const contactDetailsEntries = Object.entries({
        full_name: fullName,
        title,
        company,
        location,
        email,
        profile_url: profileUrl,
      })
        .map(([key, value]) => [key, value.trim?.() ?? value])
        .filter(([, value]) => Boolean(value));
      const contactDetails = Object.fromEntries(contactDetailsEntries);

      if (action === "update" || action === "email") {
        if (!trimmedContactId) {
          const message = "Contact ID is required for this action.";
          setErrorMessage(message);
          pushToast("error", message);
          setContactHighlight(true);
          setLoadingAction(null);
          return;
        }
      }

      if (action === "view" && !trimmedUsernameValue) {
        const message = "Username is required to view a contact.";
        setErrorMessage(message);
        pushToast("error", message);
        setUsernameHighlight(true);
        setLoadingAction(null);
        return;
      }

      const body = {
        action,
        ...(trimmedUsernameValue ? { username: trimmedUsernameValue } : {}),
      };

      if (trimmedContactId) {
        body.local_id = trimmedContactId;
      }

      if (action === "create" || action === "view" || action === "update") {
        Object.assign(body, contactDetails);
      }

      if (action === "email") {
        const trimmedSubject = subject.trim();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
          const messageText = "Message is required to send an email.";
          setErrorMessage(messageText);
          pushToast("error", messageText);
          setLoadingAction(null);
          return;
        }
        if (trimmedSubject) {
          body.subject = trimmedSubject;
        }
        body.message = trimmedMessage;
      }

      try {
        const r = await fetch("/api/rolodex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await r.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        if (!r.ok) {
          const messageText =
            (typeof data === "string" && data) ||
            (data && typeof data === "object" && "error" in data && data.error) ||
            r.statusText ||
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
        setLoadingAction(null);
      }
    },
    [
      contactId,
      email,
      fullName,
      location,
      message,
      profileUrl,
      pushToast,
      resetResponses,
      subject,
      title,
      username,
    ]
  );

  const gmailLabel = useMemo(() => {
    if (gmailStatus === "connected") return "Connected";
    if (gmailStatus === "connecting") return "Connecting…";
    return "Connect Gmail";
  }, [gmailStatus]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && gmailStatus === "connecting") {
        setGmailStatus("connected");
        pushToast("success", "Gmail connected.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [gmailStatus, pushToast]);

  return (
    <div className="rolodex-page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <section className="rolodex-card" aria-labelledby="rolodex-heading">
        <header className="rolodex-header">
          <div className="rolodex-heading">
            <h1 id="rolodex-heading">Rolodex</h1>
            <p>Track contacts and follow-ups.</p>
          </div>
          <button
            type="button"
            className={`gmail-button${gmailStatus === "connected" ? " connected" : ""}`}
            onClick={handleGmailClick}
            disabled={gmailStatus === "connecting"}
            aria-busy={gmailStatus === "connecting"}
          >
            <span className="icon">
              {gmailStatus === "connecting" ? (
                <IconLoader />
              ) : gmailStatus === "connected" ? (
                <IconCheck />
              ) : (
                <IconMail />
              )}
            </span>
            {gmailLabel}
            <span className="gmail-tooltip">Use Gmail to auto-log emails.</span>
          </button>
        </header>

        <form className="rolodex-form" onSubmit={handleSubmit} noValidate>
          <div className="rolodex-form-grid">
            <div className={`field${usernameHighlight ? " error" : ""}`}>
              <label className="field-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="text-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                autoComplete="off"
              />
              <div className={`helper-text${usernameHighlight ? " error" : ""}`}>
                {usernameHighlight
                  ? "Username is required to view a contact."
                  : "Use both to update an existing contact."}
              </div>
            </div>

            <div className={`field${contactHighlight ? " error" : ""}`}>
              <label className="field-label" htmlFor="contactId">
                Contact ID
              </label>
              <input
                id="contactId"
                className="text-input"
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                placeholder="Contact ID"
                autoComplete="off"
              />
              {contactId.trim() && (
                <button
                  type="button"
                  className="copy-button"
                  onClick={handleCopyContactId}
                  aria-label="Copy contact ID"
                >
                  <IconCopy />
                </button>
              )}
              <div className={`helper-text${contactHighlight ? " error" : ""}`}>
                {contactHighlight
                  ? "Contact ID is required for this action."
                  : "Use both to update an existing contact."}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="text-input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full Name"
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
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
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
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Company"
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
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location"
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={(event) => handleBlur("email", event.target.value)}
                onKeyDown={handleEmailKeyDown}
                placeholder="Email"
                inputMode="email"
                autoComplete="email"
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
                value={profileUrl}
                onChange={(event) => setProfileUrl(event.target.value)}
                onBlur={(event) => handleBlur("profileUrl", event.target.value)}
                placeholder="Profile URL"
                inputMode="url"
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
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="Subject"
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
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleMessageKeyDown}
                placeholder="Message"
                rows={6}
              />
              <div className="helper-text" />
            </div>
          </div>

          <div className="action-row">
            <button
              type="submit"
              value="create"
              className="button"
              disabled={disableSubmit}
              aria-busy={loadingAction === "create"}
            >
              {loadingAction === "create" ? <IconLoader /> : null}
              {loadingAction === "create" ? "Creating…" : "Create"}
            </button>
            <button
              type="submit"
              value="update"
              className="button secondary"
              disabled={disableSubmit}
              aria-busy={loadingAction === "update"}
            >
              {loadingAction === "update" ? <IconLoader /> : null}
              {loadingAction === "update" ? "Updating…" : "Update"}
            </button>
            <button
              type="submit"
              value="view"
              className="button secondary"
              disabled={disableSubmit}
              aria-busy={loadingAction === "view"}
            >
              {loadingAction === "view" ? <IconLoader /> : null}
              {loadingAction === "view" ? "Viewing…" : "View"}
            </button>
            <button
              ref={emailButtonRef}
              type="submit"
              value="email"
              className="button ghost"
              disabled={disableSubmit}
              aria-busy={loadingAction === "email"}
            >
              {loadingAction === "email" ? <IconLoader /> : null}
              {loadingAction === "email" ? "Sending…" : "Email"}
            </button>
          </div>
        </form>

        <div className="result-area">
          {errorMessage && (
            <div className="inline-result" role="alert">
              {errorMessage}
            </div>
          )}
          {inlineSummary && !errorMessage && (
            <div className="inline-result" aria-live="polite">
              {inlineSummary}
            </div>
          )}
          {response && (
            <pre className="response-view" aria-live="polite">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>

        {!response && !inlineSummary && !errorMessage && (
          <div className="empty-footer">No contact selected.</div>
        )}
      </section>
    </div>
  );
}
