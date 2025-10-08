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

const DEFAULT_TEMPLATE = {
  to: "{{contact.email}}",
  subject: "Quick intro from {{student.name}}",
  body: "Hi {{contact.name}},\n\n{{draft}}\n\nBest,\n{{student.name}}",
  repeat: { over: "contacts", as: "contact" },
};

const DEFAULT_DATASET = {
  student: { name: "", school: "", track: "" },
  role: "",
  company: "",
  contacts: [
    {
      id: "sample-contact",
      name: "John Doe",
      email: "example@gmail.com",
      title: "CEO",
      company: "Company",
      role: "",
    },
  ],
  facts: {},
};

const PLACEHOLDER_GROUPS = [
  {
    id: "contact",
    label: "Contact",
    items: [
      { id: "contact-name", label: "[contact name]", token: "{{contact.name}}" },
      { id: "contact-email", label: "[contact email]", token: "{{contact.email}}" },
      { id: "contact-title", label: "[contact title]", token: "{{contact.title}}" },
    ],
  },
  {
    id: "company",
    label: "Company",
    items: [
      { id: "company", label: "[company]", token: "{{company}}" },
      { id: "company-domain", label: "[company domain]", token: "{{companyDomain}}" },
    ],
  },
  {
    id: "student",
    label: "Student",
    items: [
      { id: "student-name", label: "[your name]", token: "{{student.name}}" },
      { id: "student-school", label: "[your school]", token: "{{student.school}}" },
      { id: "student-track", label: "[your track]", token: "{{student.track}}" },
    ],
  },
  {
    id: "role",
    label: "Role",
    items: [{ id: "role", label: "[role]", token: "{{role}}" }],
  },
  {
    id: "special",
    label: "Special",
    items: [{ id: "draft", label: "[draft]", token: "{{draft}}", required: true }],
  },
];

const AUTOSAVE_KEY = "rolodex-email-composer";
const TEMPLATE_LIBRARY_KEY = "rolodex-email-templates";
const RECIPIENT_QUICK_LIMIT = 5;
const DRAFT_TOKEN_REGEX = /{{\s*draft\s*}}/i;

function parseRecipients(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  return String(value)
    .split(/,/) // allow spaces around comma handled later
    .map((item) => item.trim())
    .filter(Boolean);
}

function createFactRowsFromObject(facts) {
  const entries = Object.entries(facts || {});
  if (entries.length === 0) {
    return [
      {
        id: `fact-${Math.random().toString(36).slice(2)}`,
        company: "",
        facts: "",
      },
    ];
  }
  return entries.map(([company, values]) => ({
    id: `fact-${Math.random().toString(36).slice(2)}`,
    company,
    facts: Array.isArray(values) ? values.join("\n") : String(values ?? ""),
  }));
}

function convertFactRowsToObject(rows) {
  return rows.reduce((acc, row) => {
    const key = row.company.trim();
    if (!key) {
      return acc;
    }
    const valueLines = row.facts
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    acc[key] = valueLines;
    return acc;
  }, {});
}

function ensureContactIds(contacts) {
  return (contacts || []).map((contact) => {
    if (contact && typeof contact === "object" && "id" in contact && contact.id) {
      return contact;
    }
    return {
      id: `contact-${Math.random().toString(36).slice(2)}`,
      ...contact,
    };
  });
}

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
  const [subject, setSubject] = useState(DEFAULT_TEMPLATE.subject);
  const [message, setMessage] = useState(DEFAULT_TEMPLATE.body);
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
  const [toValues, setToValues] = useState(() =>
    DEFAULT_TEMPLATE.to ? [DEFAULT_TEMPLATE.to] : []
  );
  const [toInputValue, setToInputValue] = useState("");
  const [datasetState, setDatasetState] = useState(DEFAULT_DATASET);
  const [customPlaceholders, setCustomPlaceholders] = useState([]);
  const [factRows, setFactRows] = useState(() =>
    createFactRowsFromObject(DEFAULT_DATASET.facts)
  );
  const [previewContactId, setPreviewContactId] = useState(
    DEFAULT_DATASET.contacts[0]?.id ?? ""
  );
  const [localPreview, setLocalPreview] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [options, setOptions] = useState({ batchSize: 25, dryRun: true });
  const [excludedResultIds, setExcludedResultIds] = useState([]);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const rewriteUrl = process.env.NEXT_PUBLIC_N8N_REWRITE_URL;
  const contactsWithIds = datasetState.contacts;
  const placeholderPalette = useMemo(() => {
    if (customPlaceholders.length === 0) {
      return PLACEHOLDER_GROUPS;
    }
    return [
      ...PLACEHOLDER_GROUPS,
      { id: "custom", label: "Custom", items: customPlaceholders },
    ];
  }, [customPlaceholders]);
  const datasetPayload = useMemo(() => {
    const { contacts: _ignoreContacts, ...rest } = datasetState;
    const contacts = contactsWithIds.map(({ id, ...contact }) => ({ ...contact }));
    return {
      ...rest,
      contacts,
      facts: convertFactRowsToObject(factRows),
    };
  }, [contactsWithIds, datasetState, factRows]);
  const templatePayload = useMemo(() => {
    const sanitized = toValues.map((value) => value.trim()).filter(Boolean);
    const to = sanitized.length > 0 ? sanitized.join(", ") : DEFAULT_TEMPLATE.to;
    return {
      to,
      subject: subject.trim(),
      body: message,
      repeat: DEFAULT_TEMPLATE.repeat,
    };
  }, [message, subject, toValues]);
  const hasDraftToken = useMemo(() => DRAFT_TOKEN_REGEX.test(message), [message]);
  const quickRecipientOptions = useMemo(() => {
    return contactsWithIds
      .filter((contact) => contact.email && contact.email.trim())
      .slice(0, RECIPIENT_QUICK_LIMIT);
  }, [contactsWithIds]);
  const previewContact = useMemo(() => {
    if (contactsWithIds.length === 0) {
      return null;
    }
    return (
      contactsWithIds.find((contact) => contact.id === previewContactId) ||
      contactsWithIds[0]
    );
  }, [contactsWithIds, previewContactId]);

  useEffect(() => {
    if (!previewContact) {
      setLocalPreview(null);
    }
  }, [previewContact]);
  const validContacts = useMemo(
    () => datasetPayload.contacts.filter((contact) => contact.email?.trim()),
    [datasetPayload]
  );
  const autosaveStatus = isAutosaving ? "Saving…" : "Saved";
  const validationTimers = useRef({});
  const toInputRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const activeEditorRef = useRef(null);
  const activeEditorKeyRef = useRef(null);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsAutosaving(true);
    const handle = setTimeout(() => {
      try {
        const payload = {
          template: {
            to: toValues.join(", "),
            subject,
            body: message,
          },
          dataset: {
            ...datasetState,
            contacts: datasetState.contacts.map((contact) => ({ ...contact })),
            facts: convertFactRowsToObject(factRows),
          },
          customPlaceholders,
          options,
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.error("Failed to save email composer state", error);
      } finally {
        setIsAutosaving(false);
      }
    }, 900);
    return () => {
      clearTimeout(handle);
      setIsAutosaving(false);
    };
  }, [subject, message, toValues, datasetState, factRows, customPlaceholders, options]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed?.template) {
        if (typeof parsed.template.subject === "string") {
          setSubject(parsed.template.subject);
        }
        if (typeof parsed.template.body === "string") {
          setMessage(parsed.template.body);
        }
        if (parsed.template.to != null) {
          const recipients = parseRecipients(parsed.template.to);
          if (recipients.length > 0) {
            setToValues(recipients);
          }
        }
      }
      if (parsed?.dataset) {
        const contacts = ensureContactIds(parsed.dataset.contacts || []);
        setDatasetState((prev) => ({
          ...prev,
          ...parsed.dataset,
          contacts,
        }));
        setFactRows(createFactRowsFromObject(parsed.dataset.facts || {}));
        if (contacts.length > 0) {
          setPreviewContactId(contacts[0].id);
        }
      }
      if (Array.isArray(parsed?.customPlaceholders)) {
        setCustomPlaceholders(parsed.customPlaceholders);
      }
      if (parsed?.options) {
        setOptions((prev) => ({
          ...prev,
          ...parsed.options,
        }));
      }
    } catch (error) {
      console.error("Failed to load saved email composer", error);
    }
  }, []);

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

  const registerActiveEditor = useCallback((event, key) => {
    activeEditorRef.current = event?.target ?? null;
    activeEditorKeyRef.current = key;
  }, []);

  const insertTokenIntoField = useCallback((ref, setter, token) => {
    const element = ref?.current ?? activeEditorRef.current;
    if (!element) {
      setter((prev) => {
        const current = typeof prev === "string" ? prev : "";
        return current ? `${current} ${token}` : token;
      });
      return;
    }
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const value = element.value ?? "";
    const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`;
    setter(nextValue);
    const focusElement = () => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(focusElement);
    } else {
      focusElement();
    }
  }, []);

  const addRecipient = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setToValues((prev) => {
      if (prev.includes(trimmed)) {
        return prev;
      }
      return [...prev, trimmed];
    });
  }, []);

  const removeRecipient = useCallback((value) => {
    setToValues((prev) => prev.filter((item) => item !== value));
  }, []);

  const handleInsertPlaceholder = useCallback(
    (token) => {
      const targetKey = activeEditorKeyRef.current;
      if (targetKey === "to") {
        addRecipient(token);
        setToInputValue("");
        if (toInputRef.current) {
          toInputRef.current.focus();
        }
        return;
      }
      if (targetKey === "subject") {
        insertTokenIntoField(subjectRef, setSubject, token);
        return;
      }
      insertTokenIntoField(bodyRef, setMessage, token);
    },
    [addRecipient, insertTokenIntoField]
  );

  const handleToKeyDown = useCallback(
    (event) => {
      if ((event.key === "Enter" || event.key === "," || event.key === "Tab") && !event.shiftKey) {
        const value = toInputValue.trim();
        if (value) {
          event.preventDefault();
          addRecipient(value);
          setToInputValue("");
        }
      } else if (event.key === "Backspace" && !toInputValue) {
        event.preventDefault();
        setToValues((prev) => prev.slice(0, -1));
      }
    },
    [addRecipient, toInputValue]
  );

  const handleToInputBlur = useCallback(() => {
    const value = toInputValue.trim();
    if (value) {
      addRecipient(value);
      setToInputValue("");
    }
  }, [addRecipient, toInputValue]);

  const handleToggleRecipient = useCallback(
    (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      setToValues((prev) => {
        if (prev.includes(trimmed)) {
          return prev.filter((item) => item !== trimmed);
        }
        return [...prev, trimmed];
      });
    },
    []
  );

  const handleAddCustomPlaceholder = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const labelInput = window.prompt("Placeholder label", "[placeholder]");
    if (!labelInput) {
      return;
    }
    const trimmedLabel = labelInput.trim();
    if (!trimmedLabel) {
      return;
    }
    const pathInput = window.prompt("Data path (e.g., contact.website)", "contact.");
    if (!pathInput) {
      return;
    }
    const cleanedPath = pathInput.replace(/^{+|}+$/g, "").trim();
    if (!cleanedPath) {
      return;
    }
    const normalizedLabel = trimmedLabel.startsWith("[")
      ? trimmedLabel
      : `[${trimmedLabel}]`;
    const token = `{{${cleanedPath}}}`;
    const placeholder = {
      id: `custom-${Math.random().toString(36).slice(2)}`,
      label: normalizedLabel,
      token,
    };
    setCustomPlaceholders((prev) => [...prev, placeholder]);
    pushToast("success", `${normalizedLabel} added.`);
  }, [pushToast]);

  const handleStudentChange = useCallback((field, value) => {
    setDatasetState((prev) => ({
      ...prev,
      student: { ...prev.student, [field]: value },
    }));
  }, []);

  const handleDatasetValueChange = useCallback((field, value) => {
    setDatasetState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleContactFieldChange = useCallback((id, field, value) => {
    setDatasetState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      ),
    }));
  }, []);

  const handleAddContactRow = useCallback(() => {
    setDatasetState((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          id: `contact-${Math.random().toString(36).slice(2)}`,
          name: "",
          email: "",
          title: "",
          company: "",
          role: "",
        },
      ],
    }));
  }, []);

  const handleRemoveContactRow = useCallback((id) => {
    setDatasetState((prev) => {
      if (prev.contacts.length <= 1) {
        return {
          ...prev,
          contacts: prev.contacts.map((contact) =>
            contact.id === id
              ? { ...contact, name: "", email: "", title: "", company: "", role: "" }
              : contact
          ),
        };
      }
      return {
        ...prev,
        contacts: prev.contacts.filter((contact) => contact.id !== id),
      };
    });
    setPreviewContactId((prevId) => (prevId === id ? "" : prevId));
  }, []);

  const handleFactRowChange = useCallback((id, field, value) => {
    setFactRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  const handleAddFactRow = useCallback(() => {
    setFactRows((prev) => [
      ...prev,
      { id: `fact-${Math.random().toString(36).slice(2)}`, company: "", facts: "" },
    ]);
  }, []);

  const handleRemoveFactRow = useCallback((id) => {
    setFactRows((prev) => {
      if (prev.length <= 1) {
        return prev.map((row) =>
          row.id === id ? { ...row, company: "", facts: "" } : row
        );
      }
      return prev.filter((row) => row.id !== id);
    });
  }, []);

  const resolveTemplateValue = useCallback(
    (input, contact) => {
      if (!input) {
        return "";
      }
      const scope = {
        ...datasetPayload,
        contact: contact ? { ...contact } : {},
      };
      return input.replace(/{{\s*([^}]+)\s*}}/g, (match, rawPath) => {
        const path = rawPath.trim();
        if (!path) {
          return "";
        }
        if (path === "draft") {
          return "[AI will write this]";
        }
        const segments = path.split(".");
        let current = scope;
        for (const segment of segments) {
          if (current == null) {
            current = undefined;
            break;
          }
          current = current[segment];
        }
        if (current == null) {
          return "";
        }
        if (Array.isArray(current)) {
          return current.join(", ");
        }
        return String(current);
      });
    },
    [datasetPayload]
  );

  const handlePreviewTemplate = useCallback(() => {
    const contact = previewContact ?? null;
    const preview = {
      to: resolveTemplateValue(templatePayload.to, contact),
      subject: resolveTemplateValue(templatePayload.subject, contact),
      body: resolveTemplateValue(templatePayload.body, contact),
    };
    setLocalPreview(preview);
    setAiError("");
    pushToast("info", "Preview refreshed.");
  }, [previewContact, resolveTemplateValue, templatePayload, pushToast]);

  const handleBatchSizeChange = useCallback((event) => {
    const value = Number(event.target.value);
    setOptions((prev) => ({
      ...prev,
      batchSize: Number.isNaN(value) || value <= 0 ? undefined : value,
    }));
  }, []);

  const handleDryRunToggle = useCallback((event) => {
    const checked = event.target.checked;
    setOptions((prev) => ({ ...prev, dryRun: checked }));
  }, []);

  const handleGenerateAi = useCallback(async () => {
    setAiError("");
    if (!templatePayload.subject) {
      const messageText = "Subject is required before generating.";
      setAiError(messageText);
      pushToast("error", messageText);
      return;
    }
    if (!templatePayload.body.trim()) {
      const messageText = "Body is required before generating.";
      setAiError(messageText);
      pushToast("error", messageText);
      return;
    }
    if (!hasDraftToken) {
      const messageText = "Body must include {{draft}}.";
      setAiError(messageText);
      pushToast("error", messageText);
      return;
    }
    if (validContacts.length === 0) {
      const messageText = "Add at least one contact with an email.";
      setAiError(messageText);
      pushToast("error", messageText);
      return;
    }
    if (!rewriteUrl) {
      const messageText = "AI rewrite URL is not configured.";
      setAiError(messageText);
      pushToast("error", messageText);
      return;
    }
    setIsGeneratingAi(true);
    try {
      const endpoint = `${rewriteUrl.replace(/\/$/, "")}/webhook/email-rewrite`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templatePayload,
          dataset: datasetPayload,
          options,
        }),
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        const messageText = "Could not parse AI output";
        setAiResults([
          {
            id: `error-${Date.now()}`,
            to: "",
            subject: "",
            body: text,
            error: messageText,
          },
        ]);
        throw new Error(messageText);
      }
      if (!response.ok) {
        const messageText =
          (data && typeof data === "object" && data.error) ||
          response.statusText ||
          "Request failed";
        throw new Error(messageText);
      }
      if (!data || !Array.isArray(data.emails)) {
        const messageText = "Could not parse AI output";
        setAiResults([
          {
            id: `error-${Date.now()}`,
            to: "",
            subject: "",
            body: text,
            error: messageText,
          },
        ]);
        throw new Error(messageText);
      }
      const normalized = data.emails.map((item, index) => {
        if (!item || typeof item !== "object") {
          return {
            id: `email-${index}-${Math.random().toString(36).slice(2)}`,
            to: "",
            subject: "",
            body: "",
            error: "Could not parse AI output",
          };
        }
        const id =
          item.id ?? `email-${index}-${Math.random().toString(36).slice(2)}`;
        return {
          id,
          to: item.to ?? "",
          subject: item.subject ?? "",
          body: item.body ?? "",
          error: !item.to || !item.subject || !item.body ? "Incomplete email" : "",
        };
      });
      setAiResults(normalized);
      setExcludedResultIds([]);
      setAiError("");
      pushToast("success", "AI draft ready.");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to generate email";
      setAiError(messageText);
      pushToast("error", messageText);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [
    datasetPayload,
    hasDraftToken,
    options,
    pushToast,
    rewriteUrl,
    templatePayload,
    validContacts,
  ]);

  const handleResultFieldChange = useCallback((id, field, value) => {
    setAiResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, [field]: value, error: "" } : result
      )
    );
  }, []);

  const handleToggleResultExclusion = useCallback((id) => {
    setExcludedResultIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const entry = {
      template: templatePayload,
      placeholders: placeholderPalette.flatMap((group) => group.items),
      dataset: datasetPayload,
      savedAt: new Date().toISOString(),
    };
    try {
      const raw = window.localStorage.getItem(TEMPLATE_LIBRARY_KEY);
      let stored = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            stored = parsed;
          }
        } catch {
          stored = [];
        }
      }
      const updated = [entry, ...stored].slice(0, 12);
      window.localStorage.setItem(TEMPLATE_LIBRARY_KEY, JSON.stringify(updated));
      pushToast("success", "Template saved.");
    } catch (error) {
      console.error("Failed to save template", error);
      pushToast("error", "Unable to save template.");
    }
  }, [datasetPayload, placeholderPalette, pushToast, templatePayload]);

  const handleResetTemplate = useCallback(() => {
    setSubject(DEFAULT_TEMPLATE.subject);
    setMessage(DEFAULT_TEMPLATE.body);
    setToValues(DEFAULT_TEMPLATE.to ? [DEFAULT_TEMPLATE.to] : []);
    pushToast("info", "Template reset to defaults.");
  }, [pushToast]);

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

      if (trimmedContactId && action !== "create") {
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
    [contactId, email, fullName, location, message, profileUrl, pushToast, resetResponses, subject, title, username]
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
    email: "Compose personalised templates with placeholders and previews.",
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
              <div className="email-composer">
                <div className="email-layout">
                  <div className="email-main">
                    <section className="composer-section email-header-section">
                      <div className="composer-grid">
                        <div className="field">
                          <label className="field-label" htmlFor="fromMailbox">
                            From mailbox
                          </label>
                          <input
                            id="fromMailbox"
                            className="text-input"
                            value="mailbox@campusloops.ai"
                            readOnly
                            aria-readonly="true"
                          />
                          <div className="helper-text">Connected via Gmail.</div>
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="toRecipients">
                            To
                          </label>
                          <div
                            id="toRecipients"
                            className="recipient-input"
                            onClick={(event) => registerActiveEditor(event, "to")}
                          >
                            {toValues.map((value) => (
                              <span className="recipient-chip" key={value}>
                                <button
                                  type="button"
                                  onClick={() => removeRecipient(value)}
                                  aria-label={`Remove recipient ${value}`}
                                >
                                  <span>{value}</span>
                                  <span aria-hidden="true">×</span>
                                </button>
                              </span>
                            ))}
                            <input
                              ref={toInputRef}
                              type="text"
                              value={toInputValue}
                              onChange={(event) => setToInputValue(event.target.value)}
                              onKeyDown={handleToKeyDown}
                              onBlur={handleToInputBlur}
                              onFocus={(event) => registerActiveEditor(event, "to")}
                              placeholder="Add recipient or token"
                              className="recipient-text-input"
                            />
                          </div>
                          <div className="helper-text">
                            Press Enter or comma to add; tokens insert as chips.
                          </div>
                        </div>
                      </div>
                      {quickRecipientOptions.length > 0 && (
                        <div
                          className="quick-recipient-row"
                          role="group"
                          aria-label="Recently added emails"
                        >
                          <span className="quick-recipient-label">Quick add:</span>
                          {quickRecipientOptions.map((contact) => {
                            const emailValue = contact.email?.trim();
                            if (!emailValue) {
                              return null;
                            }
                            const checked = toValues.includes(emailValue);
                            const label = contact.name
                              ? `${contact.name} (${emailValue})`
                              : emailValue;
                            return (
                              <label
                                key={contact.id}
                                className="quick-recipient-option"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleRecipient(emailValue)}
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="composer-section placeholder-section">
                      <div className="section-heading">
                        <h3>Drag and drop placeholders</h3>
                        <button
                          type="button"
                          className="chip-button add-placeholder"
                          onClick={handleAddCustomPlaceholder}
                        >
                          Add placeholder…
                        </button>
                      </div>
                      <div className="placeholder-groups">
                        {placeholderPalette.map((group) => (
                          <div key={group.id} className="placeholder-group">
                            <h4>{group.label}</h4>
                            <div className="placeholder-chip-row">
                              {group.items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`chip-button${item.required ? " required" : ""}`}
                                  onClick={() => handleInsertPlaceholder(item.token)}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="composer-section">
                      <div className="field">
                        <label className="field-label" htmlFor="email-subject">
                          Subject
                        </label>
                        <input
                          id="email-subject"
                          ref={subjectRef}
                          className="text-input"
                          value={subject}
                          onChange={(event) => setSubject(event.target.value)}
                          onFocus={(event) => registerActiveEditor(event, "subject")}
                          onClick={(event) => registerActiveEditor(event, "subject")}
                          placeholder="Subject with tokens"
                        />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="email-body">
                          Body
                        </label>
                        <textarea
                          id="email-body"
                          ref={bodyRef}
                          className="text-area"
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          onFocus={(event) => registerActiveEditor(event, "body")}
                          onClick={(event) => registerActiveEditor(event, "body")}
                          placeholder="Write your template. Include {{draft}} for the AI."
                          rows={10}
                        />
                        {!hasDraftToken && (
                          <div className="draft-banner" role="alert">
                            <IconAlert />
                            <span>Include {'{{draft}}'} so the AI can fill in the draft.</span>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="composer-section actions-section">
                      <div className="action-button-row">
                        <button
                          type="button"
                          className="button tertiary"
                          onClick={handleSaveTemplate}
                        >
                          Save as template
                        </button>
                        <button
                          type="button"
                          className="button ghost"
                          onClick={handleResetTemplate}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={handlePreviewTemplate}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          onClick={handleGenerateAi}
                          disabled={isGeneratingAi}
                          aria-busy={isGeneratingAi}
                        >
                          {isGeneratingAi ? <IconLoader /> : null}
                          {isGeneratingAi
                            ? "Generating…"
                            : options.dryRun
                            ? "Generate with AI (dry run)"
                            : "Generate with AI"}
                        </button>
                      </div>
                      <div className="options-row">
                        <label className="option-field" htmlFor="batchSize">
                          Batch size
                          <input
                            id="batchSize"
                            type="number"
                            min="1"
                            className="text-input number-input"
                            value={options.batchSize ?? ""}
                            onChange={handleBatchSizeChange}
                          />
                        </label>
                        <label className="option-field checkbox" htmlFor="dryRun">
                          <input
                            id="dryRun"
                            type="checkbox"
                            checked={options.dryRun ?? false}
                            onChange={handleDryRunToggle}
                          />
                          <span>Dry run</span>
                        </label>
                        <span className="autosave-indicator" aria-live="polite">
                          {autosaveStatus}
                        </span>
                      </div>
                    </section>

                    <section className="composer-section context-section">
                      <h3>Context</h3>
                      <div className="context-grid email-context-grid">
                        <div className="field">
                          <label className="field-label" htmlFor="studentName">
                            Student name
                          </label>
                          <input
                            id="studentName"
                            className="text-input"
                            value={datasetState.student?.name ?? ""}
                            onChange={(event) =>
                              handleStudentChange("name", event.target.value)
                            }
                            placeholder="Your name"
                          />
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="studentSchool">
                            Student school
                          </label>
                          <input
                            id="studentSchool"
                            className="text-input"
                            value={datasetState.student?.school ?? ""}
                            onChange={(event) =>
                              handleStudentChange("school", event.target.value)
                            }
                            placeholder="Your school"
                          />
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="studentTrack">
                            Student track
                          </label>
                          <input
                            id="studentTrack"
                            className="text-input"
                            value={datasetState.student?.track ?? ""}
                            onChange={(event) =>
                              handleStudentChange("track", event.target.value)
                            }
                            placeholder="Your track"
                          />
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="roleField">
                            Role
                          </label>
                          <input
                            id="roleField"
                            className="text-input"
                            value={datasetState.role ?? ""}
                            onChange={(event) =>
                              handleDatasetValueChange("role", event.target.value)
                            }
                            placeholder="Role you’re targeting"
                          />
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="companyField">
                            Company
                          </label>
                          <input
                            id="companyField"
                            className="text-input"
                            value={datasetState.company ?? ""}
                            onChange={(event) =>
                              handleDatasetValueChange("company", event.target.value)
                            }
                            placeholder="Company name"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="composer-section facts-section">
                      <div className="section-heading">
                        <h3>Facts</h3>
                        <button
                          type="button"
                          className="button tertiary"
                          onClick={handleAddFactRow}
                        >
                          Add fact set
                        </button>
                      </div>
                      <div className="fact-list">
                        {factRows.map((row) => (
                          <div key={row.id} className="fact-row">
                            <div className="field">
                              <label className="field-label" htmlFor={`fact-company-${row.id}`}>
                                Company / topic
                              </label>
                              <input
                                id={`fact-company-${row.id}`}
                                className="text-input"
                                value={row.company}
                                onChange={(event) =>
                                  handleFactRowChange(row.id, "company", event.target.value)
                                }
                                placeholder="Houzz"
                              />
                            </div>
                            <div className="field">
                              <label className="field-label" htmlFor={`fact-values-${row.id}`}>
                                Facts (one per line)
                              </label>
                              <textarea
                                id={`fact-values-${row.id}`}
                                className="text-area"
                                value={row.facts}
                                onChange={(event) =>
                                  handleFactRowChange(row.id, "facts", event.target.value)
                                }
                                rows={3}
                                placeholder={"Marketplace for home design"}
                              />
                            </div>
                            <button
                              type="button"
                              className="button ghost remove-fact"
                              onClick={() => handleRemoveFactRow(row.id)}
                              aria-label="Remove fact set"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="composer-section contacts-section">
                      <div className="section-heading">
                        <h3>Contacts</h3>
                        <button
                          type="button"
                          className="button tertiary"
                          onClick={handleAddContactRow}
                        >
                          Add contact
                        </button>
                      </div>
                      <div
                        className="table-scroll email-contacts-table"
                        role="group"
                        aria-label="Email contacts"
                      >
                        <table className="view-table">
                          <thead>
                            <tr>
                              <th scope="col">Name</th>
                              <th scope="col">Email</th>
                              <th scope="col">Title</th>
                              <th scope="col">Company</th>
                              <th scope="col">Role</th>
                              <th scope="col" className="contact-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contactsWithIds.length === 0 ? (
                              <tr>
                                <td colSpan={6}>
                                  <p className="preview-placeholder">
                                    Add contacts to personalise your email.
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              contactsWithIds.map((contact, index) => {
                                const trimmedEmail = contact.email ?? "";
                                const normalizedEmail = trimmedEmail.trim();
                                const emailMissing = normalizedEmail.length === 0;
                                const emailInvalid = Boolean(normalizedEmail) &&
                                  !EMAIL_REGEX.test(normalizedEmail);
                                const emailError = emailMissing
                                  ? "Email is required."
                                  : emailInvalid
                                  ? "Enter a valid email."
                                  : "";
                                const contactLabel =
                                  contact.name?.trim() ||
                                  (normalizedEmail ? normalizedEmail : `Contact ${index + 1}`);
                                return (
                                  <tr key={contact.id}>
                                    <td>
                                      <div className="table-field">
                                        <label
                                          className="field-label"
                                          htmlFor={`contact-name-${contact.id}`}
                                        >
                                          Contact name
                                        </label>
                                        <input
                                          id={`contact-name-${contact.id}`}
                                          className="text-input"
                                          value={contact.name ?? ""}
                                          placeholder="e.g., Aiko"
                                          onChange={(event) =>
                                            handleContactFieldChange(
                                              contact.id,
                                              "name",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <div className="table-field">
                                        <label
                                          className="field-label"
                                          htmlFor={`contact-email-${contact.id}`}
                                        >
                                          Contact email
                                        </label>
                                        <input
                                          id={`contact-email-${contact.id}`}
                                          className={`text-input${emailError ? " invalid" : ""}`}
                                          value={contact.email ?? ""}
                                          placeholder="name@company.com"
                                          aria-invalid={Boolean(emailError)}
                                          onChange={(event) =>
                                            handleContactFieldChange(
                                              contact.id,
                                              "email",
                                              event.target.value
                                            )
                                          }
                                        />
                                        {emailError ? (
                                          <span className="helper-text error">{emailError}</span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="table-field">
                                        <label
                                          className="field-label"
                                          htmlFor={`contact-title-${contact.id}`}
                                        >
                                          Contact title
                                        </label>
                                        <input
                                          id={`contact-title-${contact.id}`}
                                          className="text-input"
                                          value={contact.title ?? ""}
                                          placeholder="e.g., Editor"
                                          onChange={(event) =>
                                            handleContactFieldChange(
                                              contact.id,
                                              "title",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <div className="table-field">
                                        <label
                                          className="field-label"
                                          htmlFor={`contact-company-${contact.id}`}
                                        >
                                          Company
                                        </label>
                                        <input
                                          id={`contact-company-${contact.id}`}
                                          className="text-input"
                                          value={contact.company ?? ""}
                                          placeholder="e.g., Houzz"
                                          onChange={(event) =>
                                            handleContactFieldChange(
                                              contact.id,
                                              "company",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <div className="table-field">
                                        <label
                                          className="field-label"
                                          htmlFor={`contact-role-${contact.id}`}
                                        >
                                          Role
                                        </label>
                                        <input
                                          id={`contact-role-${contact.id}`}
                                          className="text-input"
                                          value={contact.role ?? ""}
                                          placeholder="Relationship"
                                          onChange={(event) =>
                                            handleContactFieldChange(
                                              contact.id,
                                              "role",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </td>
                                    <td className="contact-actions">
                                      <button
                                        type="button"
                                        className="button ghost compact"
                                        onClick={() => handleRemoveContactRow(contact.id)}
                                        aria-label={`Remove ${contactLabel}`}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                  <div className="email-preview-pane">
                    <section className="composer-section preview-section">
                      <div className="section-heading">
                        <h3>Preview</h3>
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="previewContact">
                          Preview contact
                        </label>
                        <select
                          id="previewContact"
                          className="text-input select-input"
                          value={previewContact?.id ?? ""}
                          onChange={(event) => setPreviewContactId(event.target.value)}
                          disabled={contactsWithIds.length === 0}
                        >
                          {contactsWithIds.length === 0 ? (
                            <option value="">No contacts available</option>
                          ) : (
                            contactsWithIds.map((contact) => {
                              const label = contact.name
                                ? contact.email
                                  ? `${contact.name} (${contact.email})`
                                  : contact.name
                                : contact.email || "Contact";
                              return (
                                <option key={contact.id} value={contact.id}>
                                  {label}
                                </option>
                              );
                            })
                          )}
                        </select>
                        <div className="helper-text">
                          {contactsWithIds.length === 0
                            ? "Add a contact to enable preview."
                            : "Click Preview to render tokens for this contact."}
                        </div>
                      </div>
                      {localPreview ? (
                        <div className="preview-card">
                          <div className="preview-field">
                            <span className="preview-label">To</span>
                            <pre>{localPreview.to || "—"}</pre>
                          </div>
                          <div className="preview-field">
                            <span className="preview-label">Subject</span>
                            <pre>{localPreview.subject || "—"}</pre>
                          </div>
                          <div className="preview-field">
                            <span className="preview-label">Body</span>
                            <pre>{localPreview.body || "—"}</pre>
                          </div>
                        </div>
                      ) : (
                        <p className="preview-placeholder">
                          Use Preview to fill tokens with sample data.
                        </p>
                      )}
                    </section>

                    <section className="composer-section ai-results-section">
                      <div className="section-heading">
                        <h3>AI results</h3>
                      </div>
                      {aiError && (
                        <div className="preview-error" role="alert">
                          {aiError}
                        </div>
                      )}
                      {aiResults.length === 0 ? (
                        <p className="preview-placeholder">
                          Generate with AI to see personalised drafts.
                        </p>
                      ) : (
                        <div className="ai-result-list">
                          {aiResults.map((result) => {
                            const excluded = excludedResultIds.includes(result.id);
                            return (
                              <article
                                key={result.id}
                                className={`ai-result-card${excluded ? " excluded" : ""}`}
                              >
                                <header className="ai-result-header">
                                  <h4>{result.to || "Draft"}</h4>
                                  <button
                                    type="button"
                                    className="button ghost"
                                    onClick={() => handleToggleResultExclusion(result.id)}
                                  >
                                    {excluded ? "Include" : "Exclude"}
                                  </button>
                                </header>
                                {result.error && (
                                  <div className="preview-error" role="alert">
                                    {result.error}
                                  </div>
                                )}
                                <div className="field">
                                  <label className="field-label" htmlFor={`result-to-${result.id}`}>
                                    To
                                  </label>
                                  <input
                                    id={`result-to-${result.id}`}
                                    className="text-input"
                                    value={result.to}
                                    onChange={(event) =>
                                      handleResultFieldChange(result.id, "to", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label className="field-label" htmlFor={`result-subject-${result.id}`}>
                                    Subject
                                  </label>
                                  <input
                                    id={`result-subject-${result.id}`}
                                    className="text-input"
                                    value={result.subject}
                                    onChange={(event) =>
                                      handleResultFieldChange(
                                        result.id,
                                        "subject",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label className="field-label" htmlFor={`result-body-${result.id}`}>
                                    Body
                                  </label>
                                  <textarea
                                    id={`result-body-${result.id}`}
                                    className="text-area"
                                    rows={6}
                                    value={result.body}
                                    onChange={(event) =>
                                      handleResultFieldChange(
                                        result.id,
                                        "body",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </div>
            </div>
          )}

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
