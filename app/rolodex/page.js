"use client";
import { useState } from "react";

export default function Rolodex() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  function onSearch(e) {
    e.preventDefault();
    setResults([{ id: 1, name: `Example result for "${term}"` }]); // placeholder
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>Rolodex</h1>
      <form onSubmit={onSearch} style={{ display: "flex", gap: 8 }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Company or name"
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
          Search
        </button>
      </form>
      <ul style={{ marginTop: 16 }}>
        {results.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </main>
  );
}
