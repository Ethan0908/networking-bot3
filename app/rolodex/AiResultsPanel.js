"use client";

export function AiResultsPanel({
  results,
  progress,
  isStreaming,
  streamError,
  downloadsEnabled = true,
  onDownload,
  onToggleEdit,
  onToggleExclude,
  onFieldChange,
  onRetryStream,
}) {
  const hasResults = Array.isArray(results) && results.length > 0;
  const counts = progress?.counts || {};
  const totalCount =
    typeof counts.total === "number"
      ? counts.total
      : hasResults
      ? results.length
      : undefined;
  const sentCount = typeof counts.sent === "number" ? counts.sent : undefined;
  const failedCount =
    typeof counts.failed === "number" ? counts.failed : undefined;
  const deliveredCount = (sentCount ?? 0) + (failedCount ?? 0);
  const hasProgress = Boolean(
    (progress && (progress.stage || progress.detail)) ||
      (sentCount || failedCount || totalCount)
  );

  if (!hasResults && !isStreaming && !hasProgress && !streamError) {
    return null;
  }

  const formatStatus = (value) => {
    if (!value) return "";
    const text = String(value).replace(/[_-]+/g, " ").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const stageLabel = progress?.stage
    ? formatStatus(progress.stage)
    : isStreaming
    ? "Connecting"
    : "";

  let countsText = "";
  if (typeof totalCount === "number" && totalCount > 0) {
    countsText = `${deliveredCount}/${totalCount} processed`;
    if (failedCount) {
      countsText += ` • ${failedCount} failed`;
    }
  } else if (sentCount || failedCount) {
    const parts = [];
    if (sentCount) {
      parts.push(`${sentCount} sent`);
    }
    if (failedCount) {
      parts.push(`${failedCount} failed`);
    }
    countsText = parts.join(" • ");
  }

  const downloadDisabled = !downloadsEnabled || !hasResults;

  return (
    <div className="ai-results-panel">
      <div className="ai-results-header">
        <h3>AI Results</h3>
        <div className="ai-results-actions">
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("json")}
            disabled={downloadDisabled}
            title={downloadDisabled ? "Results are still streaming." : undefined}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("csv")}
            disabled={downloadDisabled}
            title={downloadDisabled ? "Results are still streaming." : undefined}
          >
            Download CSV
          </button>
        </div>
      </div>

      {(stageLabel || progress?.detail || countsText) && (
        <div className="ai-progress-bar" aria-live="polite">
          {stageLabel && <span className="ai-progress-stage">{stageLabel}</span>}
          {progress?.detail && (
            <span className="ai-progress-detail">{progress.detail}</span>
          )}
          {countsText && <span className="ai-progress-counts">{countsText}</span>}
        </div>
      )}

      {streamError && (
        <div className="ai-stream-error" role="alert">
          <span>{streamError}</span>
          {onRetryStream && (
            <button type="button" onClick={onRetryStream}>
              Retry
            </button>
          )}
        </div>
      )}

      {isStreaming && !hasResults && (
        <div className="ai-result-skeleton" aria-live="polite" aria-busy="true">
          <div className="ai-result-skeleton-line short" />
          <div className="ai-result-skeleton-line" />
          <div className="ai-result-skeleton-line" />
        </div>
      )}

      {hasResults && (
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
              {(result.status || result.error) && (
                <div className="ai-result-meta">
                  {result.status ? (
                    <span
                      className={`ai-result-status ${String(result.status).toLowerCase()}`}
                    >
                      {formatStatus(result.status)}
                    </span>
                  ) : null}
                  {result.error ? (
                    <span className="ai-result-error-text">{result.error}</span>
                  ) : null}
                </div>
              )}
              <div className="ai-result-field">
                <span className="ai-result-label">To</span>
                {result.isEditing ? (
                  <input
                    className="text-input"
                    value={result.to}
                    onChange={(event) =>
                      onFieldChange?.(index, "to", event.target.value)
                    }
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
                    onChange={(event) =>
                      onFieldChange?.(index, "body", event.target.value)
                    }
                    rows={6}
                  />
                ) : (
                  <pre className="ai-result-body-text">{result.body || ""}</pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
