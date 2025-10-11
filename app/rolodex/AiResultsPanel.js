"use client";

export function AiResultsPanel({
  results,
  onDownload,
  onToggleEdit,
  onToggleExclude,
  onFieldChange,
}) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="ai-results-panel">
      <div className="ai-results-header">
        <h3>AI Results</h3>
        <div className="ai-results-actions">
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("json")}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("csv")}
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="ai-results-list">
        {results.map((result, index) => (
          <div
            key={result.id || index}
            className={`ai-result${result.excluded ? " excluded" : ""}`}
          >
            <div className="ai-result-header">
              <h4>Contact {index + 1}</h4>
              <div className="ai-result-buttons">
                <button
                  type="button"
                  className="button tertiary"
                  onClick={() => onToggleEdit?.(index)}
                >
                  {result.isEditing ? "Done" : "Edit"}
                </button>
                <button
                  type="button"
                  className={`button ghost${result.excluded ? " active" : ""}`}
                  onClick={() => onToggleExclude?.(index)}
                >
                  {result.excluded ? "Include" : "Exclude"}
                </button>
              </div>
            </div>
            <div className="ai-result-field">
              <span className="ai-result-label">To</span>
              {result.isEditing ? (
                <input
                  className="text-input"
                  value={result.to}
                  onChange={(event) => onFieldChange?.(index, "to", event.target.value)}
                />
              ) : (
                <span className="ai-result-value">{result.to || "—"}</span>
              )}
            </div>
            <div className="ai-result-field">
              <span className="ai-result-label">Subject</span>
              {result.isEditing ? (
                <input
                  className="text-input"
                  value={result.subject}
                  onChange={(event) =>
                    onFieldChange?.(index, "subject", event.target.value)
                  }
                />
              ) : (
                <span className="ai-result-value">{result.subject || "—"}</span>
              )}
            </div>
            <div className="ai-result-field">
              <span className="ai-result-label">Body</span>
              {result.isEditing ? (
                <textarea
                  className="text-area"
                  value={result.body}
                  onChange={(event) => onFieldChange?.(index, "body", event.target.value)}
                  rows={6}
                />
              ) : (
                <pre className="ai-result-body-text">{result.body || ""}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
