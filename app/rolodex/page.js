"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDefaultStateSnapshot,
  useComposerStore,
} from "./store";
import "./rolodex.css";

const TOKEN_PATTERN = /{{\s*([^}]+)\s*}}/g;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function insertTokenAtCursor(ref, value, token, onChange) {
  const element = ref.current;
  if (!element) {
    onChange(value + token);
    return;
  }
  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    element.focus();
    const caret = start + token.length;
    element.setSelectionRange(caret, caret);
  });
}

function dedupeContacts(contacts) {
  const seen = new Set();
  const result = [];
  contacts.forEach((contact) => {
    const email = (contact.email ?? "").trim().toLowerCase();
    if (!email || seen.has(email)) {
      return;
    }
    seen.add(email);
    result.push(contact);
  });
  return result;
}

function safeString(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function resolveToken(path, scope) {
  const trimmed = path.trim();
  if (trimmed === "draft") {
    return "[AI will write this]";
  }
  const segments = trimmed.split(".");
  let cursor = scope;
  for (const segment of segments) {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      cursor = cursor[segment];
    } else {
      return "";
    }
  }
  return safeString(cursor);
}

function buildScope(dataset, contact) {
  const scope = { ...dataset.extras };
  if (dataset.student) {
    scope.student = { ...dataset.student };
  }
  if (dataset.role) {
    scope.role = dataset.role;
  }
  if (dataset.company) {
    scope.company = dataset.company;
  }
  if (dataset.companyDomain) {
    scope.companyDomain = dataset.companyDomain;
  }
  if (dataset.facts) {
    scope.facts = dataset.facts;
  }
  scope.contact = contact ?? {};
  return scope;
}

function renderTemplate(template, dataset, contact) {
  const scope = buildScope(dataset, contact);
  const replaceTokens = (text) =>
    text.replace(TOKEN_PATTERN, (_, token) => resolveToken(token, scope));
  return {
    to: replaceTokens(template.to),
    subject: replaceTokens(template.subject),
    body: replaceTokens(template.body),
  };
}

function parseFactsText(text) {
  if (!text.trim()) return {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const facts = {};
  lines.forEach((line) => {
    const [company, values] = line.split(":");
    if (!values) {
      throw new Error("Use the format `Company: fact | fact`." );
    }
    const key = company.trim();
    if (!key) {
      return;
    }
    const items = values
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    facts[key] = items;
  });
  return facts;
}

function factsToText(facts) {
  if (!facts) return "";
  return Object.entries(facts)
    .map(([company, values]) => `${company}: ${(values ?? []).join(" | ")}`)
    .join("\n");
}

function parseExtrasText(text) {
  if (!text.trim()) return {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extras = {};
  lines.forEach((line) => {
    const [rawKey, ...rawValue] = line.split("=");
    if (!rawValue.length) {
      throw new Error("Use the format `key=value` for each line.");
    }
    const key = rawKey.trim();
    if (!key) return;
    extras[key] = rawValue.join("=").trim();
  });
  return extras;
}

function extrasToText(extras) {
  if (!extras) return "";
  return Object.entries(extras)
    .map(([key, value]) => `${key}=${safeString(value)}`)
    .join("\n");
}

function parseSimpleCsv(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line
      .split(",")
      .map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
}

function mapCsvToContacts(records, fallbackCompany = "") {
  return records.map((record) => ({
    name:
      record.name ??
      record.full_name ??
      record["contact name"] ??
      record["Contact Name"] ??
      "",
    email:
      record.email ??
      record["email address"] ??
      record["Email"] ??
      record["Email Address"] ??
      "",
    title: record.title ?? record.role ?? record.position ?? "",
    company: record.company ?? fallbackCompany ?? "",
    role: record.role ?? record.position ?? "",
  }));
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function validateEmail(value) {
  if (!value) return false;
  return EMAIL_REGEX.test(value.trim());
}

export default function EmailComposerPage() {
  const template = useComposerStore((state) => state.template);
  const dataset = useComposerStore((state) => state.dataset);
  const placeholders = useComposerStore((state) => state.placeholders);
  const options = useComposerStore((state) => state.options);
  const results = useComposerStore((state) => state.results);
  const setTemplateField = useComposerStore((state) => state.setTemplateField);
  const updateContact = useComposerStore((state) => state.updateContact);
  const addContact = useComposerStore((state) => state.addContact);
  const removeContact = useComposerStore((state) => state.removeContact);
  const replaceContacts = useComposerStore((state) => state.replaceContacts);
  const setFacts = useComposerStore((state) => state.setFacts);
  const setExtras = useComposerStore((state) => state.setExtras);
  const addPlaceholder = useComposerStore((state) => state.addPlaceholder);
  const removePlaceholder = useComposerStore((state) => state.removePlaceholder);
  const setOptions = useComposerStore((state) => state.setOptions);
  const setResults = useComposerStore((state) => state.setResults);
  const updateResult = useComposerStore((state) => state.updateResult);
  const clearResults = useComposerStore((state) => state.clearResults);
  const resetTemplate = useComposerStore((state) => state.resetTemplate);
  const resetAll = useComposerStore((state) => state.resetAll);
  const markSaved = useComposerStore((state) => state.markSaved);
  const setDatasetField = useComposerStore((state) => state.setDatasetField);
  const drafts = useComposerStore((state) => state.drafts);

  const toRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  const [activeField, setActiveField] = useState("body");
  const [factsDraft, setFactsDraft] = useState(() => factsToText(dataset.facts));
  const [extrasDraft, setExtrasDraft] = useState(() => extrasToText(dataset.extras));
  const [factsError, setFactsError] = useState("");
  const [extrasError, setExtrasError] = useState("");
  const [importError, setImportError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContactId, setPreviewContactId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("emailComposerDraft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        useComposerStore.getState().loadState(parsed);
      } catch (error) {
        console.warn("Could not load saved draft", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const unsubscribe = useComposerStore.subscribe(
      (snapshot) => {
        try {
          window.localStorage.setItem(
            "emailComposerDraft",
            JSON.stringify(snapshot)
          );
        } catch (error) {
          console.warn("Autosave failed", error);
        }
      },
      (state) => ({
        template: state.template,
        dataset: state.dataset,
        placeholders: state.placeholders,
      }),
      () => false
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    setFactsDraft(factsToText(dataset.facts));
  }, [dataset.facts]);

  useEffect(() => {
    setExtrasDraft(extrasToText(dataset.extras));
  }, [dataset.extras]);

  const dedupedContacts = useMemo(
    () => dedupeContacts(dataset.contacts ?? []),
    [dataset.contacts]
  );

  useEffect(() => {
    if (!previewContactId && dedupedContacts.length > 0) {
      setPreviewContactId(dedupedContacts[0].email ?? "");
    }
  }, [dedupedContacts, previewContactId]);

  const previewContact = useMemo(
    () =>
      dedupedContacts.find(
        (contact) => (contact.email ?? "").toLowerCase() === previewContactId.toLowerCase()
      ) ?? null,
    [dedupedContacts, previewContactId]
  );

  const previewContent = useMemo(() => {
    if (!previewContact) {
      return {
        to: template.to,
        subject: template.subject,
        body: template.body,
      };
    }
    return renderTemplate(template, dataset, previewContact);
  }, [template, dataset, previewContact]);

  const missingDraftToken = !template.body.includes("{{draft}}");
  const invalidContacts = dataset.contacts
    .map((contact, index) => ({
      index,
      isValid: validateEmail(contact.email),
    }))
    .filter((entry) => !entry.isValid);

  const manualRecipients = options.manualRecipients ?? [];

  const handleChipInsert = (token) => {
    const active = activeField;
    if (active === "to") {
      insertTokenAtCursor(toRef, template.to, token, (next) =>
        setTemplateField("to", next)
      );
      return;
    }
    if (active === "subject") {
      insertTokenAtCursor(subjectRef, template.subject, token, (next) =>
        setTemplateField("subject", next)
      );
      return;
    }
    insertTokenAtCursor(bodyRef, template.body, token, (next) =>
      setTemplateField("body", next)
    );
  };

  const handleAddPlaceholder = () => {
    const label = window.prompt("Label for the placeholder (e.g., [favourite link])");
    if (!label) return;
    const dataPath = window.prompt(
      "Data path (e.g., contact.website or student.portfolioUrl)"
    );
    if (!dataPath) return;
    const token = `{{${dataPath.trim()}}}`;
    const chipLabel = label.startsWith("[") ? label : `[${label}]`;
    addPlaceholder({ label: chipLabel, token });
    setStatusMessage(`Added placeholder ${chipLabel}.`);
  };

  const handleRemovePlaceholder = (label) => {
    if (!window.confirm(`Remove placeholder ${label}?`)) return;
    removePlaceholder(label);
  };

  const handleFactsBlur = () => {
    try {
      const parsed = parseFactsText(factsDraft);
      setFacts(parsed);
      setFactsError("");
    } catch (error) {
      setFactsError(error.message);
    }
  };

  const handleExtrasBlur = () => {
    try {
      const parsed = parseExtrasText(extrasDraft);
      setExtras(parsed);
      setExtrasError("");
    } catch (error) {
      setExtrasError(error.message);
    }
  };

  const handleCsvImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const records = parseSimpleCsv(text);
        const mapped = mapCsvToContacts(records, dataset.company ?? "");
        if (mapped.length === 0) {
          throw new Error("No rows detected in the CSV.");
        }
        replaceContacts(mapped);
        setImportError("");
        setStatusMessage(`Imported ${mapped.length} contacts.`);
      } catch (error) {
        setImportError(error.message);
      }
    };
    reader.onerror = () => setImportError("Could not read CSV file.");
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleSaveTemplate = () => {
    if (typeof window === "undefined") return;
    try {
      const entry = {
        template,
        placeholders,
        savedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(
        window.localStorage.getItem("emailTemplates") ?? "[]"
      );
      existing.unshift(entry);
      window.localStorage.setItem(
        "emailTemplates",
        JSON.stringify(existing.slice(0, 20))
      );
      markSaved();
      setStatusMessage("Template saved locally.");
    } catch (error) {
      setStatusMessage("Could not save template.");
      console.warn("Template save failed", error);
    }
  };

  const handleReset = () => {
    clearResults();
    resetTemplate();
    setStatusMessage("Template reset.");
  };

  const handlePreviewShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      setStatusMessage("Preview updated.");
    }
  };

  const handleManualRecipientToggle = (email) => {
    const current = new Set(manualRecipients);
    if (current.has(email)) {
      current.delete(email);
    } else {
      current.add(email);
    }
    setOptions({ manualRecipients: Array.from(current) });
  };

  const handleGenerate = async () => {
    setStatusMessage("");
    if (!template.to.trim() || !template.subject.trim() || !template.body.trim()) {
      setStatusMessage("Please complete To, Subject, and Body before generating.");
      return;
    }
    if (missingDraftToken) {
      setStatusMessage("Add the {{draft}} placeholder to the body before generating.");
      return;
    }
    const validContacts = dedupedContacts.filter((contact) => validateEmail(contact.email));
    if (validContacts.length === 0) {
      setStatusMessage("Add at least one contact with an email address.");
      return;
    }
    const endpoint = process.env.NEXT_PUBLIC_N8N_REWRITE_URL;
    if (!endpoint) {
      setStatusMessage("Missing rewrite endpoint configuration.");
      return;
    }
    setIsGenerating(true);
    clearResults();
    try {
      const payload = {
        template,
        dataset: {
          student: dataset.student,
          role: dataset.role || undefined,
          company: dataset.company || undefined,
          companyDomain: dataset.companyDomain || undefined,
          contacts: validContacts,
          facts: Object.keys(dataset.facts || {}).length ? dataset.facts : undefined,
          ...(dataset.extras || {}),
        },
        options: {
          batchSize: options.batchSize,
          dryRun: options.dryRun,
          manualRecipients,
        },
      };
      const response = await fetch(`${endpoint}/webhook/email-rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || "Request failed");
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        const fallback = validContacts.map((contact) => ({
          to: contact.email,
          subject: template.subject,
          body: template.body,
          error: "Could not parse AI output.",
          excluded: false,
        }));
        setResults(fallback);
        setStatusMessage("AI response was not valid JSON. Filled with defaults.");
        return;
      }
      const emails = Array.isArray(parsed?.emails) ? parsed.emails : [];
      if (!emails.length) {
        const fallback = validContacts.map((contact) => ({
          to: contact.email,
          subject: template.subject,
          body: template.body,
          error: "No email returned for this contact.",
          excluded: false,
        }));
        setResults(fallback);
        setStatusMessage("AI response did not include emails. Showing defaults.");
        return;
      }
      setResults(
        emails.map((email) => ({
          to: email.to ?? "",
          subject: email.subject ?? template.subject,
          body: email.body ?? template.body,
          excluded: false,
        }))
      );
      setStatusMessage(`AI generated ${emails.length} email${emails.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error("AI generation failed", error);
      setStatusMessage(error.message || "Could not reach the rewrite service.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadDefault = () => {
    const snapshot = getDefaultStateSnapshot();
    useComposerStore.getState().loadState(snapshot);
    clearResults();
    setStatusMessage("Reverted to default template.");
  };

  const handleExcludeToggle = (index) => {
    const current = results[index];
    updateResult(index, { excluded: !current?.excluded });
  };

  const quickEmailOptions = useMemo(
    () => dedupedContacts.slice(0, 5).map((contact) => contact.email).filter(Boolean),
    [dedupedContacts]
  );

  return (
    <main className="composer-page">
      <div className="composer-header">
        <div className="field-group">
          <label htmlFor="from-mailbox">From mailbox</label>
          <select id="from-mailbox" className="input" defaultValue="primary">
            <option value="primary">Primary mailbox</option>
            <option value="secondary">Secondary mailbox</option>
          </select>
        </div>
        <div className="field-group field-to">
          <label htmlFor="to-field">To</label>
          <input
            id="to-field"
            ref={toRef}
            className="input"
            value={template.to}
            onChange={(event) => setTemplateField("to", event.target.value)}
            onFocus={() => setActiveField("to")}
            placeholder="{{contact.email}}"
          />
          {quickEmailOptions.length > 0 && (
            <div className="quick-checkboxes">
              {quickEmailOptions.map((email) => (
                <label key={email} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={manualRecipients.includes(email)}
                    onChange={() => handleManualRecipientToggle(email)}
                  />
                  <span>{email}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="placeholder-bar" aria-label="Drag and drop placeholders">
        <h2>Placeholders</h2>
        <div className="chip-list" role="list">
          {placeholders.map((placeholder) => (
            <button
              key={placeholder.label}
              type="button"
              className={`chip ${placeholder.token === "{{draft}}" ? "chip-draft" : ""}`}
              onClick={() => handleChipInsert(placeholder.token)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleChipInsert(placeholder.token);
                }
              }}
            >
              <span>{placeholder.label}</span>
              {!placeholder.label.includes("draft") && placeholder.token.startsWith("{{contact") ? (
                <span className="chip-hint">contact</span>
              ) : null}
              {placeholder.label.startsWith("[") && !placeholder.label.includes("contact") ? (
                <span className="chip-hint">token</span>
              ) : null}
              {![
                "{{contact.name}}",
                "{{contact.email}}",
                "{{contact.title}}",
                "{{company}}",
                "{{companyDomain}}",
                "{{role}}",
                "{{student.name}}",
                "{{student.school}}",
                "{{student.track}}",
                "{{draft}}",
              ].includes(placeholder.token) ? (
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remove ${placeholder.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemovePlaceholder(placeholder.label);
                  }}
                >
                  ×
                </button>
              ) : null}
            </button>
          ))}
          <button type="button" className="chip add-chip" onClick={handleAddPlaceholder}>
            + Add placeholder…
          </button>
        </div>
      </section>

      <section className="template-section">
        <div className="field-group">
          <label htmlFor="subject-field">Subject</label>
          <input
            id="subject-field"
            ref={subjectRef}
            className="input"
            value={template.subject}
            onChange={(event) => setTemplateField("subject", event.target.value)}
            onFocus={() => setActiveField("subject")}
            onKeyDown={handlePreviewShortcut}
            placeholder="Share a quick note with {{contact.name}}"
          />
        </div>
        <div className="field-group">
          <label htmlFor="body-field">Body</label>
          <textarea
            id="body-field"
            ref={bodyRef}
            className="textarea"
            value={template.body}
            onChange={(event) => setTemplateField("body", event.target.value)}
            onFocus={() => setActiveField("body")}
            onKeyDown={handlePreviewShortcut}
            rows={12}
          />
        </div>
        {missingDraftToken && (
          <div className="banner warning" role="alert">
            Add the <code>{"{{draft}}"}</code> placeholder to the body so the AI can finish the email.
          </div>
        )}
      </section>

      <section className="actions" aria-label="Composer actions">
        <button type="button" onClick={handleSaveTemplate} className="button">
          Save as template
        </button>
        <button type="button" onClick={handleReset} className="button ghost">
          Reset
        </button>
        <button type="button" onClick={handleLoadDefault} className="button ghost">
          Load defaults
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="button primary"
          disabled={isGenerating}
        >
          {isGenerating ? "Generating…" : "Generate with AI (dry run)"}
        </button>
      </section>

      {statusMessage && (
        <p className="status-message" role="status">
          {statusMessage}
        </p>
      )}

      <div className="layout">
        <section className="panel contacts-panel">
          <header>
            <h2>Contacts</h2>
            <div className="panel-actions">
              <label className="button ghost file-button">
                Import CSV
                <input type="file" accept=".csv" onChange={handleCsvImport} />
              </label>
              <button type="button" className="button ghost" onClick={addContact}>
                Add contact
              </button>
              <button type="button" className="button ghost" onClick={resetAll}>
                Clear all
              </button>
            </div>
          </header>
          {importError && <p className="error">{importError}</p>}
          <div className="contacts-table" role="table" aria-label="Contacts">
            <div className="contacts-header" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Email</span>
              <span role="columnheader">Title</span>
              <span role="columnheader">Company</span>
              <span role="columnheader">Role</span>
              <span role="columnheader" className="sr-only">
                Actions
              </span>
            </div>
            {dataset.contacts.length === 0 && (
              <p className="empty">Add contacts manually or import a CSV.</p>
            )}
            {dataset.contacts.map((contact, index) => {
              const isEmailValid = validateEmail(contact.email);
              return (
                <div className="contacts-row" role="row" key={`contact-${index}`}>
                  <input
                    className="cell-input"
                    value={contact.name}
                    onChange={(event) =>
                      updateContact(index, { name: event.target.value })
                    }
                    placeholder="Aiko"
                  />
                  <input
                    className={`cell-input ${isEmailValid ? "" : "input-error"}`}
                    value={contact.email}
                    onChange={(event) =>
                      updateContact(index, { email: event.target.value })
                    }
                    placeholder="aiko@example.com"
                  />
                  <input
                    className="cell-input"
                    value={contact.title}
                    onChange={(event) =>
                      updateContact(index, { title: event.target.value })
                    }
                    placeholder="Editor"
                  />
                  <input
                    className="cell-input"
                    value={contact.company}
                    onChange={(event) =>
                      updateContact(index, { company: event.target.value })
                    }
                    placeholder="Houzz"
                  />
                  <input
                    className="cell-input"
                    value={contact.role}
                    onChange={(event) =>
                      updateContact(index, { role: event.target.value })
                    }
                    placeholder="Partner"
                  />
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => removeContact(index)}
                    aria-label={`Remove contact ${contact.name || contact.email || index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          {invalidContacts.length > 0 && (
            <p className="error">
              {invalidContacts.length} contact{invalidContacts.length === 1 ? "" : "s"} need a valid email.
            </p>
          )}

          <fieldset className="context-grid">
            <legend>Context</legend>
            <label>
              Student name
              <input
                className="input"
                value={dataset.student?.name ?? ""}
                onChange={(event) =>
                  setDatasetField("student.name", event.target.value)
                }
              />
            </label>
            <label>
              Student school
              <input
                className="input"
                value={dataset.student?.school ?? ""}
                onChange={(event) =>
                  setDatasetField("student.school", event.target.value)
                }
              />
            </label>
            <label>
              Student track
              <input
                className="input"
                value={dataset.student?.track ?? ""}
                onChange={(event) =>
                  setDatasetField("student.track", event.target.value)
                }
              />
            </label>
            <label>
              Role
              <input
                className="input"
                value={dataset.role ?? ""}
                onChange={(event) => setDatasetField("role", event.target.value)}
              />
            </label>
            <label>
              Company
              <input
                className="input"
                value={dataset.company ?? ""}
                onChange={(event) => setDatasetField("company", event.target.value)}
              />
            </label>
            <label>
              Company domain
              <input
                className="input"
                value={dataset.companyDomain ?? ""}
                onChange={(event) =>
                  setDatasetField("companyDomain", event.target.value)
                }
              />
            </label>
          </fieldset>

          <div className="text-block">
            <label htmlFor="facts-input">Company facts (Company: fact | fact)</label>
            <textarea
              id="facts-input"
              className={`textarea ${factsError ? "input-error" : ""}`}
              value={factsDraft}
              onChange={(event) => setFactsDraft(event.target.value)}
              onBlur={handleFactsBlur}
              rows={4}
            />
            {factsError && <p className="error">{factsError}</p>}
          </div>

          <div className="text-block">
            <label htmlFor="extras-input">Extra dataset fields (key=value)</label>
            <textarea
              id="extras-input"
              className={`textarea ${extrasError ? "input-error" : ""}`}
              value={extrasDraft}
              onChange={(event) => setExtrasDraft(event.target.value)}
              onBlur={handleExtrasBlur}
              rows={4}
            />
            {extrasError && <p className="error">{extrasError}</p>}
          </div>

          <fieldset className="options-grid">
            <legend>Options</legend>
            <label>
              Batch size
              <input
                type="number"
                min={1}
                className="input"
                value={options.batchSize ?? 1}
                onChange={(event) =>
                  setOptions({ batchSize: Number(event.target.value) || 1 })
                }
              />
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={options.dryRun}
                onChange={(event) => setOptions({ dryRun: event.target.checked })}
              />
              Dry run (no send)
            </label>
            {manualRecipients.length > 0 && (
              <p className="hint">
                Manual recipients: {manualRecipients.join(", ")}
              </p>
            )}
          </fieldset>
        </section>

        <section className="panel preview-panel">
          <header>
            <h2>Preview</h2>
          </header>
          <div className="preview-controls">
            <label htmlFor="preview-contact">Preview as</label>
            <select
              id="preview-contact"
              className="input"
              value={previewContactId}
              onChange={(event) => setPreviewContactId(event.target.value)}
            >
              {dedupedContacts.map((contact) => (
                <option key={contact.email ?? contact.name} value={contact.email ?? ""}>
                  {contact.name || contact.email || "Contact"}
                </option>
              ))}
            </select>
          </div>
          <article className="preview-card">
            <h3>{previewContent.subject || "(no subject)"}</h3>
            <p className="preview-to">To: {previewContent.to || "(no recipient)"}</p>
            <pre className="preview-body">{previewContent.body}</pre>
          </article>

          <section className="results-section">
            <h3>AI results</h3>
            {isGenerating && <p className="hint">Calling AI…</p>}
            {!isGenerating && results.length === 0 && (
              <p className="hint">Generate a draft to see AI rewritten emails.</p>
            )}
            {results.map((result, index) => (
              <div className={`result-card ${result.excluded ? "excluded" : ""}`} key={`result-${index}`}>
                <div className="result-header">
                  <h4>Email {index + 1}</h4>
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={!!result.excluded}
                      onChange={() => handleExcludeToggle(index)}
                    />
                    Exclude from send
                  </label>
                </div>
                <label>
                  To
                  <input
                    className="input"
                    value={result.to}
                    onChange={(event) => updateResult(index, { to: event.target.value })}
                  />
                </label>
                <label>
                  Subject
                  <input
                    className="input"
                    value={result.subject}
                    onChange={(event) => updateResult(index, { subject: event.target.value })}
                  />
                </label>
                <label>
                  Body
                  <textarea
                    className="textarea"
                    rows={8}
                    value={result.body}
                    onChange={(event) => updateResult(index, { body: event.target.value })}
                  />
                </label>
                {result.error && <p className="error">{result.error}</p>}
              </div>
            ))}
          </section>

          <footer className="preview-footer">
            <p>Last saved: {formatTimestamp(drafts.lastSavedAt) || "—"}</p>
          </footer>
        </section>
      </div>
    </main>
  );
}

