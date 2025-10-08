"use client";

import create from "../../lib/zustand-lite";

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
  contacts: [],
  facts: {},
  extras: {},
};

const DEFAULT_OPTIONS = {
  batchSize: 25,
  dryRun: true,
  manualRecipients: [],
};

const DEFAULT_PLACEHOLDERS = [
  { label: "[contact name]", token: "{{contact.name}}" },
  { label: "[contact email]", token: "{{contact.email}}" },
  { label: "[contact title]", token: "{{contact.title}}" },
  { label: "[company]", token: "{{company}}" },
  { label: "[company domain]", token: "{{companyDomain}}" },
  { label: "[role]", token: "{{role}}" },
  { label: "[your name]", token: "{{student.name}}" },
  { label: "[your school]", token: "{{student.school}}" },
  { label: "[your track]", token: "{{student.track}}" },
  { label: "[draft]", token: "{{draft}}" },
];

const emptyContact = () => ({
  name: "",
  email: "",
  title: "",
  company: "",
  role: "",
});

export const useComposerStore = create((set, get) => ({
  template: DEFAULT_TEMPLATE,
  dataset: DEFAULT_DATASET,
  options: DEFAULT_OPTIONS,
  placeholders: DEFAULT_PLACEHOLDERS,
  results: [],
  drafts: { lastSavedAt: null },
  setTemplateField: (key, value) =>
    set(({ template }) => ({ template: { ...template, [key]: value } })),
  updateTemplate: (updater) =>
    set(({ template }) => ({ template: { ...template, ...updater(template) } })),
  setDatasetField: (path, value) => {
    const segments = path.split(".");
    set(({ dataset }) => {
      const clone = { ...dataset };
      let cursor = clone;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const segment = segments[i];
        cursor[segment] = { ...cursor[segment] };
        cursor = cursor[segment];
      }
      cursor[segments.at(-1)] = value;
      return { dataset: clone };
    });
  },
  updateContact: (index, patch) =>
    set(({ dataset }) => {
      const contacts = dataset.contacts.map((contact, idx) =>
        idx === index ? { ...contact, ...patch } : contact
      );
      return { dataset: { ...dataset, contacts } };
    }),
  addContact: () =>
    set(({ dataset }) => ({
      dataset: { ...dataset, contacts: [...dataset.contacts, emptyContact()] },
    })),
  removeContact: (index) =>
    set(({ dataset }) => ({
      dataset: {
        ...dataset,
        contacts: dataset.contacts.filter((_, idx) => idx !== index),
      },
    })),
  replaceContacts: (contacts) =>
    set(({ dataset }) => ({ dataset: { ...dataset, contacts } })),
  setFacts: (facts) =>
    set(({ dataset }) => ({ dataset: { ...dataset, facts } })),
  setExtras: (extras) =>
    set(({ dataset }) => ({ dataset: { ...dataset, extras } })),
  addPlaceholder: (placeholder) =>
    set(({ placeholders }) => ({ placeholders: [...placeholders, placeholder] })),
  removePlaceholder: (label) =>
    set(({ placeholders }) => ({
      placeholders: placeholders.filter((item) => item.label !== label),
    })),
  setOptions: (options) => set({ options: { ...get().options, ...options } }),
  setResults: (results) => set({ results }),
  updateResult: (index, patch) =>
    set(({ results }) => ({
      results: results.map((result, idx) =>
        idx === index ? { ...result, ...patch } : result
      ),
    })),
  resetTemplate: () =>
    set(({ dataset, placeholders }) => ({
      template: { ...DEFAULT_TEMPLATE },
      dataset,
      placeholders,
    })),
  clearResults: () => set({ results: [] }),
  markSaved: () =>
    set(({ drafts }) => ({ drafts: { ...drafts, lastSavedAt: new Date().toISOString() } })),
  loadState: (state) => {
    if (!state || typeof state !== "object") return;
    const { template, dataset, placeholders } = state;
    set((prev) => ({
      ...prev,
      template: template ? { ...DEFAULT_TEMPLATE, ...template } : prev.template,
      dataset: dataset ? { ...DEFAULT_DATASET, ...dataset } : prev.dataset,
      placeholders: Array.isArray(placeholders) ? placeholders : prev.placeholders,
    }));
  },
  resetAll: () =>
    set({
      template: { ...DEFAULT_TEMPLATE },
      dataset: { ...DEFAULT_DATASET },
      placeholders: [...DEFAULT_PLACEHOLDERS],
      options: { ...DEFAULT_OPTIONS },
      results: [],
    }),
}));

export function getDefaultStateSnapshot() {
  return {
    template: { ...DEFAULT_TEMPLATE },
    dataset: { ...DEFAULT_DATASET },
    placeholders: [...DEFAULT_PLACEHOLDERS],
  };
}

