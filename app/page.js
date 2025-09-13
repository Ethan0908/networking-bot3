"use client";
import { useState } from "react";
import Link from "next/link";

export default function Rolodex() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const action = e.nativeEvent.submitter?.value;
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, term })
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
    <main>
      <h1>Rolodex</h1>
      <Link href="/rolodex" className="nav-link">
        Add Contacts
      </Link>
      <form onSubmit={onSubmit} className="search-form">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Company or name"
        />
        <button type="submit" value="search" disabled={loading}>
          {loading ? "Working…" : "Search"}
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
      </form>
      {err && <p className="error">{err}</p>}
      <ul className="results">
        {Array.isArray(results) ? (
          results.map((r, i) => (
            <li key={r.id || i} className="result-card">
              {r.name || r.title || JSON.stringify(r)}
            </li>
          ))
        ) : (
          <li className="result-card">{JSON.stringify(results)}</li>
        )}
      </ul>
    </main>
  );
}
