"use client";
import { useState } from "react";

export default function Rolodex() {
  const [term, setTerm] = useState("");
  const [action, setAction] = useState("view");
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSearch(e) {
    e.preventDefault(); // important: stop default form post
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, term })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || JSON.stringify(data));
      setResults(Array.isArray(data.results) ? data.results : [data]);
    } catch (e) {
      setErr(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>Rolodex</h1>
      <form onSubmit={onSearch} style={{ display: "flex", gap: 8 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)}
                style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="view">View</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="email">Email</option>
        </select>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Company or name"
               style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
          {loading ? "Working…" : "Send"}
        </button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <ul style={{ marginTop: 16 }}>
        {results.map((r, i) => <li key={i}>{r.name || r.title || JSON.stringify(r)}</li>)}
      </ul>
    </main>
  );
}
