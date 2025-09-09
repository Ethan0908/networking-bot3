"use client";
import { useState } from "react";

export default function Rolodex() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSearch(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", term })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Request failed");
      setResults(data.results || data.items || data.raw || []);
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
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Company or name"
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <ul style={{ marginTop: 16 }}>
        {Array.isArray(results) ? results.map((r, i) => (
          <li key={r.id || i}>{r.name || r.title || JSON.stringify(r)}</li>
        )) : <li>{JSON.stringify(results)}</li>}
      </ul>
    </main>
  );
}
