"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const EMAIL_REGEX = /.+@.+\..+/;

const TEMPLATE_STORAGE_KEY = "rolodex-email-template";
const PLACEHOLDER_STORAGE_KEY = "rolodex-email-custom-placeholders";

export const DEFAULT_TEMPLATE = {
  to: ["{{contact.email}}"],
  subject: "",
  body: "",
  role: "",
  company: "",
  studentName: "",
  studentSchool: "",
};

const BUILT_IN_PLACEHOLDERS = [
  { id: "contact.name", label: "[contact name]", token: "{{contact.name}}" },
  { id: "contact.email", label: "[contact email]", token: "{{contact.email}}" },
  { id: "company", label: "[company]", token: "{{company}}" },
  { id: "role", label: "[role]", token: "{{role}}" },
  { id: "student.name", label: "[your name]", token: "{{student.name}}" },
  { id: "student.school", label: "[your school]", token: "{{student.school}}" },
  { id: "draft", label: "[draft]", token: "{{draft}}" },
];

export function useEmailTemplate({ pushToast, subjectRef, bodyRef }) {
  const [toChips, setToChips] = useState(() => [...DEFAULT_TEMPLATE.to]);
  const [toInputValue, setToInputValue] = useState("");
  const [subject, setSubject] = useState(DEFAULT_TEMPLATE.subject);
  const [emailBody, setEmailBody] = useState(DEFAULT_TEMPLATE.body);
  const [campaignRole, setCampaignRole] = useState(DEFAULT_TEMPLATE.role);
  const [campaignCompany, setCampaignCompany] = useState(DEFAULT_TEMPLATE.company);
  const [studentName, setStudentName] = useState(DEFAULT_TEMPLATE.studentName);
  const [studentSchool, setStudentSchool] = useState(DEFAULT_TEMPLATE.studentSchool);
  const [customPlaceholders, setCustomPlaceholders] = useState([]);
  const [lastFocusedField, setLastFocusedField] = useState("body");

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
          setSubject(parsed.subject ?? DEFAULT_TEMPLATE.subject);
          setEmailBody(parsed.body ?? DEFAULT_TEMPLATE.body);
          setCampaignRole(parsed.role ?? DEFAULT_TEMPLATE.role);
          setCampaignCompany(parsed.company ?? DEFAULT_TEMPLATE.company);
          setStudentName(parsed.studentName ?? DEFAULT_TEMPLATE.studentName);
          setStudentSchool(parsed.studentSchool ?? DEFAULT_TEMPLATE.studentSchool);
        }
      }
    } catch (error) {
      console.warn("Failed to load stored email template", error);
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
        (chip) => chip && chip !== "{{contact.email}}" && !EMAIL_REGEX.test(chip)
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
        pushToast?.("error", "Enter a valid email or use {{contact.email}}.");
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
      const element = targetRef?.current;
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
    [bodyRef, emailBody, lastFocusedField, subject, subjectRef]
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
      pushToast?.("error", "Placeholder label and path are required.");
      return;
    }
    const cleanedPath = normalizedPath.replace(/^{{\s*/, "").replace(/\s*}}$/, "");
    const token = `{{${cleanedPath}}}`;
    if (
      customPlaceholders.some((item) => item.token === token) ||
      BUILT_IN_PLACEHOLDERS.some((item) => item.token === token)
    ) {
      pushToast?.("info", "Placeholder already exists.");
      return;
    }
    const id = `${cleanedPath}-${Date.now().toString(36)}`;
    setCustomPlaceholders((prev) => [...prev, { id, label, token }]);
    pushToast?.("success", "Placeholder added.");
  }, [customPlaceholders, pushToast]);

  const handleSaveTemplate = useCallback(() => {
    if (typeof window === "undefined") {
      pushToast?.("error", "Local storage is unavailable.");
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
      pushToast?.("success", "Template saved to this browser.");
    } catch (error) {
      pushToast?.("error", "Unable to save the template.");
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

  const resetTemplate = useCallback(() => {
    setToChips([...DEFAULT_TEMPLATE.to]);
    setSubject(DEFAULT_TEMPLATE.subject);
    setEmailBody(DEFAULT_TEMPLATE.body);
    setCampaignRole(DEFAULT_TEMPLATE.role);
    setCampaignCompany(DEFAULT_TEMPLATE.company);
    setStudentName(DEFAULT_TEMPLATE.studentName);
    setStudentSchool(DEFAULT_TEMPLATE.studentSchool);
    setToInputValue("");
    pushToast?.("info", "Template cleared.");
  }, [pushToast]);

  return {
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
    lastFocusedField,
    resetTemplate,
  };
}
