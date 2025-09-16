"use client";
import { useState } from "react";

export default function Rolodex() {
  const [userId, setUserId] = useState("");
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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const action = e.nativeEvent.submitter?.value;
    setLoading(true);
    setErr("");
    const body = { action, user_external_id: userId };
    if (action === "create") {
      Object.assign(body, {
        full_name: fullName,
        title,
        company,
        location,
        email,
        profile_url: profileUrl,
      });
    }
    if (action === "view") {
      Object.assign(body, {
        full_name: fullName,
        profile_url: profileUrl,
      });
    }
    if (action === "update") {
      Object.assign(body, {
        contact_id: contactId,
        title,
        company,
        location,
        email,
      });
    }
    if (action === "email") {
      Object.assign(body, {
        contact_id: contactId,
        subject,
        message,
      });
    }
    try {
      const r = await fetch("/api/rolodex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Request failed");
      setResponse(data);
    } catch (e) {
      setErr(e.message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>Rolodex</h1>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID"
        />
        <input
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          placeholder="Contact ID"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
        />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
        />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="Profile URL"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" value="view" disabled={loading}>
            {loading ? "Working…" : "View"}
          </button>
          <button type="submit" value="create" disabled={loading}>
            {loading ? "Working…" : "Create"}
          </button>
          <button type="submit" value="update" disabled={loading}>
            {loading ? "Working…" : "Update"}
          </button>
          <button type="submit" value="email" disabled={loading}>
            {loading ? "Working…" : "Email"}
          </button>
        </div>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
      {response && (
        <pre style={{ marginTop: 16 }}>{JSON.stringify(response, null, 2)}</pre>
      )}
    </main>
  );
}

