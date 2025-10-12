"use client";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./rolodex.css";
import { AiResultsPanel } from "./AiResultsPanel";
import { EmailContactsTable } from "./EmailContactsTable";
import {
  IconAlert,
  IconCheck,
  IconCopy,
  IconInfo,
  IconLoader,
  IconMail,
  IconMoon,
  IconSun,
} from "./icons";
import { EMAIL_REGEX, useEmailTemplate } from "./useEmailTemplate";

const TOAST_TIMEOUT = 4500;

const DEFAULT_PREVIEW_MESSAGE = "[AI will write this]";
const DEFAULT_BATCH_SIZE = 10;
const JOB_POLL_INTERVAL = 4000;
const EMAIL_JOBS_ENABLED = process.env.NEXT_PUBLIC_USE_EMAIL_JOBS !== "false";

function buildRewriteGuide(body) {
  if (!body) return "";
  return body.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const normalized = String(key || "").trim();
    if (!normalized) return "";
    if (normalized === "draft") {
      return "[[AI_DRAFT]]";
    }
    return `[[${normalized}]]`;
  });
}

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

function getValueAtPath(source, path) {
  if (!path) {
    return undefined;
  }
  const keys = path.split(".");
  let current = source;
  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function replaceTemplateTokens(template, context, options = {}) {
  if (!template || typeof template !== "string") {
    return "";
  }
  const { preserveDraft = false, draftReplacement = DEFAULT_PREVIEW_MESSAGE } = options;
  return template.replace(/{{\s*([^{}\s]+(?:\.[^{}\s]+)*)\s*}}/g, (match, path) => {
    if (path === "draft") {
      return preserveDraft ? match : draftReplacement;
    }
    const value = getValueAtPath(context, path);
    if (value == null) {
      return match;
    }
    return String(value);
  });
}

function resolveContactEmail(contact) {
  if (!contact || typeof contact !== "object") {
    return "";
  }
  return (
    contact.email ??
    contact.email_address ??
    contact.emailAddress ??
    contact.primary_email ??
    contact.primaryEmail ??
    ""
  );
}

function resolveContactName(contact) {
  if (!contact || typeof contact !== "object") {
    return "";
  }
  const inferred =
    contact.full_name ??
    contact.fullName ??
    contact.name ??
    [
      contact.first_name ?? contact.firstName ?? "",
      contact.last_name ?? contact.lastName ?? "",
    ]
      .map((value) => (value ? String(value) : ""))
      .filter(Boolean)
      .join(" ");
  return inferred || "";
}

function normaliseRecipientList(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item != null && item !== "")
      .map((item) => String(item))
      .join(", ");
  }
  if (value == null) {
    return "";
  }
  return String(value);
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

export default function Rolodex() {
  const { data: authSession, status: authStatus } = useSession();
  const [username, setUsername] = useState("");
  const [contactId, setContactId] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [response, setResponse] = useState(null);
  const [inlineSummary, setInlineSummary] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [gmailStatus, setGmailStatus] = useState(() =>
    authStatus === "authenticated" && authSession?.user
      ? "connected"
      : "disconnected"
  );
  const [toasts, setToasts] = useState([]);
  const [activePage, setActivePage] = useState("create");
  const [lastAction, setLastAction] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: "", profileUrl: "" });
  const [fieldStatus, setFieldStatus] = useState({ email: null, profileUrl: null });
  const [fieldTouched, setFieldTouched] = useState({ email: false, profileUrl: false });
  const [usernameHighlight, setUsernameHighlight] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(false);
  const [theme, setTheme] = useState("light");
  const [emailContacts, setEmailContacts] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [previewContactId, setPreviewContactId] = useState("");
  const [previewContent, setPreviewContent] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [activeJobId, setActiveJobId] = useState("");
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const validationTimers = useRef({});
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const pushToast = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const {
    toChips,
    toInputValue,
    setToInputValue,
    subject,
    setSubject,
    subjectCharCount,
    emailBody,
    setEmailBody,
    campaignRole,
    setCampaignRole,
    campaignCompany,
    setCampaignCompany,
    studentName,
    setStudentName,
    studentSchool,
    setStudentSchool,
    placeholderLibrary,
    handleAddCustomPlaceholder,
    handleInsertPlaceholder,
    handleRemoveChip,
    handleSaveTemplate,
    handleToInputBlur,
    handleToInputKeyDown,
    invalidToChips,
    toErrorMessage,
    hasValidToValue,
    bodyMissingDraft,
    setLastFocusedField,
    resetTemplate,
  } = useEmailTemplate({ pushToast, subjectRef, bodyRef });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }
    const hasSession = Boolean(authSession?.user);
    const nextStatus = hasSession ? "connected" : "disconnected";
    if (gmailStatus === "connecting" && !hasSession) {
      return;
    }
    if (gmailStatus === nextStatus) {
      return;
    }
    if (nextStatus === "connected") {
      setGmailStatus("connected");
      if (gmailStatus !== "connected") {
        pushToast("success", "Gmail connected.");
      }
    } else {
      setGmailStatus("disconnected");
      if (gmailStatus === "connected") {
        pushToast("info", "Gmail disconnected.");
      } else if (gmailStatus === "connecting") {
        pushToast("error", "Unable to connect Gmail.");
      }
    }
  }, [authSession, authStatus, gmailStatus, pushToast]);

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
    const entries = [
      ["email", email],
      ["profileUrl", profileUrl],
    ];
    const timers = validationTimers.current;
    entries.forEach(([field, raw]) => {
      if (!fieldTouched[field]) {
        return;
      }
      if (timers[field]) {
        clearTimeout(timers[field]);
      }
      const trimmed = raw.trim();
      timers[field] = setTimeout(() => {
        if (!trimmed) {
          setFieldErrors((prev) => ({ ...prev, [field]: "" }));
          setFieldStatus((prev) => ({ ...prev, [field]: null }));
          return;
        }
        runValidation(field, trimmed);
      }, 150);
    });
    return () => {
      entries.forEach(([field]) => {
        if (timers[field]) {
          clearTimeout(timers[field]);
          timers[field] = undefined;
        }
      });
    };
  }, [email, profileUrl, fieldTouched, runValidation]);

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
    const stored = window.localStorage.getItem("rolodex-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme !== "dark");
    root.dataset.theme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rolodex-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (usernameHighlight && username.trim()) {
      setUsernameHighlight(false);
    }
    if (contactHighlight && contactId.trim()) {
      setContactHighlight(false);
    }
  }, [usernameHighlight, username, contactHighlight, contactId]);

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
      const trimmed = String(value ?? "").trim();
      if (!trimmed) {
        return;
      }
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        pushToast("info", "Contact ID copied.");
        return;
      }
      navigator.clipboard.writeText(trimmed).then(
        () => pushToast("info", "Contact ID copied."),
        () => pushToast("error", "Unable to copy contact ID.")
      );
    },
    [pushToast]
  );

  const handleCopyContactId = useCallback(() => {
    copyContactIdToClipboard(contactId);
  }, [contactId, copyContactIdToClipboard]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleGmailClick = useCallback(() => {
    if (gmailStatus === "connecting") return;
    setGmailStatus("connecting");
    const callbackUrl =
      typeof window !== "undefined" ? window.location.href : undefined;
    signIn("google", { callbackUrl }).catch((error) => {
      console.error("Failed to start Google sign-in", error);
      setGmailStatus("disconnected");
      pushToast("error", "Unable to start Google sign-in.");
    });
  }, [gmailStatus, pushToast]);

  const handleSubjectKeyDown = useCallback((event) => {
    if (event.key === "Enter" && !(event.shiftKey || event.ctrlKey || event.metaKey || event.altKey)) {
      event.preventDefault();
    }
  }, []);

  const handleEmailKeyDown = handleSubjectKeyDown;

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
        setPreviewContactId(normalized[0]?.__contactId || "");
      } else {
        setEmailContacts([]);
        setPreviewContactId("");
      }
      setPreviewContent(null);
      setEmailRecipients([]);
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

  const handleResetTemplate = useCallback(() => {
    resetTemplate();
    setPreviewContent(null);
  }, [resetTemplate]);

  const contactMap = useMemo(() => {
    const map = new Map();
    for (const contact of emailContacts) {
      const id = contact.__contactId || resolveContactId(contact);
      if (id) {
        map.set(String(id), contact);
      }
    }
    return map;
  }, [emailContacts, resolveContactId]);

  const selectedContacts = useMemo(() => {
    if (!emailRecipients || emailRecipients.length === 0) {
      return emailContacts;
    }
    const allowed = new Set(emailRecipients.map(String));
    return emailContacts.filter((contact) => {
      const id = contact.__contactId || resolveContactId(contact);
      return id && allowed.has(String(id));
    });
  }, [emailContacts, emailRecipients, resolveContactId]);

  const contactsWithEmails = useMemo(
    () =>
      selectedContacts.filter((contact) => {
        const emailValue = resolveContactEmail(contact);
        return emailValue && EMAIL_REGEX.test(String(emailValue));
      }),
    [selectedContacts]
  );

  const hasValidContactEmail = useMemo(
    () => contactsWithEmails.length > 0,
    [contactsWithEmails]
  );

  const previewContact = useMemo(() => {
    if (!previewContactId) {
      return null;
    }
    return contactMap.get(String(previewContactId)) || null;
  }, [contactMap, previewContactId]);

  const aiIncludedResults = useMemo(
    () => aiResults.filter((result) => !result.excluded),
    [aiResults]
  );

  const downloadsEnabled = !activeJobId && aiIncludedResults.length > 0;

  const canGenerate = useMemo(() => {
    if (isGenerating) {
      return false;
    }
    return (
      subject.trim().length > 0 &&
      emailBody.trim().length > 0 &&
      !bodyMissingDraft &&
      hasValidToValue &&
      invalidToChips.length === 0 &&
      hasValidContactEmail
    );
  }, [
    bodyMissingDraft,
    emailBody,
    hasValidContactEmail,
    hasValidToValue,
    invalidToChips,
    isGenerating,
    subject,
  ]);

  useEffect(() => {
    if (emailContacts.length === 0) {
      if (previewContactId) {
        setPreviewContactId("");
      }
      return;
    }

    const ids = emailContacts
      .map((contact) => contact.__contactId || resolveContactId(contact))
      .filter(Boolean)
      .map(String);

    if (ids.length === 0) {
      if (previewContactId) {
        setPreviewContactId("");
      }
      return;
    }

    if (!previewContactId || !ids.includes(String(previewContactId))) {
      const nextId = ids[0];
      if (nextId && nextId !== previewContactId) {
        setPreviewContactId(nextId);
      }
    }
  }, [emailContacts, previewContactId, resolveContactId]);

  const handlePreviewTemplate = useCallback(() => {
    const contactCandidate = previewContact || contactsWithEmails[0] || emailContacts[0];
    if (!contactCandidate) {
      pushToast("info", "Load a contact to preview.");
      setPreviewContent(null);
      return;
    }
    const contactEmail = resolveContactEmail(contactCandidate);
    const contactName = resolveContactName(contactCandidate);
    const normalizedContact = { ...contactCandidate };
    if (contactName) {
      if (!normalizedContact.name) {
        normalizedContact.name = contactName;
      }
      if (!normalizedContact.full_name && !normalizedContact.fullName) {
        normalizedContact.full_name = contactName;
      }
    }
    const previewTo = toChips
      .map((chip) => (chip === "{{contact.email}}" ? contactEmail || "[missing email]" : chip))
      .join(", ");
    const studentContext = studentName || studentSchool
      ? { name: studentName || null, school: studentSchool || null }
      : null;
    const context = {
      contact: normalizedContact,
      company: campaignCompany || null,
      role: campaignRole || null,
      student: studentContext,
    };
    const previewSubject = replaceTemplateTokens(subject, context, {
      preserveDraft: true,
    });
    const previewBody = replaceTemplateTokens(emailBody, context, {
      preserveDraft: false,
      draftReplacement: DEFAULT_PREVIEW_MESSAGE,
    });
    const id =
      contactCandidate.__contactId || resolveContactId(contactCandidate) || "preview";
    setPreviewContent({
      to: previewTo,
      subject: previewSubject,
      body: previewBody,
      contactId: id,
    });
    pushToast("info", "Preview updated.");
  }, [
    campaignCompany,
    campaignRole,
    contactsWithEmails,
    emailBody,
    emailContacts,
    previewContact,
    pushToast,
    resolveContactEmail,
    resolveContactId,
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

  

  const mergeJobMessages = useCallback(
    (jobId, messages) => {
      if (!Array.isArray(messages)) {
        return;
      }
      setAiResults((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return messages.map((message, index) => ({
            id: `${jobId}-${index}`,
            to: message?.to ?? "",
            subject: message?.subject ?? "",
            body: message?.body ?? "",
            excluded: false,
            isEditing: false,
            status: message?.status ?? "drafted",
            error: message?.error ?? "",
          }));
        }
        return messages.map((message, index) => {
          const existing = prev[index];
          const nextBase = {
            id: `${jobId}-${index}`,
            to: message?.to ?? "",
            subject: message?.subject ?? "",
            body: message?.body ?? "",
            status: message?.status ?? (existing?.status ?? "drafted"),
            error: message?.error ?? (existing?.error ?? ""),
          };
          if (!existing) {
            return {
              ...nextBase,
              excluded: false,
              isEditing: false,
            };
          }
          const isEditing = Boolean(existing.isEditing);
          return {
            ...existing,
            id: nextBase.id,
            to: isEditing ? existing.to : nextBase.to,
            subject: isEditing ? existing.subject : nextBase.subject,
            body: isEditing ? existing.body : nextBase.body,
            status: nextBase.status,
            error: nextBase.error,
          };
        });
      });
    },
    []
  );

  const refreshJobStatus = useCallback(
    async (jobId, { silent = false } = {}) => {
      try {
        const response = await fetch(`/api/email-jobs/${jobId}`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Unable to load job status.");
        }
        const data = await response.json();
        setJobStatus({
          id: jobId,
          status: data.status ?? "queued",
          stage: data.stage ?? null,
          detail: data.detail ?? null,
          progress: data.progress ?? null,
          previews: Array.isArray(data.previews) ? data.previews : [],
          error: data.error ?? null,
          sendSummary: data.sendSummary ?? { sent: 0, failed: 0 },
        });
        if (Array.isArray(data.messages)) {
          mergeJobMessages(jobId, data.messages);
        }
        if (data.status === "ready") {
          setIsGenerating(false);
          setActiveJobId("");
          if (!silent) {
            pushToast("success", "Drafts are ready.");
          }
          return "stop";
        }
        if (data.status === "error") {
          setIsGenerating(false);
          setActiveJobId("");
          const message =
            data.error && typeof data.error === "string"
              ? data.error
              : "Rewrite job failed.";
          if (!silent) {
            pushToast("error", message);
          }
          return "stop";
        }
        return "continue";
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load job status.";
        setIsGenerating(false);
        setActiveJobId("");
        setJobStatus((prev) =>
          prev ? { ...prev, status: "error", error: message } : prev
        );
        if (!silent) {
          pushToast("error", message);
        }
        return "stop";
      }
    },
    [mergeJobMessages, pushToast]
  );

  useEffect(() => {
    if (!EMAIL_JOBS_ENABLED) {
      return;
    }
    if (!activeJobId) {
      stopPolling();
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const outcome = await refreshJobStatus(activeJobId);
      if (cancelled) return;
      if (outcome === "continue") {
        pollTimerRef.current = window.setTimeout(poll, JOB_POLL_INTERVAL);
      } else {
        stopPolling();
      }
    };

    stopPolling();
    poll();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeJobId, refreshJobStatus, stopPolling]);

  const handleGenerateEmails = useCallback(async () => {
    const trimmedSubject = subject.trim();
    const trimmedBody = emailBody.trim();
    if (!trimmedSubject) {
      pushToast("error", "Subject is required before generating drafts.");
      return;
    }
    if (!trimmedBody) {
      pushToast("error", "Body is required before generating drafts.");
      return;
    }
    if (bodyMissingDraft) {
      pushToast("error", "Body must include {{draft}}.");
      return;
    }
    if (!hasValidToValue || invalidToChips.length > 0) {
      pushToast("error", "Fix recipient emails before generating.");
      return;
    }
    if (!hasValidContactEmail) {
      pushToast("error", "Load at least one contact with a valid email.");
      return;
    }

    const contactsPayload = contactsWithEmails.map((contact) => {
      const normalized = { ...contact };
      const name = resolveContactName(contact);
      if (name) {
        if (!normalized.name) {
          normalized.name = name;
        }
        if (!normalized.full_name && !normalized.fullName) {
          normalized.full_name = name;
        }
      }
      const emailValue = resolveContactEmail(contact);
      if (emailValue && !normalized.email) {
        normalized.email = emailValue;
      }
      delete normalized.__contactId;
      return normalized;
    });

    const expectedTotal = contactsPayload.length;

    const serialisedTo = Array.isArray(toChips)
      ? toChips.filter((item) => item && typeof item === "string").join(", ")
      : typeof toChips === "string"
      ? toChips
      : "";
    const templatePayload = {
      to: serialisedTo,
      subject: trimmedSubject,
      body: trimmedBody,
      repeat: { over: "contacts", as: "contact" },
    };
    const studentContext = studentName || studentSchool
      ? { name: studentName || null, school: studentSchool || null }
      : null;
    const dataset = {
      student: studentContext,
      role: campaignRole || null,
      company: campaignCompany || null,
      contacts: contactsPayload,
    };
    const rewriteGuide = buildRewriteGuide(trimmedBody);
    const options = {
      batchSize: Math.max(DEFAULT_BATCH_SIZE, contactsPayload.length || 1),
      dryRun: true,
      rewriteGuide,
    };

    if (EMAIL_JOBS_ENABLED) {
      stopPolling();
      setActiveJobId("");
    }
    setJobStatus(null);
    setAiResults([]);
    setIsGenerating(true);
    setIsSendingBatch(false);

    const endpoint = EMAIL_JOBS_ENABLED ? "/api/email-jobs" : "/api/email-rewrite";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: { ...templatePayload, rewriteGuide },
          dataset: { ...dataset, rewriteGuide },
          options,
        }),
      });
      const textResponse = await response.text();
      let data;
      try {
        data = textResponse ? JSON.parse(textResponse) : null;
      } catch {
        data = null;
      }

      if (EMAIL_JOBS_ENABLED && response.status === 202) {
        const jobId =
          typeof data?.jobId === "string"
            ? data.jobId
            : data?.id != null
            ? String(data.id)
            : "";
        if (!jobId) {
          throw new Error("Rewrite service did not return a job ID.");
        }
        const progress =
          data?.progress && typeof data.progress === "object"
            ? data.progress
            : {
                done: 0,
                total: expectedTotal,
                percent: expectedTotal ? 0 : 0,
              };
        setJobStatus({
          id: jobId,
          status: data?.status ?? "queued",
          stage:
            typeof data?.stage === "string" && data.stage
              ? data.stage
              : "queued",
          detail:
            typeof data?.detail === "string" && data.detail
              ? data.detail
              : "Waiting for rewrite to start.",
          progress,
          previews: [],
          error: null,
          sendSummary: { sent: 0, failed: 0 },
        });
        setActiveJobId(jobId);
        pushToast(
          "info",
          "Rewrite job queued. You'll see updates here as drafts complete."
        );
        return;
      }

      if (!response.ok) {
        const message =
          (data && typeof data === "object" && data.error) ||
          response.statusText ||
          "Failed to generate drafts.";
        throw new Error(message);
      }

      const emails = Array.isArray(data?.emails) ? data.emails : [];
      const sendOutcomes = Array.isArray(data?.sendResults)
        ? data.sendResults.filter((item) => item && typeof item === "object")
        : [];

      if (emails.length === 0) {
        setAiResults([]);
        setJobStatus({
          id: data?.jobId ? String(data.jobId) : "",
          status: "ready",
          stage: "done",
          detail: "No drafts were returned.",
          progress: {
            done: expectedTotal,
            total: expectedTotal,
            percent: expectedTotal ? 100 : 0,
          },
          previews: [],
          error: null,
          sendSummary: { sent: 0, failed: 0 },
        });
        setIsGenerating(false);
        pushToast("info", "No drafts returned.");
        return;
      }

      const results = emails.map((item, index) => {
        const toValue = normaliseRecipientList(item?.to);
        const outcome = sendOutcomes.find(
          (entry) =>
            normaliseRecipientList(
              entry?.to ?? entry?.recipient ?? ""
            ) === toValue
        );
        const status = outcome
          ? outcome.success
            ? "sent"
            : "failed"
          : "drafted";
        return {
          id: item?.id ? String(item.id) : `${index}-${toValue}`,
          to: toValue,
          subject: item?.subject ?? "",
          body: item?.body ?? "",
          excluded: false,
          isEditing: false,
          status,
          error:
            outcome && !outcome.success
              ? outcome.error
                ? String(outcome.error)
                : "Failed to send"
              : "",
        };
      });

      setAiResults(results);

      const sendSummary =
        sendOutcomes.length > 0
          ? sendOutcomes.reduce(
              (acc, outcome) => {
                if (outcome?.success) {
                  acc.sent += 1;
                } else {
                  acc.failed += 1;
                }
                return acc;
              },
              { sent: 0, failed: 0 }
            )
          : null;

      const resolvedTotal = results.length || expectedTotal;

      setJobStatus({
        id: data?.jobId ? String(data.jobId) : "",
        status: "ready",
        stage: "done",
        detail: "Drafts generated.",
        progress: {
          done: resolvedTotal,
          total: resolvedTotal,
          percent: resolvedTotal ? 100 : 0,
        },
        previews: [],
        error: null,
        sendSummary:
          sendSummary ?? {
            sent: 0,
            failed: 0,
          },
      });

      pushToast(
        "success",
        `Generated ${results.length} draft${results.length === 1 ? "" : "s"}.`
      );
      if (sendSummary) {
        if (sendSummary.sent > 0) {
          pushToast(
            "success",
            `Queued ${sendSummary.sent} email${sendSummary.sent === 1 ? "" : "s"} for delivery.`
          );
        }
        if (sendSummary.failed > 0) {
          pushToast(
            "error",
            `${sendSummary.failed} email${sendSummary.failed === 1 ? "" : "s"} failed to send.`
          );
        }
      }

      setIsGenerating(false);
    } catch (error) {
      setActiveJobId("");
      setIsGenerating(false);
      const message =
        error instanceof Error ? error.message : "Failed to generate drafts.";
      setJobStatus((prev) =>
        prev ? { ...prev, status: "error", error: message } : prev
      );
      pushToast("error", message);
      stopPolling();
    }
  }, [
    campaignCompany,
    campaignRole,
    bodyMissingDraft,
    contactsWithEmails,
    emailBody,
    hasValidContactEmail,
    hasValidToValue,
    invalidToChips,
    pushToast,
    stopPolling,
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

  const handleSendBatch = useCallback(async () => {
    if (!EMAIL_JOBS_ENABLED) {
      pushToast("info", "Background jobs are disabled.");
      return;
    }
    const jobId = jobStatus?.id;
    if (!jobId) {
      pushToast("info", "Generate drafts before sending emails.");
      return;
    }
    if (isSendingBatch) {
      return;
    }
    setIsSendingBatch(true);
    try {
      const response = await fetch(`/api/email-jobs/${jobId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: DEFAULT_BATCH_SIZE,
          paceMs: 250,
        }),
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!response.ok) {
        const message =
          (data && typeof data === "object" && data.error)
            ? data.error
            : response.statusText || "Failed to send batch.";
        throw new Error(message);
      }
      if (data?.totals) {
        setJobStatus((prev) =>
          prev
            ? {
                ...prev,
                sendSummary: {
                  sent:
                    typeof data.totals.sent === "number"
                      ? data.totals.sent
                      : prev.sendSummary.sent,
                  failed:
                    typeof data.totals.failed === "number"
                      ? data.totals.failed
                      : prev.sendSummary.failed,
                },
              }
            : prev
        );
      }
      await refreshJobStatus(jobId, { silent: true });
      const remaining =
        typeof data?.remaining === "number" ? data.remaining : null;
      const sentCount = typeof data?.sent === "number" ? data.sent : 0;
      const failedCount = typeof data?.failed === "number" ? data.failed : 0;
      if (remaining === 0) {
        pushToast("success", "All emails sent.");
      } else {
        const pieces = [`Sent ${sentCount} email${sentCount === 1 ? "" : "s"}`];
        if (failedCount > 0) {
          pieces.push(`${failedCount} failed`);
        }
        if (remaining != null) {
          pieces.push(`${remaining} remaining`);
        }
        pushToast("success", pieces.join(" • "));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send batch.";
      pushToast("error", message);
    } finally {
      setIsSendingBatch(false);
    }
  }, [isSendingBatch, jobStatus?.id, pushToast, refreshJobStatus]);

  const handleToggleResultExclude = useCallback((index) => {
    setAiResults((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, excluded: !item.excluded } : item
      )
    );
  }, []);

  const handleToggleResultEdit = useCallback((index) => {
    setAiResults((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  }, []);

  const handleResultFieldChange = useCallback((index, field, value) => {
    setAiResults((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const handleDownloadResults = useCallback(
    (format) => {
      if (!downloadsEnabled) {
        pushToast(
          "info",
          "Results are still streaming in. Please wait until the job completes."
        );
        return;
      }
      if (typeof window === "undefined") {
        pushToast("error", "Downloads are not supported in this environment.");
        return;
      }
      const rows = aiIncludedResults;
      if (!rows || rows.length === 0) {
        pushToast("info", "No drafts to download.");
        return;
      }
      try {
        let blob;
        let filename;
        if (format === "csv") {
          const header = ["to", "subject", "body"];
          const csvLines = [header.join(",")];
          for (const row of rows) {
            const values = header.map((key) => {
              const raw = row[key] ?? "";
              const normalized = String(raw).replace(/"/g, '""');
              return `"${normalized}"`;
            });
            csvLines.push(values.join(","));
          }
          blob = new Blob([csvLines.join("\n")], {
            type: "text/csv;charset=utf-8;",
          });
          filename = "email-drafts.csv";
        } else {
          const json = JSON.stringify(rows, null, 2);
          blob = new Blob([json], { type: "application/json" });
          filename = "email-drafts.json";
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        pushToast("success", `Downloaded drafts as ${format.toUpperCase()}.`);
      } catch (error) {
        pushToast("error", "Unable to download drafts.");
      }
    },
    [aiIncludedResults, downloadsEnabled, pushToast]
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
      profileUrl,
      pushToast,
      resetResponses,
      title,
      username,
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
    email: "Compose a template and generate AI drafts for your contacts.",
  };

  const resolvedViewRecords = useMemo(
    () => (activePage === "view" ? viewRecords : []),
    [activePage, viewRecords]
  );

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
              <EmailContactsTable
                contacts={emailContacts}
                selectedIds={emailRecipients}
                onSelectionChange={setEmailRecipients}
                onLoadContacts={handleLoadEmailContacts}
                loading={loadingContacts}
                resolveContactId={resolveContactId}
                resolveContactName={resolveContactName}
                formatProfileHref={formatProfileHref}
                computeEngagementStatus={computeEngagementStatus}
                formatTimestamp={formatTimestamp}
              />

              <div className="email-composer-card">
                <div className="ai-style-badge">AI writes in Canadian English.</div>
                <div className="composer-context">
                  <div className="field">
                    <label className="field-label" htmlFor="campaignRole">
                      Target role
                    </label>
                    <input
                      id="campaignRole"
                      className="text-input"
                      value={campaignRole}
                      onChange={(event) => setCampaignRole(event.target.value)}
                      placeholder="e.g. Product Manager"
                    />
                    <div className="helper-text">Used for {"{{role}}"}.</div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="campaignCompany">
                      Target company
                    </label>
                    <input
                      id="campaignCompany"
                      className="text-input"
                      value={campaignCompany}
                      onChange={(event) => setCampaignCompany(event.target.value)}
                      placeholder="e.g. Figma"
                    />
                    <div className="helper-text">Used for {"{{company}}"}.</div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="studentNameInput">
                      Your name
                    </label>
                    <input
                      id="studentNameInput"
                      className="text-input"
                      value={studentName}
                      onChange={(event) => setStudentName(event.target.value)}
                      placeholder="e.g. Alex Chen"
                    />
                    <div className="helper-text">Used for {"{{student.name}}"}.</div>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="studentSchoolInput">
                      Your school
                    </label>
                    <input
                      id="studentSchoolInput"
                      className="text-input"
                      value={studentSchool}
                      onChange={(event) => setStudentSchool(event.target.value)}
                      placeholder="e.g. University of Toronto"
                    />
                    <div className="helper-text">Used for {"{{student.school}}"}.</div>
                  </div>
                </div>
                <div className={`field${toErrorMessage ? " error" : ""}`}>
                  <label
                    className="field-label"
                    id="emailToInput-label"
                    htmlFor="emailToInput"
                  >
                    To
                  </label>
                  <div
                    className={`chip-input${toErrorMessage ? " error" : ""}`}
                    role="group"
                    aria-labelledby="emailToInput-label"
                  >
                    {toChips.map((chip, index) => {
                      const isToken = chip === "{{contact.email}}";
                      const isInvalid = invalidToChips.includes(chip);
                      return (
                        <span
                          key={`${chip}-${index}`}
                          className={`chip${isToken ? " token" : ""}${isInvalid ? " invalid" : ""}`}
                        >
                          <span>{chip}</span>
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => handleRemoveChip(index)}
                            aria-label={`Remove recipient ${chip}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    <input
                      id="emailToInput"
                      className="chip-input-field"
                      value={toInputValue}
                      onChange={(event) => setToInputValue(event.target.value)}
                      onKeyDown={handleToInputKeyDown}
                      onBlur={handleToInputBlur}
                      placeholder="Type an email and press Enter"
                      autoComplete="off"
                    />
                  </div>
                  <div className={`validation-text${toErrorMessage ? " error" : ""}`}>
                    {toErrorMessage || "Use Enter to add addresses or {{contact.email}}."}
                  </div>
                </div>

                <div className="placeholder-toolbar">
                  <span className="placeholder-label">Placeholders</span>
                  <div className="placeholder-chip-row">
                    {placeholderLibrary.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="placeholder-chip"
                        onClick={() => handleInsertPlaceholder(item.token)}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="placeholder-chip add"
                      onClick={handleAddCustomPlaceholder}
                    >
                      Add custom placeholder…
                    </button>
                  </div>
                </div>

                <div className="composer-grid">
                  <div className="field">
                    <label className="field-label" htmlFor="subject">
                      Subject
                    </label>
                    <input
                      id="subject"
                      ref={subjectRef}
                      className="text-input"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      onKeyDown={handleSubjectKeyDown}
                      onFocus={() => setLastFocusedField("subject")}
                      placeholder="Subject"
                    />
                    <div className="helper-text">Characters: {subjectCharCount}</div>
                  </div>
                  <div className={`field double${bodyMissingDraft ? " warning" : ""}`}>
                    <label className="field-label" htmlFor="emailBody">
                      Body
                    </label>
                    <textarea
                      id="emailBody"
                      ref={bodyRef}
                      className="text-area"
                      value={emailBody}
                      onChange={(event) => setEmailBody(event.target.value)}
                      onFocus={() => setLastFocusedField("body")}
                      placeholder="Write your email template with placeholders"
                      rows={8}
                    />
                    <div className={`helper-text${bodyMissingDraft ? " error" : ""}`}>
                      {bodyMissingDraft
                        ? "Add {{draft}} so AI can complete the message."
                        : "Insert placeholders where needed. {{draft}} will be filled by AI."}
                    </div>
                  </div>
                </div>

                <div className="composer-actions">
                  <div className="composer-actions-left">
                    <button type="button" className="button secondary" onClick={handleSaveTemplate}>
                      Save as template
                    </button>
                    <button type="button" className="button tertiary" onClick={handleResetTemplate}>
                      Reset
                    </button>
                  </div>
                  <div className="composer-actions-right">
                    <div className="preview-selector">
                      <label htmlFor="previewContact">Preview contact</label>
                      <select
                        id="previewContact"
                        className="select-input"
                        value={previewContactId}
                        onChange={(event) => setPreviewContactId(event.target.value)}
                        disabled={emailContacts.length === 0}
                      >
                        {emailContacts.length === 0 ? (
                          <option value="">Load contacts to preview</option>
                        ) : (
                          emailContacts.map((contact) => {
                            const id = contact.__contactId || resolveContactId(contact);
                            if (!id) {
                              return null;
                            }
                            const name = resolveContactName(contact) || "Unknown contact";
                            const emailValue = resolveContactEmail(contact);
                            const label = emailValue ? `${name} (${emailValue})` : name;
                            return (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="button ghost"
                      onClick={handlePreviewTemplate}
                      disabled={emailContacts.length === 0}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={handleGenerateEmails}
                      disabled={!canGenerate || isGenerating}
                      aria-busy={isGenerating}
                    >
                      {isGenerating ? <IconLoader /> : null}
                      {isGenerating ? "Generating…" : "Generate with AI (dry run)"}
                    </button>
                  </div>
                </div>

                {previewContent && (
                  <div className="preview-panel" aria-live="polite">
                    <div className="preview-header">
                      <h3>Preview</h3>
                      {previewContact ? (
                        <span className="preview-contact-name">
                          {resolveContactName(previewContact)}
                        </span>
                      ) : null}
                    </div>
                    <div className="preview-meta">
                      <div>
                        <span className="preview-meta-label">To</span>
                        <span className="preview-meta-value">{previewContent.to || "—"}</span>
                      </div>
                      <div>
                        <span className="preview-meta-label">Subject</span>
                        <span className="preview-meta-value">{previewContent.subject || "—"}</span>
                      </div>
                    </div>
                    <pre className="preview-body">{previewContent.body || ""}</pre>
                  </div>
                )}
              </div>

              <AiResultsPanel
                results={aiResults}
                jobStatus={jobStatus}
                isGenerating={isGenerating}
                downloadsEnabled={downloadsEnabled}
                onDownload={handleDownloadResults}
                onToggleEdit={handleToggleResultEdit}
                onToggleExclude={handleToggleResultExclude}
                onFieldChange={handleResultFieldChange}
                onSendBatch={EMAIL_JOBS_ENABLED ? handleSendBatch : undefined}
                isSending={isSendingBatch}
              />
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
