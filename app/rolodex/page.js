"use client";
import { signIn } from "next-auth/react";
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

const SAMPLE_CONTACT_RECORD = {
  contact_id: 1,
  local_id: 1,
  full_name: "John Doe",
  title: "CEO",
  company: "Company",
  location: "New York City",
  profile_url: "www.exampleurl.com",
  email: "example@gmail.com",
  engagement_label: "0 messages",
  last_updated: "2025-01-01T12:00:00",
};

const SAMPLE_CONTACT_ID = String(
  SAMPLE_CONTACT_RECORD.contact_id ??
    SAMPLE_CONTACT_RECORD.local_id ??
    SAMPLE_CONTACT_RECORD.id ??
    1
);

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
  const trimmed = value.trim();
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  try {
    const candidate = hasProtocol ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!parsed.hostname) {
      throw new Error("Invalid host");
    }
  } catch {
    return { status: "error", message: "Please enter a valid URL." };
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

function IconSun(props) {
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
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon(props) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
  const [activePage, setActivePage] = useState("create");
  const [lastAction, setLastAction] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: "", profileUrl: "" });
  const [fieldStatus, setFieldStatus] = useState({ email: null, profileUrl: null });
  const [fieldTouched, setFieldTouched] = useState({ email: false, profileUrl: false });
  const [usernameHighlight, setUsernameHighlight] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(false);
  const [theme, setTheme] = useState("light");
  const [emailContacts, setEmailContacts] = useState(() => [
    { ...SAMPLE_CONTACT_RECORD, __contactId: SAMPLE_CONTACT_ID },
  ]);
  const [isSampleEmailContacts, setIsSampleEmailContacts] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const validationTimers = useRef({});
  const emailButtonRef = useRef(null);
  const selectAllRef = useRef(null);

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
  const showContactIdField = activePage === "update";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedTheme = window.localStorage.getItem("rolodex-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      return;
    }
    if (window.matchMedia) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        setTheme("dark");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
    } else {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
    }
    root.dataset.theme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rolodex-theme", theme);
    }
  }, [theme]);

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

  useEffect(() => {
    setErrorMessage("");
    setResponse(null);
    setInlineSummary("");
    setLastAction(null);
    if (activePage === "create") {
      setContactId("");
      setContactHighlight(false);
    }
    if (activePage !== "email") {
      setEmailRecipients([]);
    }
  }, [activePage]);

  const copyContactIdToClipboard = useCallback(
    (value) => {
      if (!value) {
        return;
      }
      const trimmed = String(value).trim();
      if (!trimmed) {
        return;
      }
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        pushToast("info", "Contact ID copied.");
        return;
      }
      navigator.clipboard
        .writeText(trimmed)
        .then(() => {
          pushToast("info", "Contact ID copied.");
        })
        .catch(() => {
          pushToast("error", "Unable to copy contact ID.");
        });
    },
    [pushToast]
  );

  const handleCopyContactId = useCallback(() => {
    copyContactIdToClipboard(contactId);
  }, [contactId, copyContactIdToClipboard]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleGmailClick = useCallback(async () => {
    if (gmailStatus === "connecting") return;
    setGmailStatus("connecting");
    try {
      const result = await signIn("google", { redirect: false });
      if (result?.error) {
        throw new Error(result.error);
      }
      setGmailStatus("connected");
      pushToast("success", "Gmail connected.");
    } catch (error) {
      console.error("Failed to start Google sign-in", error);
      setGmailStatus("disconnected");
      pushToast("error", "Unable to start Google sign-in.");
    }
  }, [gmailStatus, pushToast]);

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

  const resolveContactId = useCallback((record) => {
    if (!record || typeof record !== "object") {
      return "";
    }
    const idCandidate =
      record.contact_id ??
      record.contactId ??
      record.local_id ??
      record.localId ??
      record.id ??
      null;
    return idCandidate != null ? String(idCandidate) : "";
  }, []);

  const handleLoadEmailContacts = useCallback(async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      const messageText = "Username is required to load contacts.";
      setUsernameHighlight(true);
      pushToast("error", messageText);
      return;
    }
    setLoadingContacts(true);
    try {
      const r = await fetch("/api/rolodex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", username: trimmedUsername }),
      });
      const text = await r.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!r.ok) {
        const messageText =
          (data && typeof data === "object" && "error" in data && data.error) ||
          r.statusText ||
          "Failed to load contacts";
        throw new Error(messageText);
      }
      const records = Array.isArray(data) ? data : data ? [data] : [];
      const normalized = records
        .filter((record) => record && typeof record === "object")
        .map((record) => ({ ...record, __contactId: resolveContactId(record) }))
        .filter((record) => record.__contactId);
      if (normalized.length > 0) {
        setEmailContacts(normalized);
      } else {
        setEmailContacts([]);
      }
      setEmailRecipients([]);
      setIsSampleEmailContacts(false);
      if (normalized.length === 0) {
        pushToast("info", "No contacts found for this username.");
      } else {
        pushToast("success", "Contacts loaded for emailing.");
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to load contacts";
      pushToast("error", messageText);
    } finally {
      setLoadingContacts(false);
    }
  }, [pushToast, resolveContactId, username]);

  const handleToggleRecipient = useCallback((id) => {
    setEmailRecipients((prev) => {
      const normalizedId = String(id);
      return prev.includes(normalizedId)
        ? prev.filter((item) => item !== normalizedId)
        : [...prev, normalizedId];
    });
  }, []);

  const handleRecipientRowClick = useCallback(
    (event, id) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("a") || event.target.closest("button"))
      ) {
        return;
      }
      handleToggleRecipient(id);
    },
    [handleToggleRecipient]
  );

  const allRecipientIds = useMemo(
    () =>
      emailContacts
        .map((contact) => contact.__contactId || resolveContactId(contact))
        .filter(Boolean)
        .map(String),
    [emailContacts, resolveContactId]
  );

  const allRecipientsSelected = useMemo(() => {
    if (allRecipientIds.length === 0) {
      return false;
    }
    return allRecipientIds.every((id) => emailRecipients.includes(id));
  }, [allRecipientIds, emailRecipients]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate =
      emailRecipients.length > 0 && !allRecipientsSelected;
  }, [allRecipientsSelected, emailRecipients]);

  const handleToggleSelectAll = useCallback(() => {
    if (allRecipientIds.length === 0) {
      return;
    }
    setEmailRecipients((prev) => (allRecipientsSelected ? [] : allRecipientIds));
  }, [allRecipientIds, allRecipientsSelected]);

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
      setLastAction(action);
      setLoadingAction(action);
      resetResponses();
      setUsernameHighlight(false);
      setContactHighlight(false);

      const trimmedUsernameValue = username.trim();
      const trimmedContactId = contactId.trim();
      const trimmedProfileUrlValue = profileUrl.trim();
      if (trimmedProfileUrlValue) {
        const { status, message } = validateProfileUrl(trimmedProfileUrlValue);
        setFieldTouched((prev) => ({ ...prev, profileUrl: true }));
        setFieldErrors((prev) => ({ ...prev, profileUrl: message }));
        setFieldStatus((prev) => ({ ...prev, profileUrl: status }));
        if (status === "error") {
          setErrorMessage(message);
          pushToast("error", message);
          setLoadingAction(null);
          return;
        }
      }

      const contactDetailsEntries = Object.entries({
        full_name: fullName,
        title,
        company,
        location,
        email,
        profile_url: profileUrl.trim(),
      })
        .map(([key, value]) => [key, value.trim?.() ?? value])
        .filter(([, value]) => Boolean(value));
      const contactDetails = Object.fromEntries(contactDetailsEntries);

      if (action === "update") {
        if (!trimmedContactId) {
          const message = "Contact ID is required to update.";
          setErrorMessage(message);
          pushToast("error", message);
          setContactHighlight(true);
          setLoadingAction(null);
          return;
        }
      }

      if (action === "email") {
        if (emailRecipients.length === 0) {
          const messageText = "Select at least one contact to email.";
          setErrorMessage(messageText);
          pushToast("error", messageText);
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

      if (trimmedContactId && action !== "create" && action !== "email") {
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
        const normalizedRecipients = emailRecipients.map((value) => {
          const numeric = Number(value);
          return Number.isNaN(numeric) ? value : numeric;
        });
        body.recipient_ids = normalizedRecipients;
        if (normalizedRecipients.length === 1) {
          body.local_id = normalizedRecipients[0];
        } else if (normalizedRecipients.length > 1) {
          body.local_ids = normalizedRecipients;
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
      emailRecipients,
    ]
  );

  const gmailLabel = useMemo(() => {
    if (gmailStatus === "connected") return "Gmail Connected";
    if (gmailStatus === "connecting") return "Connecting…";
    return "Connect Gmail";
  }, [gmailStatus]);

  const themeToggleLabel = useMemo(
    () => (theme === "dark" ? "Switch to light mode" : "Switch to dark mode"),
    [theme]
  );

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

  const contactDetailFields = (
    <>
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
    </>
  );

  const tabs = [
    { id: "create", label: "Create" },
    { id: "view", label: "View" },
    { id: "update", label: "Update" },
    { id: "email", label: "Email" },
  ];

  const viewRecords = useMemo(() => {
    if (lastAction !== "view" || !response) {
      return [];
    }
    const records = Array.isArray(response) ? response : [response];
    return records.filter((record) => record && typeof record === "object");
  }, [lastAction, response]);

  const showJsonResponse =
    lastAction && lastAction === activePage && lastAction !== "view" && response;

  const emptyMessageMap = {
    create: "Fill in contact details to create a new record.",
    view: "Load a contact to preview their profile information.",
    update: "Update fields above and save your changes.",
    email: "Load contacts, pick recipients, and compose your message.",
  };

  const sampleViewRecord = useMemo(
    () => ({ ...SAMPLE_CONTACT_RECORD }),
    []
  );

  const resolvedViewRecords = useMemo(() => {
    if (activePage !== "view") {
      return [];
    }
    if (viewRecords.length > 0) {
      return viewRecords;
    }
    if (!errorMessage) {
      return [sampleViewRecord];
    }
    return [];
  }, [activePage, errorMessage, sampleViewRecord, viewRecords]);

  const isSampleView = viewRecords.length === 0 && resolvedViewRecords.length > 0;

  const formatProfileHref = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  };

  const formatTimestamp = useCallback((value) => {
    if (!value) {
      return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const computeEngagementStatus = useCallback(
    (record) => {
      const explicitLabel =
        record?.engagement_label ??
        record?.engagementLabel ??
        record?.engagement_text ??
        record?.engagementText ??
        record?.engagement ??
        null;
      const candidate =
        record?.last_contacted ??
        record?.last_messaged ??
        record?.lastMessaged ??
        record?.last_contacted_at ??
        null;
      if (!candidate) {
        if (explicitLabel) {
          return { color: "gray", label: explicitLabel };
        }
        return { color: "gray", label: "No recent messages" };
      }
      const date = new Date(candidate);
      if (Number.isNaN(date.getTime())) {
        if (explicitLabel) {
          return { color: "gray", label: explicitLabel };
        }
        return { color: "gray", label: "No recent messages" };
      }
      const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 31) {
        return { color: "green", label: "Last messaged within a month" };
      }
      if (diffDays <= 62) {
        return { color: "yellow", label: "Last messaged within two months" };
      }
      return { color: "red", label: "Last messaged three+ months ago" };
    },
    []
  );

  return (
    <div className="rolodex-page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <section className="rolodex-card" aria-labelledby="rolodex-heading">
        <header className="rolodex-header">
          <div className="rolodex-heading">
            <h1 id="rolodex-heading">Rolodex</h1>
            <p>Track contacts and follow-ups.</p>
          </div>
          <div className="header-actions">
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
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={themeToggleLabel}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="context-grid" role="group" aria-label="Contact context">
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
                : "Used to look up contacts across every tab."}
            </div>
          </div>
          {showContactIdField && (
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
                  ? "Contact ID is required to update."
                  : "Needed when updating a contact."}
              </div>
            </div>
          )}
        </div>

        <nav className="rolodex-tabs" role="tablist" aria-label="Rolodex sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tab.id}-tab`}
              aria-controls={`${tab.id}-panel`}
              aria-selected={activePage === tab.id}
              className={`tab-button${activePage === tab.id ? " active" : ""}`}
              onClick={() => setActivePage(tab.id)}
              tabIndex={activePage === tab.id ? 0 : -1}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="tab-panel">
          {activePage === "create" && (
            <div role="tabpanel" id="create-panel" aria-labelledby="create-tab">
              <form className="rolodex-form" onSubmit={handleSubmit} noValidate>
                <div className="rolodex-form-grid">{contactDetailFields}</div>
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
                </div>
              </form>
            </div>
          )}

          {activePage === "view" && (
            <div role="tabpanel" id="view-panel" aria-labelledby="view-tab">
              <form className="simple-form" onSubmit={handleSubmit} noValidate>
                <p className="view-helper">Use the username above to load a contact.</p>
                <div className="action-row">
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
                </div>
              </form>
            </div>
          )}

          {activePage === "update" && (
            <div role="tabpanel" id="update-panel" aria-labelledby="update-tab">
              <form className="rolodex-form" onSubmit={handleSubmit} noValidate>
                <div className="rolodex-form-grid">{contactDetailFields}</div>
                <div className="action-row">
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
                </div>
              </form>
            </div>
          )}

          {activePage === "email" && (
            <div role="tabpanel" id="email-panel" aria-labelledby="email-tab">
              <form className="rolodex-form" onSubmit={handleSubmit} noValidate>
                <div className="recipients-block">
                  <div className="recipients-toolbar">
                    <span id="recipient-label" className="recipients-title">
                      Recipients
                    </span>
                    <div className="recipient-controls">
                      <button
                        type="button"
                        className="button tertiary load-contacts-button"
                        onClick={handleLoadEmailContacts}
                        disabled={loadingContacts}
                        aria-busy={loadingContacts}
                      >
                        {loadingContacts ? <IconLoader /> : null}
                        {loadingContacts ? "Loading…" : "Load Contacts"}
                      </button>
                    </div>
                  </div>
                  {emailContacts.length === 0 ? (
                    <p className="recipient-placeholder">Load contacts to choose recipients.</p>
                  ) : (
                    <div
                      className="table-scroll recipient-table-scroll"
                      role="group"
                      aria-labelledby="recipient-label"
                    >
                      <table className="view-table recipient-table">
                        {isSampleEmailContacts && (
                          <caption className="view-table-caption">
                            Sample contact shown. Load a contact to see live data.
                          </caption>
                        )}
                        <thead>
                          <tr>
                            <th scope="col" className="select-header">
                              <div className="select-header-content">
                                <span className="select-header-label">Select</span>
                                <label className="select-all-control">
                                  <input
                                    ref={selectAllRef}
                                    type="checkbox"
                                    onChange={handleToggleSelectAll}
                                    checked={allRecipientsSelected}
                                    disabled={allRecipientIds.length === 0}
                                    aria-label="Select all recipients"
                                  />
                                  <span>Select all</span>
                                </label>
                              </div>
                            </th>
                            <th scope="col">Contact ID</th>
                            <th scope="col">Full Name</th>
                            <th scope="col">Title</th>
                            <th scope="col">Company</th>
                            <th scope="col">Location</th>
                            <th scope="col">Profile URL</th>
                            <th scope="col">Email</th>
                            <th scope="col">Engagement</th>
                            <th scope="col">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailContacts.map((contact) => {
                            const id = contact.__contactId || resolveContactId(contact);
                            if (!id) {
                              return null;
                            }
                            const normalizedId = String(id);
                            const isSelected = emailRecipients.includes(normalizedId);
                            const profileLink = formatProfileHref(
                              contact.profile_url ?? contact.profileUrl
                            );
                            const engagement = computeEngagementStatus(contact);
                            const lastUpdatedDisplay = formatTimestamp(
                              contact.last_updated ?? contact.updated_at ?? contact.updatedAt
                            );
                            const lastMessagedDisplay = formatTimestamp(
                              contact.last_contacted ??
                                contact.last_messaged ??
                                contact.lastMessaged ??
                                contact.last_contacted_at
                            );
                            const contactIdValue = String(id);
                            const nameLabel =
                              contact.full_name ?? contact.fullName ?? `Contact ${normalizedId}`;
                            return (
                              <tr
                                key={normalizedId}
                                className={isSelected ? "selected" : ""}
                                aria-selected={isSelected}
                                onClick={(event) => handleRecipientRowClick(event, normalizedId)}
                              >
                                <td className="select-cell">
                                  <button
                                    type="button"
                                    className={`select-toggle${isSelected ? " selected" : ""}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleToggleRecipient(normalizedId);
                                    }}
                                    aria-pressed={isSelected}
                                    aria-label={`${isSelected ? "Deselect" : "Select"} ${nameLabel}`}
                                  >
                                    <span className="select-indicator" aria-hidden="true" />
                                  </button>
                                </td>
                                <td className="contact-id-cell">
                                  {contactIdValue ? (
                                    <button
                                      type="button"
                                      className="contact-id-button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        copyContactIdToClipboard(contactIdValue);
                                      }}
                                      aria-label={`Copy contact ID ${contactIdValue}`}
                                    >
                                      <span>{contactIdValue}</span>
                                      <IconCopy />
                                    </button>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>{contact.full_name ?? contact.fullName ?? "—"}</td>
                                <td>{contact.title ?? "—"}</td>
                                <td>{contact.company ?? "—"}</td>
                                <td>{contact.location ?? "—"}</td>
                                <td>
                                  {profileLink ? (
                                    <a href={profileLink} target="_blank" rel="noreferrer">
                                      {contact.profile_url ?? contact.profileUrl}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>{contact.email ?? "—"}</td>
                                <td>
                                  <div className="engagement-cell">
                                    <span
                                      className={`status-dot ${engagement.color}`}
                                      title={
                                        lastMessagedDisplay === "—"
                                          ? engagement.label
                                          : `${engagement.label} (${lastMessagedDisplay})`
                                      }
                                      aria-label={
                                        lastMessagedDisplay === "—"
                                          ? engagement.label
                                          : `${engagement.label}. Last messaged ${lastMessagedDisplay}.`
                                      }
                                    />
                                    <span className="status-text">{engagement.label}</span>
                                  </div>
                                </td>
                                <td>{lastUpdatedDisplay}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="helper-text recipients-helper">
                    {emailRecipients.length > 0
                      ? `${emailRecipients.length} recipient${emailRecipients.length === 1 ? "" : "s"} selected.`
                      : "No recipients selected."}
                  </div>
                </div>

                <div className="rolodex-form-grid email-inputs">
                  <div className="field">
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
                    <div className="helper-text">
                      Press ⌘/Ctrl + Enter to send.
                    </div>
                  </div>
                </div>
                <div className="action-row">
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
            </div>
          )}
        </div>

        <div className="result-area">
          {errorMessage && (
            <div className="inline-result" role="alert">
              {errorMessage}
            </div>
          )}

          {inlineSummary && !errorMessage && lastAction === "view" && activePage === "view" && (
            <div className="inline-result" aria-live="polite">
              {inlineSummary}
            </div>
          )}

          {resolvedViewRecords.length > 0 && (
            <div className="table-scroll">
              <table className="view-table">
                {isSampleView && (
                  <caption className="view-table-caption">
                    Sample contact shown. Load a contact to see live data.
                  </caption>
                )}
                <thead>
                  <tr>
                    <th scope="col">Contact ID</th>
                    <th scope="col">Full Name</th>
                    <th scope="col">Title</th>
                    <th scope="col">Company</th>
                    <th scope="col">Location</th>
                    <th scope="col">Profile URL</th>
                    <th scope="col">Email</th>
                    <th scope="col">Engagement</th>
                    <th scope="col">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedViewRecords.map((record, index) => {
                    const contactIdValue = resolveContactId(record);
                    const key = contactIdValue || index;
                    const profileLink = formatProfileHref(record.profile_url ?? record.profileUrl);
                    const engagement = computeEngagementStatus(record);
                    const lastUpdatedDisplay = formatTimestamp(
                      record.last_updated ?? record.updated_at ?? record.updatedAt
                    );
                    const lastMessagedDisplay = formatTimestamp(
                      record.last_contacted ??
                        record.last_messaged ??
                        record.lastMessaged ??
                        record.last_contacted_at
                    );
                    return (
                      <tr key={key}>
                        <td className="contact-id-cell">
                          {contactIdValue ? (
                            <button
                              type="button"
                              className="contact-id-button"
                              onClick={() => copyContactIdToClipboard(contactIdValue)}
                              aria-label={`Copy contact ID ${contactIdValue}`}
                            >
                              <span>{contactIdValue}</span>
                              <IconCopy />
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{record.full_name ?? record.fullName ?? "—"}</td>
                        <td>{record.title ?? "—"}</td>
                        <td>{record.company ?? "—"}</td>
                        <td>{record.location ?? "—"}</td>
                        <td>
                          {profileLink ? (
                            <a href={profileLink} target="_blank" rel="noreferrer">
                              {record.profile_url ?? record.profileUrl}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{record.email ?? "—"}</td>
                        <td>
                          <div className="engagement-cell">
                            <span
                              className={`status-dot ${engagement.color}`}
                              title={
                                lastMessagedDisplay === "—"
                                  ? engagement.label
                                  : `${engagement.label} (${lastMessagedDisplay})`
                              }
                              aria-label={
                                lastMessagedDisplay === "—"
                                  ? engagement.label
                                  : `${engagement.label}. Last messaged ${lastMessagedDisplay}.`
                              }
                            />
                            <span className="status-text">{engagement.label}</span>
                          </div>
                        </td>
                        <td>{lastUpdatedDisplay}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showJsonResponse && (
            <pre className="response-view" aria-live="polite">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>

        {!errorMessage && !inlineSummary && !response && resolvedViewRecords.length === 0 && (
          <div className="empty-footer">{emptyMessageMap[activePage]}</div>
        )}
      </section>
    </div>
  );
}
