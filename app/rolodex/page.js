"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./rolodex.css";

const BUILTIN_PLACEHOLDERS = [
  {
    id: "contactName",
    label: "[contact name]",
    token: "{{contact.name}}",
    description: "The recipient's full name from the contacts table.",
    preview: "Alex Johnson",
  },
  {
    id: "contactEmail",
    label: "[contact email]",
    token: "{{contact.email}}",
    description: "Email address for the current contact row.",
    preview: "alex@palantir.com",
  },
  {
    id: "contactTitle",
    label: "[contact title]",
    token: "{{contact.title}}",
    description: "Job title pulled from your contacts list.",
    preview: "Senior Analyst",
  },
  {
    id: "company",
    label: "[company]",
    token: "{{company}}",
    description: "Company name provided in the context section.",
    preview: "Palantir",
  },
  {
    id: "companyDomain",
    label: "[company domain]",
    token: "{{companyDomain}}",
    description: "Domain for the company or project you want to mention.",
    preview: "palantir.com",
  },
  {
    id: "role",
    label: "[role]",
    token: "{{role}}",
    description: "Role you are referencing in the outreach.",
    preview: "Data Analyst",
  },
  {
    id: "studentName",
    label: "[your name]",
    token: "{{student.name}}",
    description: "Your name for signatures.",
    preview: "Denny",
  },
  {
    id: "studentSchool",
    label: "[your school]",
    token: "{{student.school}}",
    description: "School or program information.",
    preview: "UBC",
  },
  {
    id: "studentTrack",
    label: "[your track]",
    token: "{{student.track}}",
    description: "Discipline or track information.",
    preview: "Business Analytics",
  },
  {
    id: "draft",
    label: "[draft]",
    token: "{{draft}}",
    description: "Placeholder the AI will overwrite with a rewritten draft.",
    preview: "AI will write this",
  },
];

const DEFAULT_TEMPLATE = {
  to: "{{contact.email}}",
  subject: "",
  body: "Hi {{contact.name}},\n\n{{draft}}\n\nBest,\n{{student.name}}",
  repeat: { over: "contacts", as: "contact" },
};

const DEFAULT_DATASET = {
  student: { name: "", school: "", track: "" },
  role: "",
  company: "",
  companyDomain: "",
  contacts: [
    { id: createId(), name: "Alex Johnson", email: "alex@example.com", title: "Analyst", company: "Palantir", role: "Data Analyst" },
  ],
  facts: {},
};

const DEFAULT_OPTIONS = { batchSize: 25, dryRun: true };

const STORAGE_TEMPLATE_KEY = "rolodex-template-v2";
const STORAGE_DATASET_KEY = "rolodex-dataset-v2";
const STORAGE_PLACEHOLDERS_KEY = "rolodex-custom-placeholders-v2";
const STORAGE_RESULTS_KEY = "rolodex-results-v2";

function createId() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function insertTokenAtCursor(ref, token, updateValue) {
  const element = ref.current;
  if (!element) {
    return;
  }

  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const nextValue = `${element.value.slice(0, start)}${token}${element.value.slice(end)}`;
  updateValue(nextValue);

  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      element.focus();
      const caret = start + token.length;
      try {
        element.setSelectionRange(caret, caret);
      } catch (error) {
        // ignored: some inputs (like readOnly) may not accept selection.
      }
    });
  }
}

function getValueFromPath(scope, rawPath) {
  const path = rawPath.trim();
  if (!path) return "";
  const segments = path.split(".");
  let current = scope;
  for (const segment of segments) {
    if (current == null) {
      return "";
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
}

function renderTemplateString(templateText, scope) {
  if (!templateText) return "";
  return templateText.replace(/{{\s*([^}]+?)\s*}}/g, (match, path) => {
    if (path === "draft") {
      return "[AI will write this]";
    }
    const value = getValueFromPath(scope, path);
    return value === "" ? "" : value;
  });
}

function parseCsv(text) {
  const rows = [];
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\"") {
      if (inQuotes && text[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      cells.push(current);
      rows.push(cells.slice());
      cells.length = 0;
      current = "";
    } else {
      current += char;
    }
  }

  if (current !== "" || cells.length > 0) {
    cells.push(current);
    rows.push(cells.slice());
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function parseCsvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const records = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = row[index]?.trim() ?? "";
    });
    records.push(record);
  }
  return records;
}

function loadFromStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.warn(`Failed to parse storage item ${key}`, error);
    return fallback;
  }
}

function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => loadFromStorage(key, defaultValue));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function buildDatasetFacts(companyFactsState) {
  const nextFacts = {};
  for (const entry of companyFactsState) {
    const company = entry.company.trim();
    if (!company) continue;
    const facts = entry.facts.map((fact) => fact.trim()).filter(Boolean);
    if (facts.length > 0) {
      nextFacts[company] = facts;
    }
  }
  return nextFacts;
}

function seedFactsState(dataset) {
  const facts = dataset?.facts ?? {};
  const entries = Object.entries(facts);
  if (entries.length === 0) {
    return [
      {
        id: createId(),
        company: dataset?.company ?? "",
        facts: [],
      },
    ];
  }
  return entries.map(([company, factsList]) => ({
    id: createId(),
    company,
    facts: Array.isArray(factsList) ? factsList : [],
  }));
}

function RolodexPage() {
  const [template, setTemplate] = usePersistentState(STORAGE_TEMPLATE_KEY, DEFAULT_TEMPLATE);
  const [dataset, setDataset] = usePersistentState(STORAGE_DATASET_KEY, DEFAULT_DATASET);
  const [customPlaceholders, setCustomPlaceholders] = usePersistentState(STORAGE_PLACEHOLDERS_KEY, []);
  const [results, setResults] = usePersistentState(STORAGE_RESULTS_KEY, []);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [activeEditor, setActiveEditor] = useState("body");
  const [status, setStatus] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPreviewContact, setSelectedPreviewContact] = useState(() => dataset.contacts?.[0]?.id ?? "");
  const [factsState, setFactsState] = useState(() => seedFactsState(dataset));

  const toRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!template.repeat) {
      setTemplate((current) => ({
        ...current,
        repeat: { over: "contacts", as: "contact" },
      }));
    }
  }, [template.repeat, setTemplate]);

  useEffect(() => {
    const needsIds = dataset.contacts.some((contact) => !contact.id);
    if (needsIds) {
      setDataset((current) => ({
        ...current,
        contacts: current.contacts.map((contact) =>
          contact.id ? contact : { ...contact, id: createId() },
        ),
      }));
    }
  }, [dataset.contacts, setDataset]);

  useEffect(() => {
    setDataset((current) => {
      const nextFacts = buildDatasetFacts(factsState);
      const currentFacts = current.facts ?? {};
      if (JSON.stringify(currentFacts) === JSON.stringify(nextFacts)) {
        return current;
      }
      return { ...current, facts: nextFacts };
    });
  }, [factsState, setDataset]);

  useEffect(() => {
    if (!dataset.contacts.find((contact) => contact.id === selectedPreviewContact) && dataset.contacts.length > 0) {
      setSelectedPreviewContact(dataset.contacts[0].id);
    }
  }, [dataset.contacts, selectedPreviewContact]);

  const placeholderPalette = useMemo(
    () => [...BUILTIN_PLACEHOLDERS, ...customPlaceholders.map((placeholder) => ({ ...placeholder, isCustom: true }))],
    [customPlaceholders],
  );

  const previewContact = useMemo(
    () => dataset.contacts.find((contact) => contact.id === selectedPreviewContact) ?? dataset.contacts[0] ?? null,
    [dataset.contacts, selectedPreviewContact],
  );

  const previewScope = useMemo(() => ({
    ...dataset,
    contact: previewContact ?? {},
  }), [dataset, previewContact]);

  const previewSubject = useMemo(
    () => renderTemplateString(template.subject, previewScope),
    [template.subject, previewScope],
  );

  const previewBody = useMemo(
    () => renderTemplateString(template.body, previewScope),
    [template.body, previewScope],
  );

  const handleTemplateChange = useCallback((field, value) => {
    setTemplate((current) => ({
      ...current,
      [field]: value,
    }));
  }, [setTemplate]);

  const handleDatasetChange = useCallback((path, value) => {
    setDataset((current) => {
      if (path.startsWith("student.")) {
        const [, key] = path.split(".");
        return {
          ...current,
          student: { ...current.student, [key]: value },
        };
      }
      return { ...current, [path]: value };
    });
  }, [setDataset]);

  const handleInsertToken = useCallback((token) => {
    if (activeEditor === "subject") {
      insertTokenAtCursor(subjectRef, token, (nextValue) => handleTemplateChange("subject", nextValue));
      return;
    }
    if (activeEditor === "to") {
      insertTokenAtCursor(toRef, token, (nextValue) => handleTemplateChange("to", nextValue));
      return;
    }
    insertTokenAtCursor(bodyRef, token, (nextValue) => handleTemplateChange("body", nextValue));
  }, [activeEditor, handleTemplateChange]);

  const handleAddContact = () => {
    const blankContact = { id: createId(), name: "", email: "", title: "", company: dataset.company ?? "", role: dataset.role ?? "" };
    setDataset((current) => ({
      ...current,
      contacts: [...current.contacts, blankContact],
    }));
  };

  const handleContactChange = (id, field, value) => {
    setDataset((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)),
    }));
  };

  const handleRemoveContact = (id) => {
    setDataset((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.id !== id),
    }));
  };

  const handleClearContacts = () => {
    setDataset((current) => ({
      ...current,
      contacts: [],
    }));
  };

  const handleImportCsvClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsvToObjects(text);
      const importedContacts = parsed
        .map((row) => ({
          id: createId(),
          name: row.name ?? row.full_name ?? row["full name"] ?? "",
          email: row.email ?? row["email address"] ?? "",
          title: row.title ?? row.job_title ?? row["job title"] ?? "",
          company: row.company ?? dataset.company ?? "",
          role: row.role ?? dataset.role ?? "",
        }))
        .filter((contact) => contact.email);
      if (importedContacts.length === 0) {
        setStatus({ type: "error", message: "No contacts with email addresses found in the CSV." });
      } else {
        setDataset((current) => ({
          ...current,
          contacts: [...current.contacts, ...importedContacts],
        }));
        setStatus({ type: "success", message: `Imported ${importedContacts.length} contacts.` });
      }
    } catch (error) {
      console.error("CSV import failed", error);
      setStatus({ type: "error", message: "Could not import contacts from CSV." });
    } finally {
      event.target.value = "";
    }
  };

  const handleAddCustomPlaceholder = () => {
    const labelInput = window.prompt("Placeholder label", "[favourite thing]");
    if (!labelInput) return;
    const trimmedLabel = labelInput.trim();
    const label = trimmedLabel.startsWith("[") ? trimmedLabel : `[${trimmedLabel}]`;
    const pathInput = window.prompt("Data path (e.g. contact.website)");
    if (!pathInput) return;
    const path = pathInput.trim();
    if (!path) return;
    const token = `{{${path}}}`;
    const placeholder = {
      id: createId(),
      label,
      token,
      description: `Custom placeholder for ${path}.`,
      preview: path,
      isCustom: true,
    };
    setCustomPlaceholders((current) => [...current, placeholder]);
  };

  const handleRemovePlaceholder = (id) => {
    setCustomPlaceholders((current) => current.filter((placeholder) => placeholder.id !== id));
  };

  const handleSaveTemplate = () => {
    if (typeof window === "undefined") return;
    const savedTemplates = loadFromStorage("rolodex-saved-templates", []);
    const entry = {
      id: createId(),
      savedAt: new Date().toISOString(),
      template,
      placeholders: customPlaceholders,
    };
    window.localStorage.setItem("rolodex-saved-templates", JSON.stringify([entry, ...savedTemplates]));
    setStatus({ type: "success", message: "Template saved locally." });
  };

  const handleResetTemplate = () => {
    setTemplate({
      to: DEFAULT_TEMPLATE.to,
      subject: "",
      body: DEFAULT_TEMPLATE.body,
      repeat: { ...DEFAULT_TEMPLATE.repeat },
    });
    setResults([]);
    setStatus({ type: "success", message: "Template reset." });
  };

  const handlePreviewShortcut = () => {
    if (dataset.contacts.length === 0) {
      setStatus({ type: "error", message: "Add at least one contact to preview." });
      return;
    }
    setSelectedPreviewContact(dataset.contacts[0].id);
    setStatus({ type: "success", message: "Preview updated for the first contact." });
  };

  const handleGenerate = async () => {
    if (!template.body.includes("{{draft}}")) {
      setStatus({ type: "error", message: "Body must include the [draft] placeholder." });
      return;
    }
    if (dataset.contacts.length === 0) {
      setStatus({ type: "error", message: "Add at least one contact before generating." });
      return;
    }
    const invalidContact = dataset.contacts.find((contact) => !contact.email);
    if (invalidContact) {
      setStatus({ type: "error", message: "Every contact needs an email address before running the AI." });
      return;
    }

    const endpoint = process.env.NEXT_PUBLIC_N8N_REWRITE_URL;
    if (!endpoint) {
      setStatus({ type: "error", message: "N8N rewrite endpoint is not configured." });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: "info", message: "Requesting AI draft…" });
    try {
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/webhook/email-rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "email",
          template,
          dataset,
          options: { ...options, dryRun: true },
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const payload = await response.json();
      const emails = Array.isArray(payload.emails) ? payload.emails : [];
      setResults(emails.map((email) => ({ ...email, excluded: false })));
      setStatus({ type: "success", message: `AI generated ${emails.length} draft${emails.length === 1 ? "" : "s"}.` });
    } catch (error) {
      console.error("AI generate failed", error);
      setStatus({ type: "error", message: "Could not generate drafts with AI." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResultChange = (index, field, value) => {
    setResults((current) => {
      const next = current.slice();
      if (!next[index]) return current;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleResultExclude = (index, excluded) => {
    setResults((current) => {
      const next = current.slice();
      if (!next[index]) return current;
      next[index] = { ...next[index], excluded };
      return next;
    });
  };

  const handleFactCompanyChange = (id, company) => {
    setFactsState((current) => current.map((entry) => (entry.id === id ? { ...entry, company } : entry)));
  };

  const handleFactChange = (entryId, factIndex, value) => {
    setFactsState((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) return entry;
        const facts = entry.facts.slice();
        facts[factIndex] = value;
        return { ...entry, facts };
      }),
    );
  };

  const handleAddFact = (entryId) => {
    setFactsState((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, facts: [...entry.facts, ""] } : entry,
      ),
    );
  };

  const handleRemoveFact = (entryId, factIndex) => {
    setFactsState((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) return entry;
        const facts = entry.facts.slice();
        facts.splice(factIndex, 1);
        return { ...entry, facts };
      }),
    );
  };

  const handleAddFactsEntry = () => {
    setFactsState((current) => [...current, { id: createId(), company: "", facts: [] }]);
  };

  const removeFactsEntry = (entryId) => {
    setFactsState((current) => current.filter((entry) => entry.id !== entryId));
  };

  const recentRecipientOptions = useMemo(() => dataset.contacts.slice(0, 5), [dataset.contacts]);

  return (
    <div className="rolodex-page">
      {status && (
        <div className={`status-bar status-${status.type}`} role="status">
          <span>{status.message}</span>
          <button type="button" onClick={() => setStatus(null)} className="status-dismiss" aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="rolodex-card">
        <header className="section-header">
          <h1>Email composer</h1>
          <p>Create a personalised outreach email using tokens for contacts and context.</p>
        </header>
        <div className="field-grid">
          <label className="field">
            <span>From</span>
            <input type="text" value="denny@networkingbot.ca" readOnly className="input" />
          </label>
          <label className="field">
            <span>To</span>
            <input
              ref={toRef}
              className="input"
              value={template.to}
              onFocus={() => setActiveEditor("to")}
              onChange={(event) => handleTemplateChange("to", event.target.value)}
              placeholder="{{contact.email}}"
            />
            {recentRecipientOptions.length > 0 && (
              <div className="recent-recipient-row" aria-label="Recent contacts">
            {recentRecipientOptions.map((contact) => {
              const isSelected = template.to.includes(contact.email);
              return (
                <label key={contact.id} className="recent-chip">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setTemplate((current) => {
                            if (checked) {
                              const next = current.to.includes(contact.email)
                                ? current.to
                                : `${current.to ? `${current.to}, ` : ""}${contact.email}`;
                              return { ...current, to: next };
                            }
                            const filtered = current.to
                              .split(/,\s*/)
                              .filter((value) => value && value !== contact.email);
                            return { ...current, to: filtered.join(", ") };
                          });
                        }}
                      />
                      <span>{contact.email}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </label>
        </div>
        <div className="placeholder-bar">
          <span className="placeholder-label">Placeholders</span>
          <div className="placeholder-chip-row">
            {placeholderPalette.map((placeholder) => (
              <button
                key={placeholder.id}
                type="button"
                className="placeholder-chip"
                title={placeholder.preview ? `${placeholder.description}\nExample: ${placeholder.preview}` : placeholder.description}
                onClick={() => handleInsertToken(placeholder.token)}
              >
                {placeholder.label}
                {placeholder.isCustom && (
                  <span
                    className="remove-placeholder"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemovePlaceholder(placeholder.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRemovePlaceholder(placeholder.id);
                      }
                    }}
                    aria-label="Remove custom placeholder"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            <button type="button" className="placeholder-chip add-placeholder" onClick={handleAddCustomPlaceholder}>
              + Add placeholder…
            </button>
          </div>
        </div>
        <div className="template-fields">
          <label className="field">
            <span>Subject</span>
            <input
              ref={subjectRef}
              className="input"
              value={template.subject}
              onFocus={() => setActiveEditor("subject")}
              onChange={(event) => handleTemplateChange("subject", event.target.value)}
              placeholder="Interest in {{role}} at {{company}}"
            />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea
              ref={bodyRef}
              className="textarea"
              value={template.body}
              onFocus={() => setActiveEditor("body")}
              onChange={(event) => handleTemplateChange("body", event.target.value)}
              rows={10}
            />
          </label>
        </div>
        <div className="actions-row">
          <button type="button" onClick={handleSaveTemplate} className="secondary">Save as template</button>
          <button type="button" onClick={handleResetTemplate} className="secondary">Reset</button>
          <button type="button" onClick={handlePreviewShortcut} className="secondary">Preview</button>
          <button type="button" onClick={handleGenerate} className="primary" disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate with AI (dry run)"}
          </button>
        </div>
      </section>

      <section className="rolodex-card">
        <header className="section-header">
          <h2>Context</h2>
          <p>Provide details that help personalise each draft.</p>
        </header>
        <div className="context-grid">
          <label className="field">
            <span>Role</span>
            <input
              className="input"
              value={dataset.role}
              onChange={(event) => handleDatasetChange("role", event.target.value)}
              placeholder="Data Analyst"
            />
          </label>
          <label className="field">
            <span>Company</span>
            <input
              className="input"
              value={dataset.company}
              onChange={(event) => handleDatasetChange("company", event.target.value)}
              placeholder="Palantir"
            />
          </label>
          <label className="field">
            <span>Company domain</span>
            <input
              className="input"
              value={dataset.companyDomain ?? ""}
              onChange={(event) => handleDatasetChange("companyDomain", event.target.value)}
              placeholder="palantir.com"
            />
          </label>
          <label className="field">
            <span>Your name</span>
            <input
              className="input"
              value={dataset.student?.name ?? ""}
              onChange={(event) => handleDatasetChange("student.name", event.target.value)}
              placeholder="Denny"
            />
          </label>
          <label className="field">
            <span>Your school</span>
            <input
              className="input"
              value={dataset.student?.school ?? ""}
              onChange={(event) => handleDatasetChange("student.school", event.target.value)}
              placeholder="UBC"
            />
          </label>
          <label className="field">
            <span>Your track</span>
            <input
              className="input"
              value={dataset.student?.track ?? ""}
              onChange={(event) => handleDatasetChange("student.track", event.target.value)}
              placeholder="Business Analytics"
            />
          </label>
        </div>

        <div className="facts-block">
          <div className="facts-header">
            <h3>Company facts</h3>
            <button type="button" className="secondary" onClick={handleAddFactsEntry}>
              Add company
            </button>
          </div>
          {factsState.map((entry) => (
            <div key={entry.id} className="facts-entry">
              <div className="facts-entry-header">
                <label className="field">
                  <span>Company</span>
                  <input
                    className="input"
                    value={entry.company}
                    onChange={(event) => handleFactCompanyChange(entry.id, event.target.value)}
                    placeholder="Company name"
                  />
                </label>
                <button type="button" className="link" onClick={() => removeFactsEntry(entry.id)}>
                  Remove
                </button>
              </div>
              <ul className="facts-list">
                {entry.facts.map((fact, index) => (
                  <li key={`${entry.id}-${index}`} className="facts-item">
                    <input
                      className="input"
                      value={fact}
                      onChange={(event) => handleFactChange(entry.id, index, event.target.value)}
                      placeholder="Add a fact about this company"
                    />
                    <button type="button" className="link" onClick={() => handleRemoveFact(entry.id, index)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="secondary" onClick={() => handleAddFact(entry.id)}>
                Add fact
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rolodex-card">
        <header className="section-header">
          <h2>Contacts</h2>
          <p>Maintain the list of recipients for this sequence.</p>
        </header>
        <div className="contacts-actions">
          <button type="button" className="secondary" onClick={handleAddContact}>Add row</button>
          <button type="button" className="secondary" onClick={handleImportCsvClick}>Import CSV</button>
          <button type="button" className="link" onClick={handleClearContacts}>Clear</button>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleCsvSelected} />
        </div>
        <div className="contacts-table-wrapper">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Title</th>
                <th>Company</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dataset.contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">Add contacts manually or import a CSV file.</td>
                </tr>
              ) : (
                dataset.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <input
                        className="input"
                        value={contact.name}
                        onChange={(event) => handleContactChange(contact.id, "name", event.target.value)}
                        placeholder="Alex Johnson"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={contact.email}
                        onChange={(event) => handleContactChange(contact.id, "email", event.target.value)}
                        placeholder="alex@example.com"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={contact.title ?? ""}
                        onChange={(event) => handleContactChange(contact.id, "title", event.target.value)}
                        placeholder="Analyst"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={contact.company ?? ""}
                        onChange={(event) => handleContactChange(contact.id, "company", event.target.value)}
                        placeholder="Palantir"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={contact.role ?? ""}
                        onChange={(event) => handleContactChange(contact.id, "role", event.target.value)}
                        placeholder="Data Analyst"
                      />
                    </td>
                    <td className="actions-cell">
                      <button type="button" className="link" onClick={() => handleRemoveContact(contact.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rolodex-card">
        <header className="section-header">
          <h2>Preview</h2>
          <p>Review the email using real contact data before sending.</p>
        </header>
        <div className="preview-controls">
          <label className="field">
            <span>Preview contact</span>
            <select
              className="input"
              value={selectedPreviewContact}
              onChange={(event) => setSelectedPreviewContact(event.target.value)}
            >
              {dataset.contacts.length === 0 && <option value="">No contacts available</option>}
              {dataset.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name || contact.email || "Unnamed contact"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="preview-panel">
          <div className="preview-item">
            <h3>Subject</h3>
            <p className="preview-text">{previewSubject || "Subject preview will appear here."}</p>
          </div>
          <div className="preview-item">
            <h3>Body</h3>
            <pre className="preview-text">{previewBody || "Body preview will appear here."}</pre>
          </div>
        </div>
        {results.length > 0 && (
          <div className="ai-results">
            <h3>AI results</h3>
            <p className="ai-results-subtitle">Edit or exclude drafts before sending them downstream.</p>
            <ul className="ai-results-list">
              {results.map((result, index) => (
                <li key={`result-${index}`} className={`ai-result ${result.excluded ? "ai-result-muted" : ""}`}>
                  <div className="ai-result-header">
                    <strong>{result.to}</strong>
                    <label className="exclude-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(result.excluded)}
                        onChange={(event) => handleResultExclude(index, event.target.checked)}
                      />
                      Exclude
                    </label>
                  </div>
                  <label className="field">
                    <span>Subject</span>
                    <input
                      className="input"
                      value={result.subject}
                      onChange={(event) => handleResultChange(index, "subject", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Body</span>
                    <textarea
                      className="textarea"
                      rows={6}
                      value={result.body}
                      onChange={(event) => handleResultChange(index, "body", event.target.value)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export default RolodexPage;
