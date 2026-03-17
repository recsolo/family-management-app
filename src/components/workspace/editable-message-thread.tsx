"use client";

import { useState, type FormEvent } from "react";

import type { DirectMessage } from "@/lib/familyflow";

type EditableMessageThreadProps = {
  messages: DirectMessage[];
  currentUserId: string;
  emptyMessage: string;
  composePlaceholder: string;
  sendLabel: string;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function EditableMessageThread({
  messages,
  currentUserId,
  emptyMessage,
  composePlaceholder,
  sendLabel,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
}: EditableMessageThreadProps) {
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    onSendMessage(trimmed);
    setDraft("");
  }

  function startEditing(message: DirectMessage) {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditingContent("");
  }

  function saveEditedMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMessageId) {
      return;
    }

    const trimmed = editingContent.trim();
    if (!trimmed) {
      return;
    }

    onEditMessage(editingMessageId, trimmed);
    cancelEditing();
  }

  return (
    <div className="family-message-thread">
      <div className="family-message-thread__list">
        {messages.length > 0 ? (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            const isEditing = editingMessageId === message.id;

            return (
              <div
                key={message.id}
                className={`family-chat-row ${isCurrentUser ? "family-chat-row-user" : "family-chat-row-assistant"}`}
              >
                <div
                  className={`family-chat-bubble family-message-thread__bubble ${
                    isCurrentUser ? "family-chat-user" : "family-chat-assistant"
                  }`}
                >
                  {isCurrentUser && !isEditing ? (
                    <div className="family-message-thread__actions">
                      <button type="button" className="family-message-thread__action" onClick={() => startEditing(message)}>
                        Edit
                      </button>
                      <button type="button" className="family-message-thread__action family-message-thread__action-danger" onClick={() => onDeleteMessage(message.id)}>
                        Delete
                      </button>
                    </div>
                  ) : null}

                  <p className="family-kicker opacity-70">{isEditing ? "Editing message" : message.senderName}</p>

                  {isEditing ? (
                    <form className="family-message-thread__editor" onSubmit={saveEditedMessage}>
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={4}
                        className="family-textarea"
                        aria-label="Edit sent message"
                      />
                      <div className="family-message-thread__editor-actions">
                        <button type="button" className="family-btn family-btn-soft" onClick={cancelEditing}>
                          Cancel
                        </button>
                        <button type="submit" className="family-btn family-btn-primary">
                          Save change
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="family-message-thread__text mt-2 whitespace-pre-wrap">{message.content}</p>
                      <p className="family-message-thread__meta">
                        {formatTimestamp(message.createdAt)}
                        {message.editedAt ? " / edited" : ""}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">{emptyMessage}</div>
        )}
      </div>

      <form className="family-message-thread__composer" onSubmit={handleSendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          placeholder={composePlaceholder}
          className="family-textarea"
        />
        <div className="family-message-thread__composer-actions">
          <p className="text-sm leading-7 text-[var(--muted)]">You can edit or delete your own messages after sending them.</p>
          <button type="submit" className="family-btn family-btn-primary">
            {sendLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
