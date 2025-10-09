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
  name: "John Doe",
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

const TEMPLATE_STORAGE_KEY = "rolodex-email-template";
const PLACEHOLDER_STORAGE_KEY = "rolodex-email-custom-placeholders";
const DEFAULT_TEMPLATE = {
  to: ["{{contact.email}}"],
  subject: "",
  body: "",
  role: "",
  company: "",
  studentName: "",
  studentSchool: "",
};
const DEFAULT_PREVIEW_MESSAGE = "[AI will write this]";
const DEFAULT_BATCH_SIZE = 10;

const BUILT_IN_PLACEHOLDERS = [
  { id: "contact.name", label: "[contact name]", token: "{{contact.name}}" },
  { id: "contact.email", label: "[contact email]", token: "{{contact.email}}" },
  { id: "company", label: "[company]", token: "{{company}}" },
  { id: "role", label: "[role]", token: "{{role}}" },
  { id: "student.name", label: "[your name]", token: "{{student.name}}" },
  { id: "student.school", label: "[your school]", token: "{{student.school}}" },
  { id: "draft", label: "[draft]", token: "{{draft}}" },
];

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
  const [emailBody, setEmailBody] = useState("");
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
  const [toChips, setToChips] = useState(() => [...DEFAULT_TEMPLATE.to]);
  const [toInputValue, setToInputValue] = useState("");
  const [customPlaceholders, setCustomPlaceholders] = useState([]);
  const [lastFocusedField, setLastFocusedField] = useState("body");
  const [previewContactId, setPreviewContactId] = useState("");
  const [previewContent, setPreviewContent] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignRole, setCampaignRole] = useState(DEFAULT_TEMPLATE.role);
  const [campaignCompany, setCampaignCompany] = useState(DEFAULT_TEMPLATE.company);
  const [studentName, setStudentName] = useState(DEFAULT_TEMPLATE.studentName);
  const [studentSchool, setStudentSchool] = useState(DEFAULT_TEMPLATE.studentSchool);
  const validationTimers = useRef({});
  const selectAllRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          const storedTo = Array.isArray(parsed.to)
            ? parsed.to.filter(Boolean).map(String)
            : typeof parsed.to === "string"
            ? parsed.to
                .split(/[,\n]/)
                .map((item) => item.trim())
                .filter(Boolean)
            : [];
          setToChips(storedTo.length > 0 ? storedTo : [...DEFAULT_TEMPLATE.to]);
          setSubject(parsed.subject ?? "");
          setEmailBody(parsed.body ?? "");
          setCampaignRole(parsed.role ?? DEFAULT_TEMPLATE.role);
          setCampaignCompany(parsed.company ?? DEFAULT_TEMPLATE.company);
          setStudentName(parsed.studentName ?? DEFAULT_TEMPLATE.studentName);
          setStudentSchool(parsed.studentSchool ?? DEFAULT_TEMPLATE.studentSchool);
        }
      }
    } catch (error) {
      console.warn("Failed to load stored email template", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(PLACEHOLDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomPlaceholders(
            parsed
              .filter((item) => item && typeof item === "object" && item.token && item.label)
              .map((item) => ({
                id: item.id || item.token,
                label: String(item.label),
                token: String(item.token),
              }))
          );
        }
      }
    } catch (error) {
      console.warn("Failed to load custom placeholders", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = {
      to: toChips,
      subject,
      body: emailBody,
      role: campaignRole,
      company: campaignCompany,
      studentName,
      studentSchool,
    };
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist template", error);
    }
  }, [campaignCompany, campaignRole, emailBody, studentName, studentSchool, subject, toChips]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(PLACEHOLDER_STORAGE_KEY, JSON.stringify(customPlaceholders));
    } catch (error) {
      console.warn("Failed to persist custom placeholders", error);
    }
  }, [customPlaceholders]);

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

  const addToChip = useCallback(
    (value) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) {
        return false;
      }
      if (trimmed === "{{contact.email}}") {
        setToChips((prev) => [...prev, trimmed]);
        return true;
      }
      if (!EMAIL_REGEX.test(trimmed)) {
        pushToast("error", "Enter a valid email or use {{contact.email}}.");
        return false;
      }
      setToChips((prev) => [...prev, trimmed]);
      return true;
    },
    [pushToast]
  );

  const handleToInputKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === "," || event.key === ";") {
        event.preventDefault();
        if (addToChip(toInputValue)) {
          setToInputValue("");
        }
        return;
      }
      if (event.key === "Backspace" && !toInputValue) {
        setToChips((prev) => prev.slice(0, -1));
      }
    },
    [addToChip, toInputValue]
  );

  const handleToInputBlur = useCallback(() => {
    if (addToChip(toInputValue)) {
      setToInputValue("");
    }
  }, [addToChip, toInputValue]);

  const handleRemoveChip = useCallback((index) => {
    setToChips((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleInsertPlaceholder = useCallback(
    (token) => {
      if (!token) {
        return;
      }
      const targetRef = lastFocusedField === "subject" ? subjectRef : bodyRef;
      const setter = lastFocusedField === "subject" ? setSubject : setEmailBody;
      const currentValue = lastFocusedField === "subject" ? subject : emailBody;
      const element = targetRef.current;
      if (!element) {
        setter((prev) => `${prev}${prev ? (prev.endsWith(" ") ? "" : " ") : ""}${token}`);
        return;
      }
      const start = element.selectionStart ?? currentValue.length;
      const end = element.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
      setter(nextValue);
      requestAnimationFrame(() => {
        element.focus();
        const cursor = start + token.length;
        element.setSelectionRange(cursor, cursor);
      });
    },
    [emailBody, lastFocusedField, subject]
  );

  const handleAddCustomPlaceholder = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const labelInput = window.prompt("Placeholder label", "");
    if (!labelInput) {
      return;
    }
    const pathInput = window.prompt("Data path (e.g., contact.website)", "");
    if (!pathInput) {
      return;
    }
    const label = labelInput.trim();
    const normalizedPath = pathInput.trim();
    if (!label || !normalizedPath) {
      pushToast("error", "Placeholder label and path are required.");
      return;
    }
    const cleanedPath = normalizedPath.replace(/^{{\s*/, "").replace(/\s*}}$/, "");
    const token = `{{${cleanedPath}}}`;
    if (
      customPlaceholders.some((item) => item.token === token) ||
      BUILT_IN_PLACEHOLDERS.some((item) => item.token === token)
    ) {
      pushToast("info", "Placeholder already exists.");
      return;
    }
    const id = `${cleanedPath}-${Date.now().toString(36)}`;
    setCustomPlaceholders((prev) => [...prev, { id, label, token }]);
    pushToast("success", "Placeholder added.");
  }, [customPlaceholders, pushToast]);

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

  const handleSaveTemplate = useCallback(() => {
    if (typeof window === "undefined") {
      pushToast("error", "Local storage is unavailable.");
      return;
    }
    const payload = {
      to: toChips,
      subject,
      body: emailBody,
      customPlaceholders,
      role: campaignRole,
      company: campaignCompany,
      studentName,
      studentSchool,
    };
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(PLACEHOLDER_STORAGE_KEY, JSON.stringify(customPlaceholders));
      pushToast("success", "Template saved to this browser.");
    } catch (error) {
      pushToast("error", "Unable to save the template.");
    }
  }, [
    campaignCompany,
    campaignRole,
    customPlaceholders,
    emailBody,
    pushToast,
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

  const handleResetTemplate = useCallback(() => {
    setToChips([...DEFAULT_TEMPLATE.to]);
    setSubject(DEFAULT_TEMPLATE.subject);
    setEmailBody(DEFAULT_TEMPLATE.body);
    setCampaignRole(DEFAULT_TEMPLATE.role);
    setCampaignCompany(DEFAULT_TEMPLATE.company);
    setStudentName(DEFAULT_TEMPLATE.studentName);
    setStudentSchool(DEFAULT_TEMPLATE.studentSchool);
    setToInputValue("");
    setPreviewContent(null);
    pushToast("info", "Template cleared.");
  }, [pushToast]);

  const placeholderLibrary = useMemo(() => {
    const seen = new Set();
    const combined = [...BUILT_IN_PLACEHOLDERS, ...customPlaceholders];
    return combined.filter((item) => {
      if (!item || !item.token) {
        return false;
      }
      const token = String(item.token);
      if (seen.has(token)) {
        return false;
      }
      seen.add(token);
      return true;
    });
  }, [customPlaceholders]);

  const invalidToChips = useMemo(
    () =>
      toChips.filter(
        (chip) =>
          chip &&
          chip !== "{{contact.email}}" &&
          !EMAIL_REGEX.test(chip)
      ),
    [toChips]
  );

  const toErrorMessage = useMemo(() => {
    if (invalidToChips.length === 0) {
      return "";
    }
    if (invalidToChips.length === 1) {
      return `${invalidToChips[0]} is not a valid email.`;
    }
    return `${invalidToChips.length} invalid email addresses.`;
  }, [invalidToChips]);

  const hasValidToValue = useMemo(
    () =>
      toChips.some(
        (chip) => chip === "{{contact.email}}" || (chip && EMAIL_REGEX.test(chip))
      ),
    [toChips]
  );

  const bodyMissingDraft = useMemo(
    () => !emailBody.toLowerCase().includes("{{draft}}"),
    [emailBody]
  );

  const subjectCharCount = useMemo(() => subject.length, [subject]);

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
    const templatePayload = {
      to: toChips,
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

    setIsGenerating(true);
    try {
      const response = await fetch("/api/email-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: { ...templatePayload, rewriteGuide },
          dataset: { ...dataset, rewriteGuide },
          options,
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
          (data && typeof data === "object" && data.error) ||
          response.statusText ||
          "Failed to generate drafts.";
        throw new Error(message);
      }
      const emails = Array.isArray(data?.emails) ? data.emails : [];
      if (emails.length === 0) {
        setAiResults([]);
        pushToast("info", "No drafts returned.");
        return;
      }
      setAiResults(
        emails.map((item, index) => ({
          id: `${index}-${item?.to ?? ""}`,
          to: item?.to ?? "",
          subject: item?.subject ?? "",
          body: item?.body ?? "",
          excluded: false,
          isEditing: false,
        }))
      );
      const sendSummary = Array.isArray(data?.sendResults)
        ? data.sendResults.reduce(
            (acc, item) => {
              if (!item) return acc;
              if (item.success) {
                acc.sent += 1;
              } else {
                acc.failed += 1;
              }
              return acc;
            },
            { sent: 0, failed: 0 }
          )
        : null;
      pushToast(
        "success",
        `Generated ${emails.length} draft${emails.length === 1 ? "" : "s"}.`
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate drafts.";
      pushToast("error", message);
    } finally {
      setIsGenerating(false);
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
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

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
    [aiIncludedResults, pushToast]
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
    email: "Compose a template and generate AI drafts for your contacts.",
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
              <div className="recipients-block">
                <div className="recipients-toolbar">
                  <span id="recipient-label" className="recipients-title">
                    Contacts
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
                            <label className="select-all-control">
                              <span className="select-all-label">Select all</span>
                              <input
                                ref={selectAllRef}
                                type="checkbox"
                                onChange={handleToggleSelectAll}
                                checked={allRecipientsSelected}
                                disabled={allRecipientIds.length === 0}
                                aria-label="Select all recipients"
                              />
                            </label>
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
                          const contactName = resolveContactName(contact) || normalizedId;
                          return (
                            <tr
                              key={normalizedId}
                              className={isSelected ? "selected" : ""}
                              onClick={(event) => handleRecipientRowClick(event, normalizedId)}
                            >
                              <td className="select-cell">
                                <button
                                  type="button"
                                  className={`select-toggle${isSelected ? " selected" : ""}`}
                                  onClick={() => handleToggleRecipient(normalizedId)}
                                  aria-pressed={isSelected}
                                  aria-label={
                                    isSelected
                                      ? `Deselect contact ${contactName}`
                                      : `Select contact ${contactName}`
                                  }
                                >
                                  <span className="select-indicator" />
                                </button>
                              </td>
                              <td>{normalizedId}</td>
                              <td>{resolveContactName(contact) || "—"}</td>
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

              {aiResults.length > 0 && (
                <div className="ai-results-panel">
                  <div className="ai-results-header">
                    <h3>AI Results</h3>
                    <div className="ai-results-actions">
                      <button
                        type="button"
                        className="button tertiary"
                        onClick={() => handleDownloadResults("json")}
                      >
                        Download JSON
                      </button>
                      <button
                        type="button"
                        className="button tertiary"
                        onClick={() => handleDownloadResults("csv")}
                      >
                        Download CSV
                      </button>
                    </div>
                  </div>
                  <div className="ai-results-list">
                    {aiResults.map((result, index) => (
                      <div
                        key={result.id || index}
                        className={`ai-result${result.excluded ? " excluded" : ""}`}
                      >
                        <div className="ai-result-header">
                          <h4>Contact {index + 1}</h4>
                          <div className="ai-result-buttons">
                            <button
                              type="button"
                              className="button tertiary"
                              onClick={() => handleToggleResultEdit(index)}
                            >
                              {result.isEditing ? "Done" : "Edit"}
                            </button>
                            <button
                              type="button"
                              className={`button ghost${result.excluded ? " active" : ""}`}
                              onClick={() => handleToggleResultExclude(index)}
                            >
                              {result.excluded ? "Include" : "Exclude"}
                            </button>
                          </div>
                        </div>
                        <div className="ai-result-field">
                          <span className="ai-result-label">To</span>
                          {result.isEditing ? (
                            <input
                              className="text-input"
                              value={result.to}
                              onChange={(event) =>
                                handleResultFieldChange(index, "to", event.target.value)
                              }
                            />
                          ) : (
                            <span className="ai-result-value">{result.to || "—"}</span>
                          )}
                        </div>
                        <div className="ai-result-field">
                          <span className="ai-result-label">Subject</span>
                          {result.isEditing ? (
                            <input
                              className="text-input"
                              value={result.subject}
                              onChange={(event) =>
                                handleResultFieldChange(index, "subject", event.target.value)
                              }
                            />
                          ) : (
                            <span className="ai-result-value">{result.subject || "—"}</span>
                          )}
                        </div>
                        <div className="ai-result-field">
                          <span className="ai-result-label">Body</span>
                          {result.isEditing ? (
                            <textarea
                              className="text-area"
                              value={result.body}
                              onChange={(event) =>
                                handleResultFieldChange(index, "body", event.target.value)
                              }
                              rows={6}
                            />
                          ) : (
                            <pre className="ai-result-body-text">{result.body || ""}</pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
