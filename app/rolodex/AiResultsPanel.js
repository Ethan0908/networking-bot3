"use client";

export function AiResultsPanel({
  results,
  jobStatus,
  isGenerating,
  downloadsEnabled = true,
  onDownload,
  onToggleEdit,
  onToggleExclude,
  onFieldChange,
  onSendBatch,
  isSending,
}) {
  const hasResults = Array.isArray(results) && results.length > 0;
  const status = jobStatus?.status ?? (isGenerating ? "running" : null);

  const formatStatus = (value) => {
    if (!value) return "";
    const text = String(value).replace(/[_-]+/g, " ").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const stageLabel = jobStatus?.stage
    ? formatStatus(jobStatus.stage)
    : isGenerating
    ? "Processing"
    : "";
  const detail = jobStatus?.detail ?? "";
  const progress = jobStatus?.progress;

  let countsText = "";
  if (progress && typeof progress.total === "number" && progress.total > 0) {
    const done = typeof progress.done === "number" ? progress.done : 0;
    countsText = `${Math.min(done, progress.total)}/${progress.total} processed`;
  } else if (progress && typeof progress.done === "number") {
    countsText = `${progress.done} processed`;
  }

  const downloadDisabled = !downloadsEnabled || !hasResults;
  const showSkeleton = isGenerating && !hasResults;
  const jobError = jobStatus?.error;
  const sendSummary = jobStatus?.sendSummary;
  const hasSendSummary = sendSummary && (sendSummary.sent || sendSummary.failed);
  const sendSummaryText = hasSendSummary
    ? `Sent ${sendSummary.sent || 0} • Failed ${sendSummary.failed || 0}`
    : "";

  const sendButtonDisabled =
    !onSendBatch || status !== "ready" || isSending || !hasResults;

  if (
    !hasResults &&
    !showSkeleton &&
    !stageLabel &&
    !detail &&
    !countsText &&
    !jobError
  ) {
    return null;
  }

  return (
    <div className="ai-results-panel">
      <div className="ai-results-header">
        <h3>AI Results</h3>
        <div className="ai-results-actions">
          {onSendBatch ? (
            <button
              type="button"
              className="button secondary"
              onClick={onSendBatch}
              disabled={sendButtonDisabled}
              aria-busy={isSending}
            >
              {isSending ? "Sending…" : "Send next batch"}
            </button>
          ) : null}
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("json")}
            disabled={downloadDisabled}
            title={
              downloadDisabled ? "Results are not ready to download." : undefined
            }
          >
            Download JSON
          </button>
          <button
            type="button"
            className="button tertiary"
            onClick={() => onDownload?.("csv")}
            disabled={downloadDisabled}
            title={
              downloadDisabled ? "Results are not ready to download." : undefined
            }
          >
            Download CSV
          </button>
        </div>
      </div>

      {(stageLabel || detail || countsText) && (
        <div className="ai-progress-bar" aria-live="polite">
          {stageLabel && <span className="ai-progress-stage">{stageLabel}</span>}
          {detail && <span className="ai-progress-detail">{detail}</span>}
          {countsText && <span className="ai-progress-counts">{countsText}</span>}
        </div>
      )}

      {jobError && (
        <div className="ai-stream-error" role="alert">
          <span>{jobError}</span>
        </div>
      )}

      {showSkeleton && (
        <div className="ai-result-skeleton" aria-live="polite" aria-busy="true">
          <div className="ai-result-skeleton-line short" />
          <div className="ai-result-skeleton-line" />
          <div className="ai-result-skeleton-line" />
        </div>
      )}

      {hasResults && (
        <>
          {hasSendSummary ? (
            <div className="ai-send-summary" aria-live="polite">
              {sendSummaryText}
            </div>
          ) : null}
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
                    <span className="ai-result-value">{result.body || "—"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
