"use client";
import { useState, useEffect } from "react";

export default function Rolodex() {
  const [userId, setUserId] = useState("");
  const [contacts, setContacts] = useState([]);
  const initialForm = {
    full_name: "",
    title: "",
    company: "",
    location: "",
    email: "",
    profile_url: "",
    profile_id: "",
  };
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) fetchContacts();
  }, [userId]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rolodex?action=view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_external_id: userId }),
      });
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : data.contacts || []);
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load contacts" });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e, setState) {
    const { name, value } = e.target;
    setState((s) => ({ ...s, [name]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/rolodex?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_external_id: userId, ...form }),
      });
      if (!res.ok) throw new Error("Request failed");
      setForm(initialForm);
      setMessage({ type: "success", text: "Contact created" });
      fetchContacts();
    } catch (e) {
      setMessage({ type: "error", text: "Failed to create contact" });
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditFields({
      title: c.title || "",
      company: c.company || "",
      location: c.location || "",
      email: c.email || "",
    });
  }

  async function saveEdit(id) {
    try {
      const res = await fetch(`/api/rolodex?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_external_id: userId, contact_id: id, ...editFields }),
      });
      if (!res.ok) throw new Error("Request failed");
      setEditingId(null);
      setMessage({ type: "success", text: "Contact updated" });
      fetchContacts();
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update contact" });
    }
  }

  async function sendEmail(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/rolodex?action=email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_external_id: userId,
          contact_id: emailTarget.id,
          email: emailTarget.email,
          subject: emailForm.subject,
          message: emailForm.message,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setEmailTarget(null);
      setEmailForm({ subject: "", message: "" });
      setMessage({ type: "success", text: "Email sent" });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to send email" });
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Contacts</h1>
      <div style={{ marginBottom: 16 }}>
        <label>
          User ID:
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user_001"
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={fetchContacts} style={{ marginLeft: 8 }}>
          Load
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 8,
            border: "1px solid",
            borderColor: message.type === "error" ? "red" : "green",
            color: message.type === "error" ? "red" : "green",
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Name
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Title
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Company
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Location
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Email
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Profile
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Updated At
              </th>
              <th style={{ borderBottom: "1px solid #ccc" }}></th>
            </tr>
          </thead>
          <tbody>
            {contacts
              .sort(
                (a, b) =>
                  new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
              )
              .map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{c.full_name}</td>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input
                          name="title"
                          value={editFields.title}
                          onChange={(e) => handleChange(e, setEditFields)}
                        />
                      </td>
                      <td>
                        <input
                          name="company"
                          value={editFields.company}
                          onChange={(e) => handleChange(e, setEditFields)}
                        />
                      </td>
                      <td>
                        <input
                          name="location"
                          value={editFields.location}
                          onChange={(e) => handleChange(e, setEditFields)}
                        />
                      </td>
                      <td>
                        <input
                          name="email"
                          value={editFields.email}
                          onChange={(e) => handleChange(e, setEditFields)}
                        />
                      </td>
                      <td>
                        <a href={c.profile_url} target="_blank" rel="noreferrer">
                          Link
                        </a>
                      </td>
                      <td>{c.updated_at}</td>
                      <td>
                        <button onClick={() => saveEdit(c.id)}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ marginLeft: 4 }}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.title}</td>
                      <td>{c.company}</td>
                      <td>{c.location}</td>
                      <td>{c.email}</td>
                      <td>
                        <a href={c.profile_url} target="_blank" rel="noreferrer">
                          Link
                        </a>
                      </td>
                      <td>{c.updated_at}</td>
                      <td>
                        <button onClick={() => startEdit(c)}>Edit</button>
                        <button
                          onClick={() => setEmailTarget(c)}
                          style={{ marginLeft: 4 }}
                        >
                          Email
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 32 }}>Create Contact</h2>
      <form onSubmit={onCreate} style={{ display: "grid", gap: 8 }}>
        <input
          name="full_name"
          value={form.full_name}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Full Name"
        />
        <input
          name="title"
          value={form.title}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Title"
        />
        <input
          name="company"
          value={form.company}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Company"
        />
        <input
          name="location"
          value={form.location}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Location"
        />
        <input
          name="email"
          value={form.email}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Email"
        />
        <input
          name="profile_url"
          value={form.profile_url}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Profile URL"
        />
        <input
          name="profile_id"
          value={form.profile_id}
          onChange={(e) => handleChange(e, setForm)}
          placeholder="Profile ID"
        />
        <button type="submit">Create</button>
      </form>

      {emailTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "white", padding: 16, maxWidth: 400, width: "100%" }}>
            <h3>Email {emailTarget.full_name}</h3>
            <form onSubmit={sendEmail} style={{ display: "grid", gap: 8 }}>
              <input
                readOnly
                value={emailTarget.email}
                style={{ background: "#f0f0f0" }}
              />
              <input
                name="subject"
                value={emailForm.subject}
                onChange={(e) => handleChange(e, setEmailForm)}
                placeholder="Subject"
              />
              <textarea
                name="message"
                value={emailForm.message}
                onChange={(e) => handleChange(e, setEmailForm)}
                placeholder="Message"
                rows={4}
              />
              <div>
                <button type="submit">Send</button>
                <button
                  type="button"
                  onClick={() => setEmailTarget(null)}
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
