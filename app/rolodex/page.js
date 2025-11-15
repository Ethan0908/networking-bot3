"use client";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoverLetterWorkspace } from "../cover-letter/workspace";
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

function IconRefresh(props) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function IconMenu(props) {
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
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconGoogle(props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={props.className}
      role="img"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.94 0 6.6 1.7 8.12 3.13l5.9-5.74C34.92 3.25 29.92 1 24 1 14.74 1 6.9 6.16 3.24 14.02l6.9 5.35C11.6 13.4 17.2 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.65c-.55 2.82-2.22 5.2-4.72 6.8l7.25 5.63C43.79 36.9 46.5 31.3 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M24 47c6.48 0 11.9-2.13 15.87-5.8l-7.25-5.63C30.7 37.8 27.59 38.5 24 38.5c-6.8 0-12.41-3.9-15.86-9.35l-6.9 7.34C6.9 41.84 14.74 47 24 47z"
      />
      <path
        fill="#34A853"
        d="M10.14 28.86c-1.08-3.2-1.08-6.5 0-9.7L3.24 13.8C-.47 20.64-.47 29.36 3.24 36.2l6.9-7.34z"
      />
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
    1,
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
const TABLE_PAGE_SIZES = [5, 10, 25, 50, 100];
const IMPORT_EDITABLE_FIELDS = new Set([
  "full_name",
  "title",
  "company",
  "location",
  "profile_url",
  "email",
]);

const BUILT_IN_PLACEHOLDERS = [
  { id: "contact.name", label: "[contact name]", token: "{{contact.name}}" },
  { id: "contact.email", label: "[contact email]", token: "{{contact.email}}" },
  { id: "company", label: "[company]", token: "{{company}}" },
  { id: "role", label: "[role]", token: "{{role}}" },
  { id: "student.name", label: "[your name]", token: "{{student.name}}" },
  { id: "student.school", label: "[your school]", token: "{{student.school}}" },
  { id: "draft", label: "[draft]", token: "{{draft}}" },
];

const RESPONSE_RECIPIENT_KEYS = [
  "to",
  "recipient",
  "recipients",
  "email",
  "address",
];
const RESPONSE_SUBJECT_KEYS = ["subject", "title", "headline"];
const RESPONSE_CONTENT_KEYS = ["body", "html", "text", "content", "message"];

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

function extractImportRecords(payload) {
  if (!payload) {
    return [];
  }
  if (typeof payload === "string") {
    return [payload];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === "object") {
    if (Array.isArray(payload.results)) {
      return payload.results;
    }
    if (Array.isArray(payload.contacts)) {
      return payload.contacts;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.records)) {
      return payload.records;
    }
    return [payload];
  }
  return [];
}

function normalizeCsvHeader(header, index) {
  if (header == null) {
    return `field_${index}`;
  }
  const trimmed = String(header).trim();
  if (!trimmed) {
    return `field_${index}`;
  }
  const normalized = trimmed.toLowerCase();
  switch (normalized) {
    case "full name":
    case "name":
      return "full_name";
    case "email address":
      return "email";
    case "linkedin":
    case "linkedin url":
    case "linkedin profile":
      return "profile_url";
    case "profile link":
      return "profile_url";
    case "id":
    case "contact id":
      return "contact_id";
    default: {
      const snake = normalized
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (snake === "") {
        return `field_${index}`;
      }
      if (snake === "email_address") {
        return "email";
      }
      if (snake === "profile") {
        return "profile_url";
      }
      return snake;
    }
  }
}

function parseCsvRows(csvText) {
  if (!csvText || typeof csvText !== "string") {
    return [];
  }
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    if (inQuotes) {
      if (char === "\"") {
        if (csvText[index + 1] === "\"") {
          current += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char === "\r") {
      // Ignore carriage returns and rely on newline handling.
    } else {
      current += char;
    }
  }

  row.push(current);
  rows.push(row);
  return rows;
}

function parseCsvRecords(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return [];
  }
  const headerRow = rows.shift();
  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  const seen = new Map();
  const headers = headerRow.map((cell, index) => {
    const base = normalizeCsvHeader(cell, index);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) {
      return base;
    }
    return `${base}_${count + 1}`;
  });

  const records = [];
  for (const row of rows) {
    if (!row || row.length === 0) {
      continue;
    }
    const record = {};
    let hasValue = false;
    for (let index = 0; index < headers.length; index += 1) {
      const key = headers[index] ?? `field_${index}`;
      const raw = index < row.length ? row[index] : "";
      const value = raw == null ? "" : String(raw).trim();
      if (value) {
        hasValue = true;
      }
      if (!(key in record)) {
        record[key] = value;
      }
    }
    if (hasValue) {
      records.push(record);
    }
  }
  return records;
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

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    if (value == null) {
      return "";
    }
    if (typeof value === "object") {
      return Object.prototype.toString.call(value);
    }
    return String(value);
  }
}

function isEmailLikeRecord(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const keys = Object.keys(value);
  const hasRecipient = keys.some((key) =>
    RESPONSE_RECIPIENT_KEYS.includes(key),
  );
  const hasSubject = keys.some((key) => RESPONSE_SUBJECT_KEYS.includes(key));
  const hasContent = keys.some((key) => RESPONSE_CONTENT_KEYS.includes(key));
  return hasRecipient || hasSubject || hasContent;
}

function extractRewriteResponseEmails(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const rows = [];
  const seen = new Set();
  const visited = typeof WeakSet === "function" ? new WeakSet() : null;

  const extractFirstString = (value, localVisited) => {
    if (value == null) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value !== "object") {
      return "";
    }
    const tracker =
      localVisited || (typeof WeakSet === "function" ? new WeakSet() : null);
    if (tracker) {
      if (tracker.has(value)) {
        return "";
      }
      tracker.add(value);
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const candidate = extractFirstString(item, tracker);
        if (candidate) {
          return candidate;
        }
      }
      return "";
    }
    const entries = Object.entries(value);
    for (const [, nested] of entries) {
      if (typeof nested === "string" && nested) {
        return nested;
      }
    }
    for (const [, nested] of entries) {
      const candidate = extractFirstString(nested, tracker);
      if (candidate) {
        return candidate;
      }
    }
    return "";
  };

  const resolveRecordField = (record, keys) => {
    if (!record || typeof record !== "object") {
      return "";
    }
    const normalizedKeys = keys.map((key) => String(key).toLowerCase());
    for (const [rawKey, value] of Object.entries(record)) {
      const normalized = String(rawKey).toLowerCase();
      if (!normalizedKeys.includes(normalized)) {
        continue;
      }
      const extracted = extractFirstString(value);
      if (extracted) {
        return extracted;
      }
    }
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        const extracted = extractFirstString(record[key]);
        if (extracted) {
          return extracted;
        }
      }
    }
    return "";
  };

  const visit = (value, path = "$") => {
    if (value && typeof value === "object") {
      if (visited) {
        if (visited.has(value)) {
          return;
        }
        visited.add(value);
      }
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        visit(item, `${path}[${index}]`);
      });
      return;
    }
    if (value && typeof value === "object") {
      if (isEmailLikeRecord(value)) {
        pushRow(value, path);
      }
      Object.entries(value).forEach(([key, nested]) => {
        if (nested && (typeof nested === "object" || Array.isArray(nested))) {
          visit(nested, `${path}.${key}`);
        }
      });
    }
  };

  const pushRow = (candidate, path) => {
    const jsonString = safeStringify(candidate);
    if (!jsonString || seen.has(jsonString)) {
      return;
    }
    seen.add(jsonString);
    rows.push({
      path,
      json: jsonString,
      email: resolveRecordField(candidate, RESPONSE_RECIPIENT_KEYS),
      subject: resolveRecordField(candidate, RESPONSE_SUBJECT_KEYS),
      body: resolveRecordField(candidate, RESPONSE_CONTENT_KEYS),
    });
  };

  visit(payload);
  return rows;
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
  const { preserveDraft = false, draftReplacement = DEFAULT_PREVIEW_MESSAGE } =
    options;
  return template.replace(
    /{{\s*([^{}\s]+(?:\.[^{}\s]+)*)\s*}}/g,
    (match, path) => {
      if (path === "draft") {
        return preserveDraft ? match : draftReplacement;
      }
      const value = getValueAtPath(context, path);
      if (value == null) {
        return match;
      }
      return String(value);
    },
  );
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
  const { data: authSession, status: authStatus } = useSession();
  const sessionEmail =
    typeof authSession?.user?.email === "string"
      ? authSession.user.email.trim()
      : "";
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
  const [gmailStatus, setGmailStatus] = useState(() =>
    authStatus === "authenticated" && authSession?.user
      ? "connected"
      : "disconnected",
  );
  const [toasts, setToasts] = useState([]);
  const [activePage, setActivePage] = useState("create");
  const [isMobileTabsOpen, setIsMobileTabsOpen] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: "", profileUrl: "" });
  const [fieldStatus, setFieldStatus] = useState({
    email: null,
    profileUrl: null,
  });
  const [fieldTouched, setFieldTouched] = useState({
    email: false,
    profileUrl: false,
  });
  const [contactHighlight, setContactHighlight] = useState(false);
  const [theme, setTheme] = useState("light");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLink, setSearchLink] = useState("");
  const [searchKeywordError, setSearchKeywordError] = useState("");
  const [searchLinkError, setSearchLinkError] = useState("");
  const [emailContacts, setEmailContacts] = useState(() => [
    { ...SAMPLE_CONTACT_RECORD, __contactId: SAMPLE_CONTACT_ID },
  ]);
  const [isSampleEmailContacts, setIsSampleEmailContacts] = useState(true);
  const [viewContacts, setViewContacts] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [csvFileContent, setCsvFileContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvFileInputKey, setCsvFileInputKey] = useState(0);
  const [csvImportError, setCsvImportError] = useState("");
  const [importResults, setImportResults] = useState([]);
  const [importSelection, setImportSelection] = useState([]);
  const [importSubmitStatus, setImportSubmitStatus] = useState("idle");
  const [importSort, setImportSort] = useState({
    key: "local_id",
    direction: "asc",
  });
  const [importPageSize, setImportPageSize] = useState(5);
  const [importPageIndex, setImportPageIndex] = useState(0);
  const [viewPageSize, setViewPageSize] = useState(5);
  const [viewPageIndex, setViewPageIndex] = useState(0);
  const [viewSort, setViewSort] = useState({
    key: "local_id",
    direction: "asc",
  });
  const [emailPageSize, setEmailPageSize] = useState(5);
  const [emailPageIndex, setEmailPageIndex] = useState(0);
  const [emailSort, setEmailSort] = useState({ key: "local_id", direction: "asc" });
  const [viewSearchTerm, setViewSearchTerm] = useState("");
  const [emailSearchTerm, setEmailSearchTerm] = useState("");
  const [toChips, setToChips] = useState(() => [...DEFAULT_TEMPLATE.to]);
  const [toInputValue, setToInputValue] = useState("");
  const [customPlaceholders, setCustomPlaceholders] = useState([]);
  const [lastFocusedField, setLastFocusedField] = useState("body");
  const [previewContactId, setPreviewContactId] = useState("");
  const [previewContent, setPreviewContent] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [sendResults, setSendResults] = useState([]);
  const [rewriteResponse, setRewriteResponse] = useState(null);
  const [manualEmailRows, setManualEmailRows] = useState([]);
  const [responseSending, setResponseSending] = useState({});
  const [responseBodyEdits, setResponseBodyEdits] = useState({});
  const [sendingDraft, setSendingDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignRole, setCampaignRole] = useState(DEFAULT_TEMPLATE.role);
  const [campaignCompany, setCampaignCompany] = useState(
    DEFAULT_TEMPLATE.company,
  );
  const [studentName, setStudentName] = useState(DEFAULT_TEMPLATE.studentName);
  const [studentSchool, setStudentSchool] = useState(
    DEFAULT_TEMPLATE.studentSchool,
  );
  const validationTimers = useRef({});
  const selectAllRef = useRef(null);
  const importSelectAllRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const importSubmitResetRef = useRef(null);
  const tabsWrapperRef = useRef(null);

  const clearImportSubmitReset = useCallback(() => {
    if (importSubmitResetRef.current) {
      clearTimeout(importSubmitResetRef.current);
      importSubmitResetRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearImportSubmitReset();
    };
  }, [clearImportSubmitReset]);

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
          setStudentSchool(
            parsed.studentSchool ?? DEFAULT_TEMPLATE.studentSchool,
          );
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
              .filter(
                (item) =>
                  item && typeof item === "object" && item.token && item.label,
              )
              .map((item) => ({
                id: item.id || item.token,
                label: String(item.label),
                token: String(item.token),
              })),
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
      window.localStorage.setItem(
        TEMPLATE_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.warn("Failed to persist template", error);
    }
  }, [
    campaignCompany,
    campaignRole,
    emailBody,
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PLACEHOLDER_STORAGE_KEY,
        JSON.stringify(customPlaceholders),
      );
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
    if (!fieldTouched.email) {
      return;
    }
    validationTimers.current.email &&
      clearTimeout(validationTimers.current.email);
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
      validationTimers.current.email &&
        clearTimeout(validationTimers.current.email);
    };
  }, [email, fieldTouched.email, runValidation]);

  useEffect(() => {
    if (!fieldTouched.profileUrl) {
      return;
    }
    validationTimers.current.profileUrl &&
      clearTimeout(validationTimers.current.profileUrl);
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
      validationTimers.current.profileUrl &&
        clearTimeout(validationTimers.current.profileUrl);
    };
  }, [profileUrl, fieldTouched.profileUrl, runValidation]);

  const handleBlur = useCallback(
    (field, value) => {
      setFieldTouched((prev) => ({ ...prev, [field]: true }));
      runValidation(field, value.trim());
    },
    [runValidation],
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
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
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
    [pushToast],
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
      const result = await signIn("google", {
        redirect: false,
        callbackUrl:
          typeof window !== "undefined" ? window.location.href : undefined,
      });
      if (result?.error) {
        throw new Error(result.error);
      }
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      throw new Error("No redirect URL returned.");
    } catch (error) {
      console.error("Failed to start Google sign-in", error);
      setGmailStatus("disconnected");
      pushToast("error", "Unable to start Google sign-in.");
    }
  }, [gmailStatus, pushToast]);

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
    [pushToast],
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
    [addToChip, toInputValue],
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
        setter(
          (prev) =>
            `${prev}${prev ? (prev.endsWith(" ") ? "" : " ") : ""}${token}`,
        );
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
    [emailBody, lastFocusedField, subject],
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
    const cleanedPath = normalizedPath
      .replace(/^{{\s*/, "")
      .replace(/\s*}}$/, "");
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

  const normalizeImportPayload = useCallback(
    (payload) => {
      const rawRecords = extractImportRecords(payload);
      const expanded = [];

      for (const item of rawRecords) {
        if (!item) {
          continue;
        }
        if (typeof item === "string") {
          expanded.push(...parseCsvRecords(item));
          continue;
        }
        if (typeof item === "object") {
          if (typeof item.data === "string") {
            const parsed = parseCsvRecords(item.data);
            if (parsed.length > 0) {
              expanded.push(...parsed);
              continue;
            }
          } else if (Array.isArray(item.data)) {
            let handled = false;
            for (const nested of item.data) {
              if (!nested) {
                continue;
              }
              if (typeof nested === "string") {
                expanded.push(...parseCsvRecords(nested));
                handled = true;
              } else if (typeof nested === "object") {
                expanded.push(nested);
                handled = true;
              }
            }
            if (handled) {
              continue;
            }
          }
          expanded.push(item);
        }
      }

      const timestamp = Date.now().toString(36);
      return expanded
        .filter((record) => record && typeof record === "object")
        .map((record, index) => {
          const baseRecord = { ...record };
          const contactIdValue = resolveContactId(baseRecord);
          const baseId =
            contactIdValue ||
            baseRecord.email ||
            baseRecord.profile_url ||
            baseRecord.profileUrl ||
            baseRecord.full_name ||
            baseRecord.fullName ||
            `row-${index}`;
          const rowId = `import-${baseId}-${timestamp}-${index}`;
          const raw =
            baseRecord.raw && typeof baseRecord.raw === "object"
              ? { ...baseRecord.raw }
              : { ...baseRecord };
          return {
            ...baseRecord,
            __rowId: rowId,
            contact_id:
              contactIdValue ||
              baseRecord.contact_id ||
              baseRecord.contactId ||
              "",
            local_id:
              baseRecord.local_id ??
              baseRecord.localId ??
              contactIdValue ??
              baseRecord.contact_id ??
              baseRecord.contactId ??
              "",
            full_name:
              baseRecord.full_name ??
              baseRecord.fullName ??
              baseRecord.name ??
              "",
            title: baseRecord.title ?? "",
            company: baseRecord.company ?? "",
            location: baseRecord.location ?? "",
            profile_url:
              baseRecord.profile_url ??
              baseRecord.profileUrl ??
              baseRecord.linkedin ??
              "",
            email: baseRecord.email ?? "",
            raw,
          };
        });
    },
    [resolveContactId],
  );

  const handleCsvFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      setCsvImportError("");
      if (!file) {
        setCsvFileContent("");
        setCsvFileName("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setCsvFileContent(result);
          setCsvFileName(file.name ?? "");
        } else {
          setCsvImportError("Unable to read CSV file.");
          setCsvFileContent("");
          setCsvFileName("");
          pushToast("error", "Unable to read CSV file.");
        }
      };
      reader.onerror = () => {
        setCsvImportError("Unable to read CSV file.");
        setCsvFileContent("");
        setCsvFileName("");
        pushToast("error", "Unable to read CSV file.");
      };
      reader.readAsText(file);
    },
    [pushToast],
  );

  const handleImportSort = useCallback(
    (columnId) => {
      clearImportSubmitReset();
      setImportSubmitStatus("idle");
      setImportSort((prev) => {
        if (prev.key === columnId) {
          return {
            key: columnId,
            direction: prev.direction === "asc" ? "desc" : "asc",
          };
        }
        return {
          key: columnId,
          direction: "asc",
        };
      });
    },
    [clearImportSubmitReset],
  );

  const handleViewSort = useCallback((columnId) => {
    setViewSort((prev) => {
      if (prev.key === columnId) {
        return {
          key: columnId,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: columnId,
        direction: "asc",
      };
    });
  }, []);

  const handleEmailSort = useCallback((columnId) => {
    setEmailSort((prev) => {
      if (prev.key === columnId) {
        return {
          key: columnId,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: columnId,
        direction: "asc",
      };
    });
  }, []);

  const handleToggleRecipient = useCallback((id) => {
    setEmailRecipients((prev) => {
      const normalizedId = String(id);
      return prev.includes(normalizedId)
        ? prev.filter((item) => item !== normalizedId)
        : [...prev, normalizedId];
    });
  }, []);

  const handleToggleImportRow = useCallback(
    (rowId) => {
      clearImportSubmitReset();
      setImportSubmitStatus("idle");
      const normalizedId = String(rowId);
      setImportSelection((prev) =>
        prev.includes(normalizedId)
          ? prev.filter((id) => id !== normalizedId)
          : [...prev, normalizedId],
      );
    },
    [clearImportSubmitReset],
  );

  const handleToggleImportSelectAll = useCallback(
    (ids) => {
      clearImportSubmitReset();
      setImportSubmitStatus("idle");
      const targetIds = Array.isArray(ids) && ids.length > 0
        ? ids.map(String)
        : importResults.map((record) => String(record.__rowId));
      if (targetIds.length === 0) {
        return;
      }
      setImportSelection((prev) => {
        const missing = targetIds.filter((id) => !prev.includes(id));
        if (missing.length === 0) {
          return prev.filter((id) => !targetIds.includes(id));
        }
        const next = new Set(prev);
        for (const id of targetIds) {
          next.add(id);
        }
        return Array.from(next);
      });
    },
    [clearImportSubmitReset, importResults],
  );

  const handleImportRowClick = useCallback(
    (event, rowId) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("input") ||
          event.target.closest("button") ||
          event.target.closest("a"))
      ) {
        return;
      }
      handleToggleImportRow(rowId);
    },
    [handleToggleImportRow],
  );

  const handleImportFieldChange = useCallback(
    (rowId, field, value) => {
      clearImportSubmitReset();
      setImportSubmitStatus("idle");
      setImportResults((prev) =>
        prev.map((record) => {
          if (String(record.__rowId) !== String(rowId)) {
            return record;
          }
          const normalizedField = field;
          const nextRaw = { ...(record.raw ?? {}) };
          nextRaw[normalizedField] = value;
          if (normalizedField === "full_name") {
            nextRaw.fullName = value;
            nextRaw.name = value;
          } else if (normalizedField === "profile_url") {
            nextRaw.profileUrl = value;
          } else if (normalizedField === "email") {
            nextRaw.email = value;
          } else if (normalizedField === "title") {
            nextRaw.title = value;
          } else if (normalizedField === "company") {
            nextRaw.company = value;
          } else if (normalizedField === "location") {
            nextRaw.location = value;
          }
          return {
            ...record,
            [normalizedField]: value,
            raw: nextRaw,
          };
        }),
      );
    },
    [clearImportSubmitReset],
  );

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
    [handleToggleRecipient],
  );

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
      window.localStorage.setItem(
        TEMPLATE_STORAGE_KEY,
        JSON.stringify(payload),
      );
      window.localStorage.setItem(
        PLACEHOLDER_STORAGE_KEY,
        JSON.stringify(customPlaceholders),
      );
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
          chip && chip !== "{{contact.email}}" && !EMAIL_REGEX.test(chip),
      ),
    [toChips],
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
        (chip) =>
          chip === "{{contact.email}}" || (chip && EMAIL_REGEX.test(chip)),
      ),
    [toChips],
  );

  const hasDraftToken = useMemo(
    () => emailBody.toLowerCase().includes("{{draft}}"),
    [emailBody],
  );

  const computeEngagementStatus = useCallback((record) => {
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
  }, []);

  const subjectCharCount = useMemo(() => subject.length, [subject]);

  const emailFilteredContacts = useMemo(() => {
    if (!Array.isArray(emailContacts) || emailContacts.length === 0) {
      return [];
    }
    const query = emailSearchTerm.trim().toLowerCase();
    if (!query) {
      return emailContacts;
    }
    return emailContacts.filter((contact) => {
      const values = [
        contact.local_id ?? contact.localId ?? null,
        contact.contact_id ?? contact.contactId ?? null,
        contact.__contactId || resolveContactId(contact),
        resolveContactName(contact),
        contact.title,
        contact.company,
        contact.location,
        contact.profile_url ?? contact.profileUrl,
        resolveContactEmail(contact),
        contact.last_contacted ??
          contact.last_messaged ??
          contact.lastMessaged ??
          contact.last_contacted_at ??
          "",
      ];
      const engagement = computeEngagementStatus(contact);
      if (engagement?.label) {
        values.push(engagement.label);
      }
      return values.some(
        (value) =>
          value && String(value).toLowerCase().includes(query),
      );
    });
  }, [
    computeEngagementStatus,
    emailContacts,
    emailSearchTerm,
    resolveContactEmail,
    resolveContactId,
    resolveContactName,
  ]);

  const emailTableState = useMemo(() => {
    if (!Array.isArray(emailFilteredContacts) || emailFilteredContacts.length === 0) {
      return {
        visibleRecords: [],
        totalRecords: 0,
        totalPages: 0,
        currentPageIndex: 0,
      };
    }
    const filtered = emailFilteredContacts;

    const getSortValue = (record) => {
      switch (emailSort.key) {
        case "local_id":
          return (
            record.local_id ??
            record.localId ??
            record.contact_id ??
            record.contactId ??
            record.id ??
            ""
          );
        case "full_name":
          return resolveContactName(record);
        case "title":
          return record.title ?? "";
        case "company":
          return record.company ?? "";
        case "location":
          return record.location ?? "";
        case "profile_url":
          return record.profile_url ?? record.profileUrl ?? "";
        case "email":
          return resolveContactEmail(record);
        case "engagement": {
          const candidate =
            record.last_contacted ??
            record.last_messaged ??
            record.lastMessaged ??
            record.last_contacted_at ??
            null;
          const parsed = candidate ? Date.parse(candidate) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
          const status = computeEngagementStatus(record);
          return status?.label ?? "";
        }
        default: {
          return resolveContactName(record);
        }
      }
    };

    const sorted = filtered.slice().sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);
      const direction = emailSort.direction === "asc" ? 1 : -1;
      if (typeof valueA === "number" && typeof valueB === "number") {
        if (valueA === valueB) {
          return 0;
        }
        return valueA < valueB ? -direction : direction;
      }
      const stringA = String(valueA ?? "").toLowerCase();
      const stringB = String(valueB ?? "").toLowerCase();
      if (stringA === stringB) {
        return 0;
      }
      return stringA < stringB ? -direction : direction;
    });

    const pageSize = TABLE_PAGE_SIZES.includes(emailPageSize)
      ? emailPageSize
      : TABLE_PAGE_SIZES[0];
    const totalRecords = sorted.length;
    const totalPages =
      totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize);
    const safePageIndex =
      totalPages === 0
        ? 0
        : Math.min(Math.max(emailPageIndex, 0), totalPages - 1);
    const start = safePageIndex * pageSize;
    const visibleRecords = sorted.slice(start, start + pageSize);

    return {
      visibleRecords,
      totalRecords,
      totalPages,
      currentPageIndex: safePageIndex,
      pageSize,
    };
  }, [
    computeEngagementStatus,
    emailFilteredContacts,
    emailPageIndex,
    emailPageSize,
    emailSort,
    resolveContactEmail,
    resolveContactName,
  ]);

  const importTableState = useMemo(() => {
    if (!Array.isArray(importResults) || importResults.length === 0) {
      return {
        visibleRecords: [],
        totalRecords: 0,
        totalPages: 0,
        currentPageIndex: 0,
        pageSize: TABLE_PAGE_SIZES[0],
      };
    }

    const getSortValue = (record) => {
      switch (importSort.key) {
        case "local_id":
          return (
            record.local_id ??
            record.localId ??
            record.contact_id ??
            record.contactId ??
            record.id ??
            ""
          );
        case "full_name":
          return record.full_name ?? record.fullName ?? record.name ?? "";
        case "title":
          return record.title ?? "";
        case "company":
          return record.company ?? "";
        case "location":
          return record.location ?? "";
        case "profile_url":
          return record.profile_url ?? record.profileUrl ?? "";
        case "email":
          return record.email ?? "";
        default:
          return record.full_name ?? record.fullName ?? record.name ?? "";
      }
    };

    const sorted = importResults.slice().sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);
      const direction = importSort.direction === "asc" ? 1 : -1;
      if (typeof valueA === "number" && typeof valueB === "number") {
        if (valueA === valueB) {
          return 0;
        }
        return valueA < valueB ? -direction : direction;
      }
      const stringA = String(valueA ?? "").toLowerCase();
      const stringB = String(valueB ?? "").toLowerCase();
      if (stringA === stringB) {
        return 0;
      }
      return stringA < stringB ? -direction : direction;
    });

    const pageSize = TABLE_PAGE_SIZES.includes(importPageSize)
      ? importPageSize
      : TABLE_PAGE_SIZES[0];
    const totalRecords = sorted.length;
    const totalPages =
      totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize);
    const safePageIndex =
      totalPages === 0
        ? 0
        : Math.min(Math.max(importPageIndex, 0), totalPages - 1);
    const start = safePageIndex * pageSize;
    const visibleRecords = sorted.slice(start, start + pageSize);

    return {
      visibleRecords,
      totalRecords,
      totalPages,
      currentPageIndex: safePageIndex,
      pageSize,
    };
  }, [importPageIndex, importPageSize, importResults, importSort]);

  const {
    visibleRecords: emailVisibleContacts,
    totalRecords: emailTotalRecords,
    totalPages: emailTotalPages,
    currentPageIndex: currentEmailPageIndex,
    pageSize: emailResolvedPageSize,
  } = emailTableState;

  const {
    visibleRecords: importVisibleRecords,
    totalRecords: importTotalRecords,
    totalPages: importTotalPages,
    currentPageIndex: currentImportPageIndex,
    pageSize: importResolvedPageSize,
  } = importTableState;

  const emailRecordCount = emailFilteredContacts.length;
  const importRecordCount = importResults.length;

  useEffect(() => {
    if (currentEmailPageIndex !== emailPageIndex) {
      setEmailPageIndex(currentEmailPageIndex);
    }
  }, [currentEmailPageIndex, emailPageIndex]);

  useEffect(() => {
    setEmailPageIndex(0);
  }, [emailPageSize, emailRecordCount, emailSearchTerm]);

  useEffect(() => {
    if (currentImportPageIndex !== importPageIndex) {
      setImportPageIndex(currentImportPageIndex);
    }
  }, [currentImportPageIndex, importPageIndex]);

  useEffect(() => {
    setImportPageIndex(0);
  }, [importPageSize, importRecordCount]);

  useEffect(() => {
    const allowed = new Set(
      importResults
        .map((record) => record?.__rowId)
        .filter((id) => id != null)
        .map((id) => String(id)),
    );
    setImportSelection((prev) => {
      const filtered = prev.filter((id) => allowed.has(String(id)));
      if (filtered.length === prev.length) {
        return prev;
      }
      return filtered;
    });
  }, [importResults]);

  const emailPageNumbers = useMemo(() => {
    if (emailTotalPages === 0) {
      return [];
    }
    const count = Math.min(emailTotalPages, 100);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [emailTotalPages]);

  const emailRangeStart =
    emailTotalRecords === 0 || emailVisibleContacts.length === 0
      ? 0
      : currentEmailPageIndex * emailResolvedPageSize + 1;
  const emailRangeEnd =
    emailTotalRecords === 0 || emailVisibleContacts.length === 0
      ? 0
      : currentEmailPageIndex * emailResolvedPageSize + emailVisibleContacts.length;

  const importPageNumbers = useMemo(() => {
    if (importTotalPages === 0) {
      return [];
    }
    const count = Math.min(importTotalPages, 100);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [importTotalPages]);

  const importRangeStart =
    importTotalRecords === 0 || importVisibleRecords.length === 0
      ? 0
      : currentImportPageIndex * importResolvedPageSize + 1;

  const importRangeEnd =
    importTotalRecords === 0 || importVisibleRecords.length === 0
      ? 0
      : currentImportPageIndex * importResolvedPageSize + importVisibleRecords.length;

  const allRecipientIds = useMemo(
    () =>
      emailContacts
        .map((contact) => contact.__contactId || resolveContactId(contact))
        .filter(Boolean)
        .map(String),
    [emailContacts, resolveContactId],
  );

  const displayedRecipientIds = useMemo(
    () =>
      emailVisibleContacts
        .map((contact) => contact.__contactId || resolveContactId(contact))
        .filter(Boolean)
        .map(String),
    [emailVisibleContacts, resolveContactId],
  );

  const displayedRecipientsSelected = useMemo(
    () =>
      displayedRecipientIds.length > 0 &&
      displayedRecipientIds.every((id) => emailRecipients.includes(id)),
    [displayedRecipientIds, emailRecipients],
  );

  const displayedRecipientsPartiallySelected = useMemo(
    () =>
      displayedRecipientIds.some((id) => emailRecipients.includes(id)) &&
      !displayedRecipientsSelected,
    [displayedRecipientIds, displayedRecipientsSelected, emailRecipients],
  );

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = displayedRecipientsPartiallySelected;
  }, [displayedRecipientsPartiallySelected]);

  const importVisibleIds = useMemo(
    () =>
      importVisibleRecords
        .map((record) => record?.__rowId)
        .filter((id) => id != null)
        .map((id) => String(id)),
    [importVisibleRecords],
  );

  const importSelectionSet = useMemo(
    () => new Set(importSelection.map((id) => String(id))),
    [importSelection],
  );

  const importDisplayedSelected = useMemo(
    () =>
      importVisibleIds.length > 0 &&
      importVisibleIds.every((id) => importSelectionSet.has(id)),
    [importSelectionSet, importVisibleIds],
  );

  const importDisplayedPartiallySelected = useMemo(
    () =>
      importVisibleIds.some((id) => importSelectionSet.has(id)) &&
      !importDisplayedSelected,
    [importDisplayedSelected, importSelectionSet, importVisibleIds],
  );

  useEffect(() => {
    if (!importSelectAllRef.current) {
      return;
    }
    importSelectAllRef.current.indeterminate = importDisplayedPartiallySelected;
  }, [importDisplayedPartiallySelected]);

  const importSelectionCount = importSelection.length;
  const importSelectionSummary =
    importSelectionCount > 0
      ? `${importSelectionCount} contact${importSelectionCount === 1 ? "" : "s"} selected.`
      : "No contacts selected.";
  const shouldShowImportResults =
    importResults.length > 0 || lastAction === "import";

  const handleToggleSelectAll = useCallback(
    (ids) => {
      const targetIds = Array.isArray(ids) && ids.length > 0 ? ids : allRecipientIds;
      if (targetIds.length === 0) {
        return;
      }
      setEmailRecipients((prev) => {
        const missing = targetIds.filter((id) => !prev.includes(id));
        if (missing.length === 0) {
          return prev.filter((id) => !targetIds.includes(id));
        }
        const next = new Set(prev);
        for (const id of targetIds) {
          next.add(id);
        }
        return Array.from(next);
      });
    },
    [allRecipientIds],
  );

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

  useEffect(() => {
    if (emailRecipients.length === 0) {
      return;
    }
    setEmailRecipients((prev) =>
      prev.filter((id) =>
        contactMap.has(id) && resolveContactEmail(contactMap.get(id)),
      ),
    );
  }, [contactMap, emailRecipients.length, resolveContactEmail]);

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
    [selectedContacts],
  );

  const hasValidContactEmail = useMemo(
    () => contactsWithEmails.length > 0,
    [contactsWithEmails],
  );

  const previewContact = useMemo(() => {
    if (!previewContactId) {
      return null;
    }
    return contactMap.get(String(previewContactId)) || null;
  }, [contactMap, previewContactId]);

  const aiIncludedResults = useMemo(
    () => aiResults.filter((result) => !result.excluded),
    [aiResults],
  );

  const hasManualRows = manualEmailRows.length > 0;

  const responseEmailRows = useMemo(() => {
    if (manualEmailRows.length > 0) {
      return manualEmailRows;
    }
    return extractRewriteResponseEmails(rewriteResponse);
  }, [manualEmailRows, rewriteResponse]);

  const rewriteResponseJson = useMemo(
    () => (rewriteResponse ? safeStringify(rewriteResponse) : ""),
    [rewriteResponse],
  );

  const showResponseSection = hasManualRows || Boolean(rewriteResponse);

  const templateReady = useMemo(() => {
    const trimmedSubject = subject.trim();
    const trimmedBody = emailBody.trim();
    if (!trimmedSubject || !trimmedBody) {
      return false;
    }
    if (!hasValidToValue || invalidToChips.length > 0) {
      return false;
    }
    if (!hasValidContactEmail) {
      return false;
    }
    return true;
  }, [
    emailBody,
    hasValidContactEmail,
    hasValidToValue,
    invalidToChips,
    subject,
  ]);

  const canGenerate = templateReady && !isGenerating;
  const canBuildTemplate = templateReady && !isGenerating;

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

  useEffect(() => {
    setResponseSending({});
    setResponseBodyEdits({});
  }, [manualEmailRows, rewriteResponse]);

  const handlePreviewTemplate = useCallback(() => {
    const contactCandidate =
      previewContact || contactsWithEmails[0] || emailContacts[0];
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
      .map((chip) =>
        chip === "{{contact.email}}" ? contactEmail || "[missing email]" : chip,
      )
      .join(", ");
    const studentContext =
      studentName || studentSchool
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
      contactCandidate.__contactId ||
      resolveContactId(contactCandidate) ||
      "preview";
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
    const studentContext =
      studentName || studentSchool
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

    setRewriteResponse(null);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/email-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "email",
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
        data = text ? { raw: text } : null;
      }
      setRewriteResponse(data ?? null);
      if (!response.ok) {
        const message =
          (data && typeof data === "object" && data.error) ||
          response.statusText ||
          "Failed to generate drafts.";
        throw new Error(message);
      }
      setManualEmailRows([]);
      const emails = Array.isArray(data?.emails) ? data.emails : [];
      if (emails.length === 0) {
        setAiResults([]);
        setSendResults([]);
        pushToast("info", "No drafts returned.");
        return;
      }
      const normalizedEmails = emails.map((item, index) => ({
        id: `${index}-${item?.to ?? ""}`,
        to: item?.to ?? "",
        subject: item?.subject ?? "",
        body: item?.body ?? "",
        excluded: false,
        isEditing: false,
      }));
      setAiResults(normalizedEmails);
      const timestamp = new Date().toISOString();
      const rawSendResults = Array.isArray(data?.sendResults)
        ? data.sendResults
        : [];
      const normalizedSendResults = normalizedEmails.map((item, index) => {
        const result = rawSendResults[index] ?? null;
        const toAddress =
          (result && typeof result.to === "string" && result.to.trim()) ||
          item.to ||
          "";
        return {
          id: item.id,
          to: toAddress,
          success: Boolean(result?.success),
          error: result?.error ? String(result.error) : "",
          lastAttemptedAt: result ? timestamp : null,
        };
      });
      setSendResults(normalizedSendResults);
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
            { sent: 0, failed: 0 },
          )
        : null;
      pushToast(
        "success",
        `Generated ${emails.length} draft${emails.length === 1 ? "" : "s"}.`,
      );
      if (sendSummary) {
        if (sendSummary.sent > 0) {
          pushToast(
            "success",
            `Queued ${sendSummary.sent} email${sendSummary.sent === 1 ? "" : "s"} for delivery.`,
          );
        }
        if (sendSummary.failed > 0) {
          pushToast(
            "error",
            `${sendSummary.failed} email${sendSummary.failed === 1 ? "" : "s"} failed to send.`,
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate drafts.";
      setAiResults([]);
      setSendResults([]);
      pushToast("error", message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    campaignCompany,
    campaignRole,
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

  const handleBuildTemplateEmails = useCallback(() => {
    const trimmedSubject = subject.trim();
    const trimmedBody = emailBody.trim();
    if (!trimmedSubject) {
      pushToast("error", "Subject is required before building emails.");
      return;
    }
    if (!trimmedBody) {
      pushToast("error", "Body is required before building emails.");
      return;
    }
    if (!hasValidToValue || invalidToChips.length > 0) {
      pushToast("error", "Fix recipient emails before building.");
      return;
    }
    if (!hasValidContactEmail) {
      pushToast("error", "Load at least one contact with a valid email.");
      return;
    }

    const studentContext =
      studentName || studentSchool
        ? { name: studentName || null, school: studentSchool || null }
        : null;

    const results = contactsWithEmails.map((contact, index) => {
      const normalizedContact = { ...contact };
      const contactName = resolveContactName(contact);
      const contactEmail = resolveContactEmail(contact);
      if (contactName) {
        if (!normalizedContact.name) {
          normalizedContact.name = contactName;
        }
        if (!normalizedContact.full_name && !normalizedContact.fullName) {
          normalizedContact.full_name = contactName;
        }
      }
      if (contactEmail && !normalizedContact.email) {
        normalizedContact.email = contactEmail;
      }
      const context = {
        contact: normalizedContact,
        company: campaignCompany || null,
        role: campaignRole || null,
        student: studentContext,
      };
      const toValue = toChips
        .map((chip) => {
          if (!chip) {
            return "";
          }
          if (chip === "{{contact.email}}") {
            return contactEmail || "";
          }
          if (chip.includes("{{")) {
            return replaceTemplateTokens(chip, context, {
              preserveDraft: false,
              draftReplacement: "",
            });
          }
          return chip;
        })
        .map((value) => (value ? value.trim() : ""))
        .filter((value) => value.length > 0)
        .join(", ");
      const resolvedSubject = replaceTemplateTokens(trimmedSubject, context, {
        preserveDraft: true,
      });
      const resolvedBody = replaceTemplateTokens(trimmedBody, context, {
        preserveDraft: false,
        draftReplacement: "",
      });
      const rawContactId =
        contact.__contactId || resolveContactId(contact) || index;
      const resultId = `manual-${rawContactId}`;
      return {
        id: resultId,
        to: toValue || contactEmail || "",
        subject: resolvedSubject,
        body: resolvedBody,
        excluded: false,
        isEditing: false,
      };
    });

    setManualEmailRows([]);
    if (results.length === 0) {
      pushToast("info", "Load at least one contact with a valid email.");
      return;
    }

    const manualRows = results.map((item) => {
      const emailValue = item.to ?? "";
      const subjectValue = item.subject ?? "";
      const bodyValue = item.body ?? "";
      return {
        email: emailValue,
        subject: subjectValue,
        body: bodyValue,
        json: {
          to: emailValue,
          subject: subjectValue,
          body: bodyValue,
        },
      };
    });

    setRewriteResponse(null);
    setManualEmailRows([]);
    setManualEmailRows(manualRows);
    setAiResults([]);
    setSendResults([]);
    setSendingDraft(null);
    pushToast(
      "success",
      `Prepared ${results.length} email${results.length === 1 ? "" : "s"} from your template.`,
    );
  }, [
    campaignCompany,
    campaignRole,
    contactsWithEmails,
    emailBody,
    hasValidContactEmail,
    hasValidToValue,
    invalidToChips,
    pushToast,
    resolveContactEmail,
    resolveContactId,
    resolveContactName,
    studentName,
    studentSchool,
    subject,
    toChips,
  ]);

  const handleToggleResultExclude = useCallback((index) => {
    setAiResults((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, excluded: !item.excluded } : item,
      ),
    );
  }, []);

  const handleToggleResultEdit = useCallback((index) => {
    setAiResults((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, isEditing: !item.isEditing } : item,
      ),
    );
  }, []);

  const handleResultFieldChange = useCallback((index, field, value) => {
    let updatedId = null;
    setAiResults((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex === index) {
          updatedId = item.id ?? updatedId;
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
    setSendResults((prev) =>
      prev.map((item, itemIndex) => {
        if (
          (updatedId && item.id === updatedId) ||
          (!updatedId && itemIndex === index)
        ) {
          return { ...item, success: false, error: "", lastAttemptedAt: null };
        }
        return item;
      }),
    );
  }, []);

  const sendResultMap = useMemo(() => {
    const map = new Map();
    sendResults.forEach((item, itemIndex) => {
      if (!item) {
        return;
      }
      const key = item.id ?? `draft-${item.index ?? itemIndex}`;
      map.set(key, item);
    });
    return map;
  }, [sendResults]);

  const handleSendDraft = useCallback(
    async (index, options = {}) => {
      const provider = options.provider === "gmail" ? "gmail" : "default";
      const draft = aiResults[index];
      if (!draft) {
        pushToast("error", "Unable to locate this draft.");
        return;
      }
      const recipient = (draft.to || "").trim();
      if (!recipient) {
        pushToast("error", "Add a recipient before sending.");
        return;
      }
      if (provider === "gmail" && gmailStatus !== "connected") {
        pushToast("error", "Connect Gmail before sending via Gmail.");
        return;
      }
      const draftKey = draft.id ?? `draft-${index}`;
      setSendingDraft({ id: draftKey, provider });
      const attemptedAt = new Date().toISOString();
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject: draft.subject ?? "",
            html: draft.body ?? "",
          }),
        });
        let errorMessage = "";
        if (!response.ok) {
          try {
            const payload = await response.json();
            if (payload && typeof payload === "object" && payload.error) {
              errorMessage = String(payload.error);
            }
          } catch {
            errorMessage = response.statusText || "Failed to send email.";
          }
          throw new Error(errorMessage || "Failed to send email.");
        }
        setSendResults((prev) => {
          const next = [...prev];
          const existingIndex = next.findIndex((item, itemIndex) => {
            if (!item) {
              return false;
            }
            if (item.id === draftKey) {
              return true;
            }
            if (draft.id && item.id === draft.id) {
              return true;
            }
            if (!draft.id && !item.id && itemIndex === index) {
              return true;
            }
            return false;
          });
          const base = {
            id: draftKey,
            index,
            to: recipient,
            success: true,
            error: "",
            lastAttemptedAt: attemptedAt,
            provider,
          };
          if (existingIndex >= 0) {
            next[existingIndex] = { ...next[existingIndex], ...base };
          } else {
            next.push(base);
          }
          return next;
        });
        const successMessage =
          provider === "gmail"
            ? `Gmail message sent to ${recipient}.`
            : `Email sent to ${recipient}.`;
        pushToast("success", successMessage);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to send email.";
        setSendResults((prev) => {
          const next = [...prev];
          const existingIndex = next.findIndex((item, itemIndex) => {
            if (!item) {
              return false;
            }
            if (item.id === draftKey) {
              return true;
            }
            if (draft.id && item.id === draft.id) {
              return true;
            }
            if (!draft.id && !item.id && itemIndex === index) {
              return true;
            }
            return false;
          });
          const base = {
            id: draftKey,
            index,
            to: recipient,
            success: false,
            error: message,
            lastAttemptedAt: attemptedAt,
            provider,
          };
          if (existingIndex >= 0) {
            next[existingIndex] = { ...next[existingIndex], ...base };
          } else {
            next.push(base);
          }
          return next;
        });
        pushToast("error", message);
      } finally {
        setSendingDraft(null);
      }
    },
    [aiResults, gmailStatus, pushToast],
  );

  const handleSendResponseRow = useCallback(
    async (index) => {
      const row = responseEmailRows[index];
      if (!row) {
        pushToast("error", "Unable to locate this response.");
        return;
      }
      const recipient = (row.email || "").trim();
      if (!recipient) {
        pushToast("error", "This response does not include an email address.");
        return;
      }
      const subjectValue = String(row.subject ?? "");
      const bodySource = row.body ?? row.json ?? "";
      const originalBody =
        typeof bodySource === "string"
          ? bodySource
          : bodySource != null
            ? String(bodySource)
            : "";
      const bodyValue = responseBodyEdits[index] ?? originalBody;
      setResponseSending((prev) => ({ ...prev, [index]: true }));
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject: subjectValue,
            html: bodyValue,
          }),
        });
        let errorMessage = "";
        if (!response.ok) {
          try {
            const payload = await response.json();
            if (payload && typeof payload === "object" && payload.error) {
              errorMessage = String(payload.error);
            }
          } catch {
            errorMessage = response.statusText || "Failed to send email.";
          }
          throw new Error(errorMessage || "Failed to send email.");
        }
        pushToast("success", `Email sent to ${recipient}.`);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to send email.";
        pushToast("error", message);
      } finally {
        setResponseSending((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    },
    [pushToast, responseBodyEdits, responseEmailRows],
  );

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
    [aiIncludedResults, pushToast],
  );

  const resetResponses = useCallback(() => {
    setResponse(null);
    setInlineSummary("");
    setErrorMessage("");
  }, []);

  const submitAction = useCallback(
    async (action) => {
      if (!action) {
        setErrorMessage("Unknown action");
        pushToast("error", "Unknown action");
        return false;
      }

      setLastAction(action);
      setLoadingAction(action);
      clearImportSubmitReset();
      setImportSubmitStatus(action === "import1" ? "saving" : "idle");
      resetResponses();
      setContactHighlight(false);
      setCsvImportError("");
      setSearchKeywordError("");
      setSearchLinkError("");

      const normalizedUsername = sessionEmail;
      const trimmedContactId = contactId.trim();
      const trimmedProfileUrlValue = profileUrl.trim();
      const trimmedSearchKeyword = searchKeyword.trim();
      const trimmedSearchLink = searchLink.trim();

      if (trimmedProfileUrlValue) {
        const { status, message } = validateProfileUrl(trimmedProfileUrlValue);
        setFieldTouched((prev) => ({ ...prev, profileUrl: true }));
        setFieldErrors((prev) => ({ ...prev, profileUrl: message }));
        setFieldStatus((prev) => ({ ...prev, profileUrl: status }));
        if (status === "error") {
          setErrorMessage(message);
          pushToast("error", message);
          setLoadingAction(null);
          return false;
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

      if (action === "update" && !trimmedContactId) {
        const message = "Contact ID is required to update.";
        setErrorMessage(message);
        pushToast("error", message);
        setContactHighlight(true);
        setLoadingAction(null);
        return false;
      }

      if (action === "view" && !normalizedUsername) {
        const message = "Connect Gmail to load contacts.";
        setErrorMessage(message);
        pushToast("error", message);
        setLoadingAction(null);
        return false;
      }

      if (action === "search") {
        if (!trimmedSearchKeyword && !trimmedSearchLink) {
          const message = "Enter a keyword or link to search.";
          setErrorMessage(message);
          pushToast("error", message);
          setSearchKeywordError(message);
          setLoadingAction(null);
          return false;
        }
        if (trimmedSearchLink) {
          const { status, message } = validateProfileUrl(trimmedSearchLink);
          if (status === "error") {
            setErrorMessage(message);
            pushToast("error", message);
            setSearchLinkError(message);
            setLoadingAction(null);
            return false;
          }
        }
        const permissionMessage = "need permission.";
        setErrorMessage(permissionMessage);
        pushToast("error", permissionMessage);
        setSearchKeywordError(permissionMessage);
        setLoadingAction(null);
        return false;
      }

      const body = {
        action,
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
      };

      if (trimmedContactId && action !== "create" && action !== "email") {
        body.local_id = trimmedContactId;
      }

      if (action === "create" || action === "view" || action === "update") {
        Object.assign(body, contactDetails);
      }

      if (action === "search") {
        if (trimmedSearchKeyword) {
          body.keyword = trimmedSearchKeyword;
        }
        if (trimmedSearchLink) {
          body.link = trimmedSearchLink;
        }
      }

      if (action === "import") {
        if (!csvFileContent) {
          const message = "Please upload a CSV file before importing.";
          setCsvImportError(message);
          pushToast("error", message);
          setLoadingAction(null);
          return false;
        }
        body.csv_content = csvFileContent;
        if (csvFileName) {
          body.csv_filename = csvFileName;
        }
      }

      if (action === "import1") {
        if (importSelection.length === 0) {
          const message = "Select at least one contact to import.";
          setErrorMessage(message);
          pushToast("error", message);
          setImportSubmitStatus("idle");
          setLoadingAction(null);
          return false;
        }
        const selectedIds = new Set(importSelection.map(String));
        const selectedRecords = importResults.filter((record) =>
          selectedIds.has(String(record.__rowId)),
        );
        if (selectedRecords.length === 0) {
          const message = "Selected contacts are unavailable.";
          setErrorMessage(message);
          pushToast("error", message);
          setImportSelection([]);
          setImportSubmitStatus("idle");
          setLoadingAction(null);
          return false;
        }
        body.contacts = selectedRecords.map((record) => {
          const { __rowId, raw, ...rest } = record;
          if (raw && typeof raw === "object") {
            return { ...raw, ...rest };
          }
          return rest;
        });
      }

      let succeeded = false;

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
            (data &&
              typeof data === "object" &&
              "error" in data &&
              data.error) ||
            r.statusText ||
            "Request failed";
          throw new Error(messageText);
        }
        setResponse(data ?? { success: true });
        if (action === "import") {
          const normalized = normalizeImportPayload(data);
          setImportResults(normalized);
          setImportSelection([]);
          setImportPageIndex(0);
          setImportSubmitStatus("idle");
          clearImportSubmitReset();
        }
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
        } else if (action === "search") {
          pushToast("success", "Search requested.");
        } else if (action === "import") {
          pushToast("success", "Import requested.");
          setCsvFileContent("");
          setCsvFileName("");
          setCsvFileInputKey((prev) => prev + 1);
        } else if (action === "import1") {
          pushToast("success", "Import requested.");
          setImportSelection([]);
          setImportSubmitStatus("saved");
          clearImportSubmitReset();
          importSubmitResetRef.current = window.setTimeout(() => {
            setImportSubmitStatus("idle");
            importSubmitResetRef.current = null;
          }, 2500);
        }

        if (action === "view") {
          const records = Array.isArray(data) ? data : data ? [data] : [];
          const viewableRecords = records.filter(
            (record) => record && typeof record === "object",
          );
          setViewContacts(viewableRecords);
          const normalized = viewableRecords
            .map((record) => ({
              ...record,
              __contactId: resolveContactId(record),
            }))
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
          setEmailSearchTerm("");
          setEmailPageIndex(0);
        }

        succeeded = true;
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "Request failed";
        setErrorMessage(messageText);
        pushToast("error", messageText);
        setResponse(null);
        if (action === "import1") {
          setImportSubmitStatus("idle");
          clearImportSubmitReset();
        }
      } finally {
        setLoadingAction(null);
      }

      return succeeded;
    },
    [
      clearImportSubmitReset,
      contactId,
      csvFileContent,
      csvFileName,
      email,
      fullName,
      importResults,
      importSelection,
      location,
      normalizeImportPayload,
      profileUrl,
      pushToast,
      resetResponses,
      resolveContactId,
      searchKeyword,
      searchLink,
      setInlineSummary,
      setEmailPageIndex,
      setEmailSearchTerm,
      setEmailRecipients,
      setEmailContacts,
      setPreviewContactId,
      setPreviewContent,
      setIsSampleEmailContacts,
      setViewContacts,
      title,
      sessionEmail,
    ],
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const action = event.nativeEvent.submitter?.value;
      void submitAction(action);
    },
    [submitAction],
  );

  const gmailLabel = useMemo(() => {
    if (gmailStatus === "connected") return "Gmail Connected";
    if (gmailStatus === "connecting") return "Connecting…";
    return "Connect Gmail";
  }, [gmailStatus]);

  const themeToggleLabel = useMemo(
    () => (theme === "dark" ? "Switch to light mode" : "Switch to dark mode"),
    [theme],
  );

  const contactDetailFields = (
    <>
      {showContactIdField ? (
        <div className={`field contact-id-field${contactHighlight ? " error" : ""}`}>
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
      ) : null}

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
        <div
          className={`validation-text${fieldErrors.profileUrl ? " error" : ""}`}
        >
          {fieldErrors.profileUrl}
        </div>
      </div>
    </>
  );

  const tabs = useMemo(
    () => [
      { id: "create", label: "Create" },
      { id: "search", label: "Search" },
      { id: "import", label: "Import" },
      { id: "view", label: "View" },
      { id: "update", label: "Update" },
      { id: "email", label: "Email" },
      { id: "cover", label: "Cover letter" },
    ],
    [],
  );

  const activeTabLabel = useMemo(() => {
    const current = tabs.find((tab) => tab.id === activePage);
    return current ? current.label : "Menu";
  }, [activePage, tabs]);

  const tabListId = "rolodex-tablist";

  const handleTabClick = useCallback(
    (tabId) => {
      setActivePage(tabId);
      setIsMobileTabsOpen(false);
      if ((tabId === "view" || tabId === "email") && !disableSubmit) {
        void submitAction("view");
      }
    },
    [disableSubmit, submitAction],
  );

  const handleRefreshContacts = useCallback(() => {
    if (disableSubmit) {
      return;
    }
    void submitAction("view");
  }, [disableSubmit, submitAction]);

  const viewColumns = useMemo(
    () => [
      { id: "local_id", label: "Local ID" },
      { id: "full_name", label: "Full Name" },
      { id: "title", label: "Title" },
      { id: "company", label: "Company" },
      { id: "location", label: "Location" },
      { id: "profile_url", label: "Profile URL" },
      { id: "email", label: "Email" },
      { id: "engagement", label: "Engagement" },
    ],
    [],
  );

  const emailColumns = useMemo(
    () => [
      { id: "local_id", label: "Local ID" },
      { id: "full_name", label: "Full Name" },
      { id: "title", label: "Title" },
      { id: "company", label: "Company" },
      { id: "location", label: "Location" },
      { id: "profile_url", label: "Profile URL" },
      { id: "email", label: "Email" },
      { id: "engagement", label: "Engagement" },
    ],
    [],
  );

  const importColumns = useMemo(
    () => [
      { id: "full_name", label: "Full Name" },
      { id: "title", label: "Title" },
      { id: "company", label: "Company" },
      { id: "location", label: "Location" },
      { id: "profile_url", label: "Profile URL" },
      { id: "email", label: "Email" },
    ],
    [],
  );

  const viewRecords = useMemo(() => {
    if (!Array.isArray(viewContacts) || viewContacts.length === 0) {
      return [];
    }
    return viewContacts.filter((record) => record && typeof record === "object");
  }, [viewContacts]);

  const sampleViewRecord = useMemo(() => ({ ...SAMPLE_CONTACT_RECORD }), []);

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

  const isSampleView =
    viewRecords.length === 0 && resolvedViewRecords.length > 0;

  const formatProfileHref = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  };

  const viewFilteredRecords = useMemo(() => {
    if (!Array.isArray(resolvedViewRecords) || resolvedViewRecords.length === 0) {
      return [];
    }
    const query = viewSearchTerm.trim().toLowerCase();
    if (!query) {
      return resolvedViewRecords;
    }
    return resolvedViewRecords.filter((record) => {
      const values = [
        record.local_id ?? record.localId ?? null,
        record.contact_id ?? record.contactId ?? null,
        resolveContactId(record),
        resolveContactName(record),
        record.full_name ?? record.fullName ?? record.name,
        record.title,
        record.company,
        record.location,
        record.profile_url ?? record.profileUrl,
        record.email,
        record.engagement_label ?? record.engagementLabel ?? record.status,
        record.last_contacted ??
          record.last_messaged ??
          record.lastMessaged ??
          record.last_contacted_at ??
          "",
      ];
      const engagement = computeEngagementStatus(record);
      if (engagement?.label) {
        values.push(engagement.label);
      }
      return values.some(
        (value) =>
          value && String(value).toLowerCase().includes(query),
      );
    });
  }, [
    computeEngagementStatus,
    resolveContactId,
    resolveContactName,
    resolvedViewRecords,
    viewSearchTerm,
  ]);

  const viewTableState = useMemo(() => {
    if (!Array.isArray(viewFilteredRecords) || viewFilteredRecords.length === 0) {
      return {
        visibleRecords: [],
        totalRecords: 0,
        totalPages: 0,
        currentPageIndex: 0,
      };
    }
    const filtered = viewFilteredRecords;

    const getSortValue = (record) => {
      switch (viewSort.key) {
        case "local_id":
          return (
            record.local_id ??
            record.localId ??
            record.contact_id ??
            record.contactId ??
            record.id ??
            ""
          );
        case "full_name":
          return (
            record.full_name ??
            record.fullName ??
            record.name ??
            ""
          );
        case "title":
          return record.title ?? "";
        case "company":
          return record.company ?? "";
        case "location":
          return record.location ?? "";
        case "profile_url":
          return record.profile_url ?? record.profileUrl ?? "";
        case "email":
          return record.email ?? "";
        case "engagement": {
          const candidate =
            record.last_contacted ??
            record.last_messaged ??
            record.lastMessaged ??
            record.last_contacted_at ??
            null;
          const parsed = candidate ? Date.parse(candidate) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
          const status = computeEngagementStatus(record);
          return status?.label ?? "";
        }
        default: {
          return (
            record.full_name ??
            record.fullName ??
            record.name ??
            resolveContactName(record) ??
            ""
          );
        }
      }
    };

    const sorted = filtered.slice().sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);
      const direction = viewSort.direction === "asc" ? 1 : -1;
      if (typeof valueA === "number" && typeof valueB === "number") {
        if (valueA === valueB) {
          return 0;
        }
        return valueA < valueB ? -direction : direction;
      }
      const stringA = String(valueA ?? "").toLowerCase();
      const stringB = String(valueB ?? "").toLowerCase();
      if (stringA === stringB) {
        return 0;
      }
      return stringA < stringB ? -direction : direction;
    });

    const pageSize = TABLE_PAGE_SIZES.includes(viewPageSize)
      ? viewPageSize
      : TABLE_PAGE_SIZES[0];
    const totalRecords = sorted.length;
    const totalPages =
      totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize);
    const safePageIndex =
      totalPages === 0
        ? 0
        : Math.min(Math.max(viewPageIndex, 0), totalPages - 1);
    const start = safePageIndex * pageSize;
    const visibleRecords = sorted.slice(start, start + pageSize);

    return {
      visibleRecords,
      totalRecords,
      totalPages,
      currentPageIndex: safePageIndex,
      pageSize,
    };
  }, [
    computeEngagementStatus,
    resolveContactId,
    viewFilteredRecords,
    viewPageIndex,
    viewPageSize,
    viewSort,
  ]);

  const {
    visibleRecords: viewVisibleRecords,
    totalRecords: viewTotalRecords,
    totalPages: viewTotalPages,
    currentPageIndex: currentViewPageIndex,
    pageSize: viewResolvedPageSize,
  } = viewTableState;

  const viewRecordCount = viewFilteredRecords.length;

  useEffect(() => {
    if (currentViewPageIndex !== viewPageIndex) {
      setViewPageIndex(currentViewPageIndex);
    }
  }, [currentViewPageIndex, viewPageIndex]);

  useEffect(() => {
    setViewPageIndex(0);
  }, [viewPageSize, viewRecordCount, viewSearchTerm]);

  useEffect(() => {
    setIsMobileTabsOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (!isMobileTabsOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!tabsWrapperRef.current) {
        return;
      }
      if (
        typeof Node !== "undefined" &&
        event.target instanceof Node &&
        tabsWrapperRef.current.contains(event.target)
      ) {
        return;
      }
      setIsMobileTabsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMobileTabsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileTabsOpen]);

  const viewPageNumbers = useMemo(() => {
    if (viewTotalPages === 0) {
      return [];
    }
    const count = Math.min(viewTotalPages, 100);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [viewTotalPages]);

  const viewRangeStart =
    viewTotalRecords === 0 || viewVisibleRecords.length === 0
      ? 0
      : currentViewPageIndex * viewResolvedPageSize + 1;
  const viewRangeEnd =
    viewTotalRecords === 0 || viewVisibleRecords.length === 0
      ? 0
      : currentViewPageIndex * viewResolvedPageSize + viewVisibleRecords.length;

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

  return (
    <div className="rolodex-page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <section className="rolodex-card rolodex-card--no-heading" aria-label="Contacts workspace">
        <div className="context-toolbar" role="group" aria-label="Contact context">
          <div
            className={`rolodex-tabs-wrapper${isMobileTabsOpen ? " open" : ""}`}
            ref={tabsWrapperRef}
          >
            <button
              type="button"
              className={`tab-menu-toggle${isMobileTabsOpen ? " open" : ""}`}
              aria-expanded={isMobileTabsOpen}
              aria-controls={tabListId}
              aria-haspopup="menu"
              onClick={() => setIsMobileTabsOpen((prev) => !prev)}
            >
              <IconMenu className="tab-menu-icon" />
              <span className="tab-menu-label">{activeTabLabel}</span>
            </button>
            <nav
              id={tabListId}
              className={`rolodex-tabs${isMobileTabsOpen ? " open" : ""}`}
              role="tablist"
              aria-label="Contact sections"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${tab.id}-tab`}
                  aria-controls={`${tab.id}-panel`}
                  aria-selected={activePage === tab.id}
                  className={`tab-button${activePage === tab.id ? " active" : ""}`}
                  onClick={() => handleTabClick(tab.id)}
                  tabIndex={activePage === tab.id ? 0 : -1}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="context-controls">
            <div className="theme-inline-field">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={themeToggleLabel}
              >
                {theme === "dark" ? <IconSun /> : <IconMoon />}
                <span className="theme-label" aria-hidden="true">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
                <span className="visually-hidden">{themeToggleLabel}</span>
              </button>
            </div>

            <div className="gmail-inline-field">
              <button
                type="button"
                className={`gmail-button${gmailStatus === "connected" ? " connected" : ""}`}
                onClick={handleGmailClick}
                disabled={gmailStatus === "connecting"}
                aria-busy={gmailStatus === "connecting"}
                aria-label={gmailLabel}
              >
                <span className="gmail-icon" aria-hidden="true">
                  <IconGoogle className="gmail-google" />
                  {gmailStatus === "connecting" ? (
                    <IconLoader className="loader gmail-status" />
                  ) : gmailStatus === "connected" ? (
                    <IconCheck className="gmail-status gmail-status--check" />
                  ) : null}
                </span>
                <span className="gmail-label" aria-hidden="true">{gmailLabel}</span>
                <span className="visually-hidden">{gmailLabel}</span>
                <span className="gmail-tooltip">Use Gmail to auto-log emails.</span>
              </button>
            </div>
          </div>
        </div>

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

          {activePage === "import" && (
            <div role="tabpanel" id="import-panel" aria-labelledby="import-tab">
              <form className="import-form" onSubmit={handleSubmit} noValidate>
                <div className="import-upload">
                  <a
                    className="import-template-link"
                    href="https://docs.google.com/spreadsheets/d/1iFe6NYrKnqADewiw4mERZ_Az2xbj3pr9nbkNVFFUaeg/copy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download CSV template
                  </a>
                  <label className="visually-hidden" htmlFor="csvFile">
                    Import contacts from CSV
                  </label>
                  <div className="import-upload-row">
                    <label
                      htmlFor="csvFile"
                      className="button secondary import-upload-button"
                    >
                      Upload file
                    </label>
                    <span
                      className={`import-file-name${csvFileName ? "" : " empty"}`}
                    >
                      {csvFileName || "No file selected"}
                    </span>
                  </div>
                  <input
                    key={csvFileInputKey}
                    id="csvFile"
                    type="file"
                    accept=".csv,text/csv"
                    className="file-input visually-hidden"
                    onChange={handleCsvFileChange}
                    disabled={disableSubmit}
                  />
                  {csvImportError ? (
                    <div className="validation-text error">{csvImportError}</div>
                  ) : null}
                  <button
                    type="submit"
                    value="import"
                    className="button import-submit-button"
                    disabled={disableSubmit}
                    aria-busy={loadingAction === "import"}
                  >
                    {loadingAction === "import" ? <IconLoader /> : null}
                    {loadingAction === "import" ? "Importing…" : "Import CSV"}
                  </button>
                </div>
              </form>

              {shouldShowImportResults ? (
                <form
                  className="import-results-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <div className="table-section import-results-section">
                    <div className="table-toolbar import-results-toolbar">
                      <span className="import-results-title">Imported contacts</span>
                      <div className="table-page-size">
                        <label htmlFor="importPageSize">Rows per page</label>
                        <select
                          id="importPageSize"
                          value={importResolvedPageSize}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setImportPageSize(
                              Number.isNaN(next) || next <= 0
                                ? TABLE_PAGE_SIZES[0]
                                : next,
                            );
                          }}
                        >
                          {TABLE_PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="table-scroll import-table-scroll">
                      <table className="view-table import-table">
                        <caption className="visually-hidden">
                          Imported contacts
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col" className="select-header">
                              <label className="select-all-control">
                                <span className="select-all-label">Select all</span>
                                <input
                                  ref={importSelectAllRef}
                                  type="checkbox"
                                  onChange={() =>
                                    handleToggleImportSelectAll(importVisibleIds)
                                  }
                                  checked={importDisplayedSelected}
                                  disabled={importVisibleIds.length === 0}
                                  aria-label="Select all contacts"
                                />
                              </label>
                            </th>
                            {importColumns.map((column) => {
                              const isSorted = importSort.key === column.id;
                              const ariaSort = isSorted
                                ? importSort.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none";
                              return (
                                <th
                                  key={column.id}
                                  scope="col"
                                  aria-sort={ariaSort}
                                >
                                  <button
                                    type="button"
                                    className={`sort-button${
                                      isSorted ? " active" : ""
                                    }`}
                                    onClick={() => handleImportSort(column.id)}
                                  >
                                    <span>{column.label}</span>
                                    <span
                                      className="sort-indicator"
                                      aria-hidden="true"
                                    >
                                      {isSorted
                                        ? importSort.direction === "asc"
                                          ? "▲"
                                          : "▼"
                                        : "↕"}
                                    </span>
                                  </button>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {importVisibleRecords.length === 0 ? (
                            <tr>
                              <td
                                className="empty-state-cell"
                                colSpan={importColumns.length + 1}
                              >
                                No contacts available.
                              </td>
                            </tr>
                          ) : (
                            importVisibleRecords.map((record) => {
                              const rowId = String(record.__rowId);
                              const isSelected = importSelectionSet.has(rowId);
                              const contactName =
                                record.full_name ??
                                record.fullName ??
                                record.email ??
                                rowId;
                              return (
                                <tr
                                  key={rowId}
                                  className={isSelected ? "selected" : ""}
                                  onClick={(event) =>
                                    handleImportRowClick(event, rowId)
                                  }
                                >
                                  <td className="select-cell">
                                    <button
                                      type="button"
                                      className={`select-toggle${
                                        isSelected ? " selected" : ""
                                      }`}
                                      onClick={() => handleToggleImportRow(rowId)}
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
                                  {importColumns.map((column) => {
                                    const rawValue = record[column.id];
                                    const value =
                                      rawValue == null
                                        ? ""
                                        : typeof rawValue === "string"
                                          ? rawValue
                                          : String(rawValue);
                                    const isEditable = IMPORT_EDITABLE_FIELDS.has(
                                      column.id,
                                    );
                                    if (!isEditable) {
                                      return (
                                        <td key={column.id}>
                                          {value ? value : "—"}
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={column.id} className="editable-cell">
                                        <input
                                          type="text"
                                          className="import-table-input"
                                          value={value}
                                          onChange={(event) =>
                                            handleImportFieldChange(
                                              rowId,
                                              column.id,
                                              event.target.value,
                                            )
                                          }
                                          placeholder={column.label}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footer import-table-footer">
                      <span className="table-summary">
                        {importVisibleRecords.length === 0
                          ? "No contacts available."
                          : `Showing ${importRangeStart} – ${importRangeEnd} of ${importTotalRecords}`}
                      </span>
                      <div className="import-footer-actions">
                        <div className="pagination-controls">
                          <button
                            type="button"
                            className="page-button"
                            onClick={() =>
                              setImportPageIndex(
                                Math.max(currentImportPageIndex - 1, 0),
                              )
                            }
                            disabled={currentImportPageIndex === 0}
                          >
                            Previous
                          </button>
                          {importPageNumbers.map((page) => (
                            <button
                              key={page}
                              type="button"
                              className={`page-button${
                                page - 1 === currentImportPageIndex
                                  ? " active"
                                  : ""
                              }`}
                              onClick={() => setImportPageIndex(page - 1)}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="page-button"
                            onClick={() =>
                              setImportPageIndex(
                                Math.min(
                                  currentImportPageIndex + 1,
                                  importTotalPages - 1,
                                ),
                              )
                            }
                            disabled={
                              importTotalPages === 0 ||
                              currentImportPageIndex >= importTotalPages - 1
                            }
                          >
                            Next
                          </button>
                        </div>
                        <button
                          type="submit"
                          value="import1"
                          className="button primary import-submit-button"
                          disabled={disableSubmit || importSelectionCount === 0}
                          aria-busy={loadingAction === "import1"}
                        >
                          {loadingAction === "import1" ? (
                            <IconLoader />
                          ) : importSubmitStatus === "saved" ? (
                            <IconCheck className="button-icon" />
                          ) : null}
                          {loadingAction === "import1"
                            ? "Saving…"
                            : importSubmitStatus === "saved"
                              ? "Saved"
                              : "Save Selected"}
                        </button>
                      </div>
                    </div>
                    <div className="helper-text import-selection-helper">
                      {importSelectionSummary}
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          )}

          {activePage === "view" && (
            <div role="tabpanel" id="view-panel" aria-labelledby="view-tab">
              <form
                id="view-form"
                className="simple-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <p className="view-helper">
                  Connect Gmail and your contacts will load automatically.
                </p>
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
                    className="button"
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

          {activePage === "search" && (
            <div role="tabpanel" id="search-panel" aria-labelledby="search-tab">
              <form
                className="rolodex-form"
                id="search-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="rolodex-form-grid">
                  <div className={`field${searchKeywordError ? " error" : ""}`}>
                    <label className="field-label" htmlFor="searchKeyword">
                      Keyword
                    </label>
                    <input
                      id="searchKeyword"
                      className="text-input"
                      value={searchKeyword}
                      onChange={(event) => {
                        setSearchKeyword(event.target.value);
                        if (searchKeywordError) {
                          setSearchKeywordError("");
                        }
                      }}
                      placeholder="Keyword"
                    />
                    <div className={`helper-text${searchKeywordError ? " error" : ""}`}>
                      {searchKeywordError || "Add a keyword to search."}
                    </div>
                  </div>

                  <div className={`field${searchLinkError ? " error" : ""}`}>
                    <label className="field-label" htmlFor="searchLink">
                      Link
                    </label>
                    <input
                      id="searchLink"
                      className="text-input"
                      value={searchLink}
                      onChange={(event) => {
                        setSearchLink(event.target.value);
                        if (searchLinkError) {
                          setSearchLinkError("");
                        }
                      }}
                      placeholder="https://example.com"
                      inputMode="url"
                    />
                    <div className={`helper-text${searchLinkError ? " error" : ""}`}>
                      {searchLinkError || "Optional link to refine the search."}
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button
                    type="submit"
                    value="search"
                    className="button secondary"
                    disabled={disableSubmit}
                    aria-busy={loadingAction === "search"}
                  >
                    {loadingAction === "search" ? <IconLoader /> : null}
                    {loadingAction === "search" ? "Searching…" : "Search"}
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
                <div className="recipient-controls" />
              </div>
                {emailContacts.length === 0 ? (
                  <p className="recipient-placeholder">
                    Connect Gmail to load contacts for emailing.
                  </p>
                ) : (
                  <>
                    <div className="table-toolbar">
                      <div className="table-search">
                        <label htmlFor="emailSearch" className="visually-hidden">
                          Search contacts
                        </label>
                        <input
                          id="emailSearch"
                          type="search"
                          className="table-search-input"
                          value={emailSearchTerm}
                          onChange={(event) => setEmailSearchTerm(event.target.value)}
                          placeholder="Search contacts"
                        />
                      </div>
                      <div className="table-toolbar-actions">
                        <button
                          type="button"
                          className="table-refresh-button"
                          onClick={handleRefreshContacts}
                          disabled={disableSubmit}
                          aria-label="Refresh contacts"
                          aria-busy={loadingAction === "view"}
                        >
                          {loadingAction === "view" ? <IconLoader /> : <IconRefresh />}
                        </button>
                        <div className="table-page-size">
                          <label htmlFor="emailPageSize">Rows per page</label>
                          <select
                            id="emailPageSize"
                            value={emailResolvedPageSize}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              setEmailPageSize(
                                Number.isNaN(next) || next <= 0
                                  ? TABLE_PAGE_SIZES[0]
                                  : next,
                              );
                            }}
                          >
                            {TABLE_PAGE_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
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
                              <span className="select-all-label">
                                Select all
                              </span>
                              <input
                                ref={selectAllRef}
                                type="checkbox"
                                onChange={() =>
                                  handleToggleSelectAll(displayedRecipientIds)
                                }
                                checked={displayedRecipientsSelected}
                                disabled={displayedRecipientIds.length === 0}
                                aria-label="Select all recipients"
                              />
                            </label>
                          </th>
                          {emailColumns.map((column) => {
                            const isSorted = emailSort.key === column.id;
                            const ariaSort = isSorted
                              ? emailSort.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none";
                            return (
                              <th
                                key={column.id}
                                scope="col"
                                aria-sort={ariaSort}
                                className={column.id === "local_id" ? "id-column" : ""}
                              >
                                <button
                                  type="button"
                                  className={`sort-button${
                                    isSorted ? " active" : ""
                                  }`}
                                  onClick={() => handleEmailSort(column.id)}
                                >
                                  <span>{column.label}</span>
                                  <span className="sort-indicator" aria-hidden="true">
                                    {isSorted
                                      ? emailSort.direction === "asc"
                                        ? "▲"
                                        : "▼"
                                      : "↕"}
                                  </span>
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                    {emailVisibleContacts.length === 0 ? (
                      <tr>
                        <td
                          className="empty-state-cell"
                          colSpan={emailColumns.length + 1}
                        >
                          No contacts available.
                        </td>
                      </tr>
                    ) : (
                          emailVisibleContacts.map((contact) => {
                            const id =
                              contact.__contactId || resolveContactId(contact);
                            if (!id) {
                              return null;
                            }
                            const normalizedId = String(id);
                            const localIdValue =
                              contact.local_id ??
                              contact.localId ??
                              contact.contact_id ??
                              contact.contactId ??
                              normalizedId;
                            const localIdDisplay = localIdValue
                              ? String(localIdValue)
                              : "—";
                            const isSelected =
                              emailRecipients.includes(normalizedId);
                            const profileLink = formatProfileHref(
                              contact.profile_url ?? contact.profileUrl,
                            );
                            const engagement = computeEngagementStatus(contact);
                            const lastMessagedDisplay = formatTimestamp(
                              contact.last_contacted ??
                                contact.last_messaged ??
                                contact.lastMessaged ??
                                contact.last_contacted_at,
                            );
                            const contactName =
                              resolveContactName(contact) || normalizedId;
                            return (
                              <tr
                                key={normalizedId}
                                className={isSelected ? "selected" : ""}
                                onClick={(event) =>
                                  handleRecipientRowClick(event, normalizedId)
                                }
                              >
                                <td className="select-cell">
                                  <button
                                    type="button"
                                    className={`select-toggle${isSelected ? " selected" : ""}`}
                                    onClick={() =>
                                      handleToggleRecipient(normalizedId)
                                    }
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
                                <td className="id-cell">{localIdDisplay}</td>
                                <td>{resolveContactName(contact) || "—"}</td>
                                <td>{contact.title ?? "—"}</td>
                                <td>{contact.company ?? "—"}</td>
                                <td>{contact.location ?? "—"}</td>
                                <td>
                                  {profileLink ? (
                                    <a
                                      href={profileLink}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
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
                                    <span className="status-text">
                                      {engagement.label}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    </div>
                    <div className="table-footer">
                      <span className="table-summary">
                        {emailVisibleContacts.length === 0
                          ? "No contacts available."
                          : `Showing ${emailRangeStart} – ${emailRangeEnd} of ${emailTotalRecords}`}
                      </span>
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="page-button"
                          onClick={() =>
                            setEmailPageIndex(
                              Math.max(currentEmailPageIndex - 1, 0),
                            )
                          }
                          disabled={currentEmailPageIndex === 0}
                        >
                          Previous
                        </button>
                        {emailPageNumbers.map((page) => (
                          <button
                            key={page}
                            type="button"
                            className={`page-button${
                              page - 1 === currentEmailPageIndex
                                ? " active"
                                : ""
                            }`}
                            onClick={() => setEmailPageIndex(page - 1)}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="page-button"
                          onClick={() =>
                            setEmailPageIndex(
                              Math.min(
                                currentEmailPageIndex + 1,
                                emailTotalPages - 1,
                              ),
                            )
                          }
                          disabled={
                            emailTotalPages === 0 ||
                            currentEmailPageIndex >= emailTotalPages - 1
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
                <div className="helper-text recipients-helper">
                  {emailRecipients.length > 0
                    ? `${emailRecipients.length} recipient${emailRecipients.length === 1 ? "" : "s"} selected.`
                    : "No recipients selected."}
                </div>
              </div>

              <div className="email-composer-card">
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
                      onChange={(event) =>
                        setCampaignCompany(event.target.value)
                      }
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
                    <div className="helper-text">
                      Used for {"{{student.name}}"}.
                    </div>
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
                    <div className="helper-text">
                      Used for {"{{student.school}}"}.
                    </div>
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
                  <div
                    className={`validation-text${toErrorMessage ? " error" : ""}`}
                  >
                    {toErrorMessage ||
                      "Use Enter to add addresses or {{contact.email}}."}
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
                    <div className="helper-text">
                      Characters: {subjectCharCount}
                    </div>
                  </div>
                  <div className="field double">
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
                    <div className="helper-text">
                      {hasDraftToken
                        ? "Insert placeholders where needed. We'll keep {{draft}} for AI to expand."
                        : "Insert placeholders where needed. Add {{draft}} if you want AI to extend a section."}
                    </div>
                  </div>
                </div>

                <div className="composer-actions">
                  <div className="composer-actions-left">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleSaveTemplate}
                    >
                      Save as template
                    </button>
                    <button
                      type="button"
                      className="button tertiary"
                      onClick={handleResetTemplate}
                    >
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
                        onChange={(event) =>
                          setPreviewContactId(event.target.value)
                        }
                        disabled={emailContacts.length === 0}
                      >
                        {emailContacts.length === 0 ? (
                          <option value="">Connect Gmail to preview contacts</option>
                        ) : (
                          emailContacts.map((contact) => {
                            const id =
                              contact.__contactId || resolveContactId(contact);
                            if (!id) {
                              return null;
                            }
                            const name =
                              resolveContactName(contact) || "Unknown contact";
                            const emailValue = resolveContactEmail(contact);
                            const label = emailValue
                              ? `${name} (${emailValue})`
                              : name;
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
                      className="button secondary"
                      onClick={handleBuildTemplateEmails}
                      disabled={!canBuildTemplate}
                    >
                      Edit manually
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={handleGenerateEmails}
                      disabled={!canGenerate}
                      aria-busy={isGenerating}
                    >
                      {isGenerating ? <IconLoader /> : null}
                      {isGenerating
                        ? "Generating…"
                        : "Generate with AI (dry run)"}
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
                        <span className="preview-meta-value">
                          {previewContent.to || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="preview-meta-label">Subject</span>
                        <span className="preview-meta-value">
                          {previewContent.subject || "—"}
                        </span>
                      </div>
                    </div>
                    <pre className="preview-body">
                      {previewContent.body || ""}
                    </pre>
                  </div>
                )}
                {showResponseSection && (
                  <div className="preview-response" aria-live="polite">
                    <div className="preview-response-toolbar">
                      <span className="preview-response-title">Response</span>
                    </div>
                    {responseEmailRows.length > 0 ? (
                      <div
                        className="table-scroll preview-response-scroll"
                        role="group"
                        aria-label="Response"
                      >
                        <table className="view-table preview-response-table">
                          <thead>
                            <tr>
                              <th
                                scope="col"
                                className="preview-response-index-header"
                              >
                                #
                              </th>
                              <th scope="col">Email</th>
                              <th scope="col">Subject</th>
                              <th scope="col">Body</th>
                              <th
                                scope="col"
                                className="preview-response-actions-header"
                              >
                                Send
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {responseEmailRows.map((row, index) => {
                              const rowKey = row.path
                                ? `${row.path}-${index}`
                                : index;
                              const recipientValue =
                                typeof row.email === "string"
                                  ? row.email.trim()
                                  : row.email != null
                                    ? String(row.email)
                                    : "";
                              const subjectValue =
                                typeof row.subject === "string"
                                  ? row.subject
                                  : row.subject != null
                                    ? String(row.subject)
                                    : "";
                              const bodySource = row.body ?? row.json ?? "";
                              const originalBodyValue =
                                typeof bodySource === "string"
                                  ? bodySource
                                  : bodySource != null
                                    ? String(bodySource)
                                    : "";
                              const editedBodyValue = responseBodyEdits[index];
                              const bodyValue =
                                typeof editedBodyValue === "string"
                                  ? editedBodyValue
                                  : originalBodyValue;
                              const hasRecipient = recipientValue.length > 0;
                              const isSendingRow = Boolean(
                                responseSending[index],
                              );
                              const sendDisabled =
                                isSendingRow || !hasRecipient;
                              const buttonTitle = hasRecipient
                                ? undefined
                                : "Response is missing an email address.";
                              return (
                                <tr key={rowKey}>
                                  <td className="preview-response-index">
                                    {index + 1}
                                  </td>
                                  <td className="preview-response-email">
                                    {recipientValue || "—"}
                                  </td>
                                  <td className="preview-response-subject">
                                    {subjectValue || "—"}
                                  </td>
                                  <td className="preview-response-body">
                                    <textarea
                                      className="preview-response-body-input"
                                      value={bodyValue}
                                      aria-label={
                                        subjectValue
                                          ? `Email body for ${subjectValue}`
                                          : `Email body for response ${index + 1}`
                                      }
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        setResponseBodyEdits((prev) => {
                                          if (nextValue === originalBodyValue) {
                                            if (!(index in prev)) {
                                              return prev;
                                            }
                                            const next = { ...prev };
                                            delete next[index];
                                            return next;
                                          }
                                          return {
                                            ...prev,
                                            [index]: nextValue,
                                          };
                                        });
                                      }}
                                      placeholder="Response body"
                                    />
                                  </td>
                                  <td className="preview-response-send-cell">
                                    <button
                                      type="button"
                                      className="button secondary small preview-response-send-button"
                                      onClick={() =>
                                        handleSendResponseRow(index)
                                      }
                                      disabled={sendDisabled}
                                      aria-busy={isSendingRow}
                                      title={buttonTitle}
                                    >
                                      {isSendingRow ? (
                                        <IconLoader />
                                      ) : (
                                        <IconMail className="preview-response-send-icon" />
                                      )}
                                      {isSendingRow ? "Sending…" : "Send"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          }
                          </tbody>
                        </table>
                      </div>
                    ) : rewriteResponse ? (
                      <div className="preview-response-empty">
                        No formatted responses available yet.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {!hasManualRows && aiResults.length > 0 && (
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
                    {aiResults.map((result, index) => {
                      const rowId = result.id ?? `draft-${index}`;
                      const sendInfo = sendResultMap.get(rowId);
                      const statusText = sendInfo
                        ? sendInfo.success
                          ? sendInfo.provider === "gmail"
                            ? "Sent with Gmail."
                            : "Sent successfully."
                          : sendInfo.error
                            ? "Failed to send."
                            : "Ready to send."
                        : "Ready to send.";
                      const statusDetail = sendInfo?.error
                        ? sendInfo.error
                        : null;
                      const lastAttempt =
                        sendInfo?.lastAttemptedAt &&
                        formatTimestamp(sendInfo.lastAttemptedAt);
                      const isSending = sendingDraft?.id === rowId;
                      const sendingProvider = isSending
                        ? sendingDraft?.provider
                        : null;
                      const isSendingDefault =
                        isSending && sendingProvider === "default";
                      const isSendingGmail =
                        isSending && sendingProvider === "gmail";
                      const gmailDisabled =
                        isSending ||
                        gmailStatus !== "connected" ||
                        Boolean(
                          sendInfo?.provider === "gmail" && sendInfo?.success,
                        );
                      return (
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
                                  handleResultFieldChange(
                                    index,
                                    "to",
                                    event.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="ai-result-value">
                                {result.to || "—"}
                              </span>
                            )}
                          </div>
                          <div className="ai-result-field">
                            <span className="ai-result-label">Subject</span>
                            {result.isEditing ? (
                              <input
                                className="text-input"
                                value={result.subject}
                                onChange={(event) =>
                                  handleResultFieldChange(
                                    index,
                                    "subject",
                                    event.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="ai-result-value">
                                {result.subject || "—"}
                              </span>
                            )}
                          </div>
                          <div className="ai-result-field">
                            <span className="ai-result-label">Body</span>
                            {result.isEditing ? (
                              <textarea
                                className="text-area"
                                value={result.body}
                                onChange={(event) =>
                                  handleResultFieldChange(
                                    index,
                                    "body",
                                    event.target.value,
                                  )
                                }
                                rows={6}
                              />
                            ) : (
                              <pre className="ai-result-body-text">
                                {result.body || ""}
                              </pre>
                            )}
                          </div>
                          <div className="ai-result-footer">
                            <div
                              className={`send-status${
                                sendInfo?.success
                                  ? " success"
                                  : sendInfo?.error
                                    ? " error"
                                    : ""
                              }`}
                            >
                              <span
                                className="send-status-dot"
                                aria-hidden="true"
                              />
                              <div className="send-status-text">
                                <span className="send-status-message">
                                  {statusText}
                                </span>
                                {statusDetail ? (
                                  <span className="send-status-subtext">
                                    {statusDetail}
                                  </span>
                                ) : null}
                                {lastAttempt ? (
                                  <span className="send-status-subtext">
                                    Last attempted {lastAttempt}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="button secondary small"
                              onClick={() => handleSendDraft(index)}
                              disabled={Boolean(sendInfo?.success) || isSending}
                              aria-busy={isSendingDefault}
                            >
                              {isSendingDefault ? <IconLoader /> : null}
                              {sendInfo?.success ? "Sent" : "Send"}
                            </button>
                            <button
                              type="button"
                              className="button small gmail-send-button"
                              onClick={() =>
                                handleSendDraft(index, { provider: "gmail" })
                              }
                              disabled={gmailDisabled}
                              aria-busy={isSendingGmail}
                              title={
                                gmailStatus !== "connected"
                                  ? "Connect Gmail to enable Gmail sending."
                                  : undefined
                              }
                            >
                              {isSendingGmail ? (
                                <IconLoader />
                              ) : (
                                <IconMail className="gmail-send-icon" />
                              )}
                              {sendInfo?.provider === "gmail" &&
                              sendInfo?.success
                                ? "Sent via Gmail"
                                : "Send via Gmail"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activePage === "cover" && (
            <div role="tabpanel" id="cover-panel" aria-labelledby="cover-tab">
              <CoverLetterWorkspace variant="embedded" />
            </div>
          )}
        </div>

        <div className="result-area">
          {errorMessage && (
            <div className="inline-result" role="alert">
              {errorMessage}
            </div>
          )}

          {inlineSummary &&
            !errorMessage &&
            lastAction === "view" &&
            activePage === "view" && (
              <div className="inline-result" aria-live="polite">
                {inlineSummary}
              </div>
            )}

          {resolvedViewRecords.length > 0 && (
            <div className="table-section">
              <div className="table-toolbar">
                <div className="table-search">
                  <label htmlFor="viewSearch" className="visually-hidden">
                    Search contacts
                  </label>
                  <input
                    id="viewSearch"
                    type="search"
                    className="table-search-input"
                    value={viewSearchTerm}
                    onChange={(event) => setViewSearchTerm(event.target.value)}
                    placeholder="Search contacts"
                  />
                </div>
                <div className="table-toolbar-actions">
                  <button
                    type="button"
                    className="table-refresh-button"
                    onClick={handleRefreshContacts}
                    disabled={disableSubmit}
                    aria-label="Refresh contacts"
                    aria-busy={loadingAction === "view"}
                  >
                    {loadingAction === "view" ? <IconLoader /> : <IconRefresh />}
                  </button>
                  <div className="table-page-size">
                    <label htmlFor="viewPageSize">Rows per page</label>
                    <select
                      id="viewPageSize"
                      value={viewResolvedPageSize}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setViewPageSize(
                          Number.isNaN(next) || next <= 0
                            ? TABLE_PAGE_SIZES[0]
                            : next,
                        );
                      }}
                    >
                      {TABLE_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="table-scroll">
                <table className="view-table">
                  {isSampleView && (
                    <caption className="view-table-caption">
                      Sample contact shown. Load a contact to see live data.
                    </caption>
                  )}
                  <thead>
                    <tr>
                      {viewColumns.map((column) => {
                        const isSorted = viewSort.key === column.id;
                        const ariaSort = isSorted
                          ? viewSort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none";
                        return (
                          <th
                            key={column.id}
                            scope="col"
                            aria-sort={ariaSort}
                            className={column.id === "local_id" ? "id-column" : ""}
                          >
                            <button
                              type="button"
                              className={`sort-button${
                                isSorted ? " active" : ""
                              }`}
                              onClick={() => handleViewSort(column.id)}
                            >
                              <span>{column.label}</span>
                              <span
                                className="sort-indicator"
                                aria-hidden="true"
                              >
                                {isSorted
                                  ? viewSort.direction === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {viewVisibleRecords.length === 0 ? (
                      <tr>
                        <td
                          className="empty-state-cell"
                          colSpan={viewColumns.length}
                        >
                          No contacts available.
                        </td>
                      </tr>
                    ) : (
                      viewVisibleRecords.map((record, index) => {
                        const contactIdValue = resolveContactId(record);
                        const key = contactIdValue || index;
                        const localIdValue =
                          record.local_id ??
                          record.localId ??
                          record.contact_id ??
                          record.contactId ??
                          contactIdValue;
                        const localIdDisplay = localIdValue
                          ? String(localIdValue)
                          : "—";
                        const profileLink = formatProfileHref(
                          record.profile_url ?? record.profileUrl,
                        );
                        const engagement = computeEngagementStatus(record);
                        const lastMessagedDisplay = formatTimestamp(
                          record.last_contacted ??
                            record.last_messaged ??
                            record.lastMessaged ??
                            record.last_contacted_at,
                        );
                        return (
                          <tr key={key}>
                            <td className="id-cell">{localIdDisplay}</td>
                            <td>{record.full_name ?? record.fullName ?? "—"}</td>
                            <td>{record.title ?? "—"}</td>
                            <td>{record.company ?? "—"}</td>
                            <td>{record.location ?? "—"}</td>
                            <td>
                              {profileLink ? (
                                <a
                                  href={profileLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
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
                                <span className="status-text">
                                  {engagement.label}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span className="table-summary">
                  {viewVisibleRecords.length === 0
                    ? "No contacts available."
                    : `Showing ${viewRangeStart} – ${viewRangeEnd} of ${viewTotalRecords}`}
                </span>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="page-button"
                    onClick={() =>
                      setViewPageIndex(Math.max(currentViewPageIndex - 1, 0))
                    }
                    disabled={currentViewPageIndex === 0}
                  >
                    Previous
                  </button>
                  {viewPageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`page-button${
                        page - 1 === currentViewPageIndex ? " active" : ""
                      }`}
                      onClick={() => setViewPageIndex(page - 1)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="page-button"
                    onClick={() =>
                      setViewPageIndex(
                        Math.min(currentViewPageIndex + 1, viewTotalPages - 1),
                      )
                    }
                    disabled={
                      viewTotalPages === 0 ||
                      currentViewPageIndex >= viewTotalPages - 1
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

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
