"use client";
import { useState } from "react";

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
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const trimmedUsernameForLink = username.trim();
  const oauthUrl = trimmedUsernameForLink
    ? `/api/oauth/google/start?userId=${encodeURIComponent(trimmedUsernameForLink)}`
    : "/api/oauth/google/start?userId=YOUR_USER_ID";

  async function onSubmit(e) {
    e.preventDefault();
    const action = e.nativeEvent.submitter?.value;
    if (!action) {
      setErr("Unknown action");
      return;
    }
    setLoading(true);
    setErr("");
    setResponse(null);

    const trimmedUsername = username.trim();
    const trimmedContactId = contactId.trim();
    const contactDetailsEntries = Object.entries({
      full_name: fullName,
      title,
      company,
      location,
      email,
      profile_url: profileUrl,
    })
      .map(([key, value]) => [key, value.trim?.() ?? value])
      .filter(([, value]) => Boolean(value));
    const contactDetails = Object.fromEntries(contactDetailsEntries);

    if (action === "update" || action === "email") {
      if (!trimmedContactId) {
        setErr("Contact ID is required for this action.");
        setLoading(false);
        return;
      }
    }

    if (action === "view" && !trimmedUsername) {
      setErr("Username is required to view a contact.");
      setLoading(false);
      return;
    }

    const body = {
      action,
      ...(trimmedUsername ? { username: trimmedUsername } : {}),
    };

    if (trimmedContactId && action !== "create") {
      body.contact_id = trimmedContactId;
    }

    if (action === "create" || action === "view" || action === "update") {
      Object.assign(body, contactDetails);
    }

    if (action === "email") {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        setErr("Message is required to send an email.");
        setLoading(false);
        return;
      }
      if (trimmedSubject) {
        body.subject = trimmedSubject;
      }
      body.message = trimmedMessage;
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
        const message =
          (typeof data === "string" && data) ||
          (data && typeof data === "object" && "error" in data && data.error) ||
          r.statusText ||
          "Request failed";
        throw new Error(message);
      }
      setResponse(data ?? { success: true });
    } catch (e) {
      setErr(e.message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <a
        href={oauthUrl}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          backgroundColor: "#1a73e8",
          color: "white",
          padding: "10px 16px",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 600,
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        Connect Gmail
      </a>
      <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
        <h1>Rolodex</h1>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
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
    </>
  );
}

