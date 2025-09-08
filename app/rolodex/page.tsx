"use client";
import { useEffect, useMemo, useState } from "react";

// Minimal, no external UI libs required (Tailwind optional).
// Drop this file at: app/rolodex/page.tsx
// It calls your existing /api/rolodex endpoint wired to n8n.

interface Contact {
  id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  profile_url: string | null;
  profile_id: string | null;
  email: string | null;
  updated_at?: string;
}

export default function RolodexPage() {
  // Replace this in prod with your auth user id
  const [userId, setUserId] = useState("user_001");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftNew, setDraftNew] = useState<Omit<Contact, "id">>({
    full_name: "",
    title: "",
    company: "",
    location: "",
    profile_url: "",
    profile_id: "",
    email: "",
  });

  const canLoad = useMemo(() => Boolean(userId.trim()), [userId]);

  async function callRolodex(payload: any) {
    setError(null);
    const res = await fetch("/api/rolodex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      setError(text || `Request failed (${res.status})`);
      throw new Error(text || `Request failed (${res.status})`);
    }
    try { return JSON.parse(text); } catch { return text; }
  }

  async function load() {
    if (!canLoad) return;
    setLoading(true);
    try {
      const data = await callRolodex({ action: "view", user_external_id: userId });
      setContacts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setCreating(true);
    try {
      await callRolodex({ action: "create", user_external_id: userId, ...draftNew });
      setDraftNew({ full_name: "", title: "", company: "", location: "", profile_url: "", profile_id: "", email: "" });
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function save(contact: Contact) {
    await callRolodex({
      action: "update",
      user_external_id: userId,
      contact_id: contact.id,
      title: contact.title,
      company: contact.company,
      location: contact.location,
      email: contact.email,
    });
    await load();
  }

  async function sendEmail(contactId: string, subject?: string, message?: string) {
    await callRolodex({ action: "email", user_external_id: userId, contact_id: contactId, subject, message });
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rolodex</h1>
          <p className="text-sm text-gray-500">View, edit, and email contacts stored via n8n.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">User ID</label>
          <input className="border px-2 py-1 rounded w-60" value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="user_external_id" />
          <button className="border px-3 py-1 rounded" onClick={load} disabled={!canLoad || loading}>{loading?"Loading…":"Refresh"}</button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4 space-y-3">
          <h2 className="font-medium">Create contact</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <L label="Full name"><input className="border px-2 py-1 rounded" value={draftNew.full_name ?? ""} onChange={e=>setDraftNew(v=>({...v,full_name:e.target.value}))} /></L>
            <L label="Email"><input type="email" className="border px-2 py-1 rounded" value={draftNew.email ?? ""} onChange={e=>setDraftNew(v=>({...v,email:e.target.value}))} /></L>
            <L label="Title"><input className="border px-2 py-1 rounded" value={draftNew.title ?? ""} onChange={e=>setDraftNew(v=>({...v,title:e.target.value}))} /></L>
            <L label="Company"><input className="border px-2 py-1 rounded" value={draftNew.company ?? ""} onChange={e=>setDraftNew(v=>({...v,company:e.target.value}))} /></L>
            <L label="Location"><input className="border px-2 py-1 rounded" value={draftNew.location ?? ""} onChange={e=>setDraftNew(v=>({...v,location:e.target.value}))} /></L>
            <L label="Profile URL"><input className="border px-2 py-1 rounded" value={draftNew.profile_url ?? ""} onChange={e=>setDraftNew(v=>({...v,profile_url:e.target.value}))} /></L>
            <L label="Profile ID" span>
              <input className="border px-2 py-1 rounded w-full" value={draftNew.profile_id ?? ""} onChange={e=>setDraftNew(v=>({...v,profile_id:e.target.value}))} />
            </L>
          </div>
          <button className="border px-3 py-1 rounded" onClick={create} disabled={creating}>{creating?"Creating…":"Create"}</button>
        </div>

        <div className="border rounded p-4 space-y-3">
          <h2 className="font-medium">Quick email</h2>
          <p className="text-sm text-gray-500">Use the Email button in the table below.</p>
        </div>
      </section>

      <div className="border rounded">
        <div className="p-4 border-b font-medium">Contacts</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <Th>Name</Th>
                <Th>Title</Th>
                <Th>Company</Th>
                <Th>Location</Th>
                <Th>Email</Th>
                <Th>Profile</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 && (
                <tr><td className="p-4 text-gray-500" colSpan={7}>{loading?"Loading…":"No contacts yet"}</td></tr>
              )}
              {contacts.map((c) => (
                <Row key={c.id} c={c} onSave={save} onMail={sendEmail} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ c, onSave, onMail }: { c: Contact; onSave: (c: Contact)=>Promise<void>; onMail: (id: string, s?: string, m?: string)=>Promise<void>; }) {
  const [draft, setDraft] = useState<Contact>(c);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  }
  async function send() {
    await onMail(draft.id, subject, message);
    setOpen(false);
    setSubject("");
    setMessage("");
  }

  return (
    <tr className="border-b align-top">
      <td className="p-2 min-w-40">{draft.full_name}</td>
      <td className="p-2"><input className="border px-2 py-1 rounded w-full" value={draft.title ?? ""} onChange={e=>setDraft({...draft,title:e.target.value})} /></td>
      <td className="p-2"><input className="border px-2 py-1 rounded w-full" value={draft.company ?? ""} onChange={e=>setDraft({...draft,company:e.target.value})} /></td>
      <td className="p-2"><input className="border px-2 py-1 rounded w-full" value={draft.location ?? ""} onChange={e=>setDraft({...draft,location:e.target.value})} /></td>
      <td className="p-2"><input type="email" className="border px-2 py-1 rounded w-full" value={draft.email ?? ""} onChange={e=>setDraft({...draft,email:e.target.value})} /></td>
      <td className="p-2 truncate max-w-52">
        {draft.profile_url ? <a className="underline" href={draft.profile_url} target="_blank" rel="noreferrer">link</a> : <span className="text-gray-400">—</span>}
      </td>
      <td className="p-2 w-56">
        <div className="flex flex-wrap gap-2">
          <button className="border px-3 py-1 rounded" onClick={()=>setOpen(true)}>Email</button>
          <button className="border px-3 py-1 rounded" onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button>
        </div>
        {open && (
          <div className="mt-2 border rounded p-3 space-y-2 bg-gray-50">
            <div className="text-xs text-gray-600">To: {draft.email || "(no email)"}</div>
            <input className="border px-2 py-1 rounded w-full" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
            <textarea className="border px-2 py-1 rounded w-full min-h-[100px]" placeholder="Message" value={message} onChange={e=>setMessage(e.target.value)} />
            <div className="flex gap-2">
              <button className="border px-3 py-1 rounded" onClick={send} disabled={!draft.email}>Send</button>
              <button className="border px-3 py-1 rounded" onClick={()=>setOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

function L({ label, children, span=false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${span?"col-span-2":""}`}>
      <span className="text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-2 pr-4 text-xs uppercase tracking-wide text-gray-500">{children}</th>;
}