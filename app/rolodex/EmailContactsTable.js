"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { IconLoader } from "./icons";

export function EmailContactsTable({
  contacts,
  selectedIds,
  onSelectionChange,
  onLoadContacts,
  loading,
  resolveContactId,
  resolveContactName,
  formatProfileHref,
  computeEngagementStatus,
  formatTimestamp,
}) {
  const selectAllRef = useRef(null);
  const normalizedSelected = useMemo(
    () => (selectedIds ? selectedIds.map(String) : []),
    [selectedIds]
  );

  const allRecipientIds = useMemo(
    () =>
      (contacts || [])
        .map((contact) => contact.__contactId || resolveContactId(contact))
        .filter(Boolean)
        .map(String),
    [contacts, resolveContactId]
  );

  const allRecipientsSelected = useMemo(() => {
    if (allRecipientIds.length === 0) {
      return false;
    }
    return allRecipientIds.every((id) => normalizedSelected.includes(id));
  }, [allRecipientIds, normalizedSelected]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate =
      normalizedSelected.length > 0 && !allRecipientsSelected;
  }, [allRecipientsSelected, normalizedSelected.length]);

  const handleToggleSelectAll = useCallback(() => {
    if (allRecipientIds.length === 0) {
      return;
    }
    onSelectionChange(allRecipientsSelected ? [] : allRecipientIds);
  }, [allRecipientIds, allRecipientsSelected, onSelectionChange]);

  const handleToggleRecipient = useCallback(
    (id) => {
      const normalizedId = String(id);
      if (normalizedSelected.includes(normalizedId)) {
        onSelectionChange(normalizedSelected.filter((value) => value !== normalizedId));
      } else {
        onSelectionChange([...normalizedSelected, normalizedId]);
      }
    },
    [normalizedSelected, onSelectionChange]
  );

  const handleRecipientRowClick = useCallback(
    (event, id) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("a") || event.target.closest("button"))
      ) {
        return;
      }
      handleToggleRecipient(id);
    },
    [handleToggleRecipient]
  );

  if (!contacts || contacts.length === 0) {
    return (
      <div className="recipients-block">
        <div className="recipients-toolbar">
          <span id="recipient-label" className="recipients-title">
            Contacts
          </span>
          <div className="recipient-controls">
            <button
              type="button"
              className="button tertiary load-contacts-button"
              onClick={onLoadContacts}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <IconLoader /> : null}
              {loading ? "Loading…" : "Load Contacts"}
            </button>
          </div>
        </div>
        <p className="recipient-placeholder">Load contacts to choose recipients.</p>
      </div>
    );
  }

  return (
    <div className="recipients-block">
      <div className="recipients-toolbar">
        <span id="recipient-label" className="recipients-title">
          Contacts
        </span>
        <div className="recipient-controls">
          <button
            type="button"
            className="button tertiary load-contacts-button"
            onClick={onLoadContacts}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <IconLoader /> : null}
            {loading ? "Loading…" : "Load Contacts"}
          </button>
        </div>
      </div>
      <div className="table-scroll recipient-table-scroll" role="group" aria-labelledby="recipient-label">
        <table className="view-table recipient-table">
          <thead>
            <tr>
              <th scope="col" className="select-header">
                <label className="select-all-control">
                  <span className="select-all-label">Select all</span>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    onChange={handleToggleSelectAll}
                    checked={allRecipientsSelected}
                    disabled={allRecipientIds.length === 0}
                    aria-label="Select all recipients"
                  />
                </label>
              </th>
              <th scope="col">Contact ID</th>
              <th scope="col">Full Name</th>
              <th scope="col">Title</th>
              <th scope="col">Company</th>
              <th scope="col">Location</th>
              <th scope="col">Profile URL</th>
              <th scope="col">Email</th>
              <th scope="col">Engagement</th>
              <th scope="col">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => {
              const id = contact.__contactId || resolveContactId(contact);
              if (!id) {
                return null;
              }
              const normalizedId = String(id);
              const isSelected = normalizedSelected.includes(normalizedId);
              const profileLink = formatProfileHref(contact.profile_url ?? contact.profileUrl);
              const engagement = computeEngagementStatus(contact);
              const lastUpdatedDisplay = formatTimestamp(
                contact.last_updated ?? contact.updated_at ?? contact.updatedAt
              );
              const lastMessagedDisplay = formatTimestamp(
                contact.last_contacted ??
                  contact.last_messaged ??
                  contact.lastMessaged ??
                  contact.last_contacted_at
              );
              const contactName = resolveContactName(contact) || normalizedId;
              return (
                <tr
                  key={normalizedId}
                  className={isSelected ? "selected" : ""}
                  onClick={(event) => handleRecipientRowClick(event, normalizedId)}
                >
                  <td className="select-cell">
                    <button
                      type="button"
                      className={`select-toggle${isSelected ? " selected" : ""}`}
                      onClick={() => handleToggleRecipient(normalizedId)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? `Deselect contact ${contactName}`
                          : `Select contact ${contactName}`
                      }
                    >
                      <span className="select-indicator" />
                    </button>
                  </td>
                  <td>{normalizedId}</td>
                  <td>{resolveContactName(contact) || "—"}</td>
                  <td>{contact.title ?? "—"}</td>
                  <td>{contact.company ?? "—"}</td>
                  <td>{contact.location ?? "—"}</td>
                  <td>
                    {profileLink ? (
                      <a href={profileLink} target="_blank" rel="noreferrer">
                        {contact.profile_url ?? contact.profileUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{contact.email ?? "—"}</td>
                  <td>
                    <div className="engagement-cell">
                      <span
                        className={`status-dot ${engagement.color}`}
                        title={
                          lastMessagedDisplay === "—"
                            ? engagement.label
                            : `${engagement.label} (${lastMessagedDisplay})`
                        }
                        aria-label={
                          lastMessagedDisplay === "—"
                            ? engagement.label
                            : `${engagement.label}. Last messaged ${lastMessagedDisplay}.`
                        }
                      />
                      <span className="status-text">{engagement.label}</span>
                    </div>
                  </td>
                  <td>{lastUpdatedDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="helper-text recipients-helper">
        {normalizedSelected.length > 0
          ? `${normalizedSelected.length} recipient${normalizedSelected.length === 1 ? "" : "s"} selected.`
          : "No recipients selected."}
      </div>
    </div>
  );
}
