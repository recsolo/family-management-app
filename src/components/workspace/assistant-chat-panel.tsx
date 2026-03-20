"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/familyflow";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

type AssistantChatPanelProps = {
  history: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSubmitPrompt: (prompt: string) => void;
  aiTask: AiTask;
  assistantSuggestions: string[];
  mode?: "embedded" | "focus";
  onOpenFocus?: () => void;
  onBackToStudio?: () => void;
};

export function AssistantChatPanel({
  history,
  chatInput,
  onChatInputChange,
  onSubmitPrompt,
  aiTask,
  assistantSuggestions,
  mode = "embedded",
  onOpenFocus,
  onBackToStudio,
}: AssistantChatPanelProps) {
  const isFocus = mode === "focus";
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, aiTask]);

  return (
    <article className={`family-chat-shell family-animate-rise rounded-[30px] ${isFocus ? "family-chat-shell-focus" : "family-panel p-6 md:p-7"}`}>
      <div className="family-chat-shell__header">
        <div>
          <p className="family-kicker family-eyebrow">{isFocus ? "Chat-only view" : "Chat"}</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{isFocus ? "AI chat" : "Ask AI"}</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {isFocus && onBackToStudio ? (
            <button type="button" onClick={onBackToStudio} className="family-btn family-btn-secondary">
              Back to AI Studio
            </button>
          ) : null}
          {!isFocus && onOpenFocus ? (
            <button type="button" onClick={onOpenFocus} className="family-btn family-btn-secondary">
              Open chat-only view
            </button>
          ) : null}
        </div>
      </div>

      <div className="family-chat-topband">
        <div className="family-chat-state">
          <span className={`family-chat-state-dot ${aiTask === "assistant" ? "family-chat-state-dot-live" : ""}`} aria-hidden="true" />
          <span>{aiTask === "assistant" ? "AI is replying..." : "Ready"}</span>
        </div>
        <div className="family-chat-seeds">
          {assistantSuggestions.slice(0, isFocus ? 5 : 3).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSubmitPrompt(suggestion)}
              disabled={aiTask !== null}
              className="family-chat-seed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className={`family-scroll family-chat-stream ${isFocus ? "family-chat-stream-focus" : ""}`} aria-live="polite">
        {history.length > 0 ? (
          history.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`family-chat-row ${message.role === "assistant" ? "family-chat-row-assistant" : "family-chat-row-user"}`}>
              <div className={`family-chat-bubble ${message.role === "assistant" ? "family-chat-assistant" : "family-chat-user"}`}>
                <p className="family-kicker opacity-70">{message.role === "assistant" ? "FamilyFlow AI" : "You"}</p>
                <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
            Ask a question to start.
          </div>
        )}

        {aiTask === "assistant" ? (
          <div className="family-chat-row family-chat-row-assistant">
            <div className="family-chat-bubble family-chat-assistant family-chat-bubble-thinking">
              <p className="family-kicker opacity-70">FamilyFlow AI</p>
              <div className="family-chat-thinking" aria-label="Assistant is thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        className="family-chat-compose-shell mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitPrompt(chatInput);
        }}
      >
        <textarea
          value={chatInput}
          onChange={(event) => onChatInputChange(event.target.value)}
          rows={isFocus ? 5 : 4}
          placeholder="Ask a question..."
          className="family-textarea"
        />

        <div className="family-chat-compose">
          <p className="text-sm leading-7 text-[var(--muted)]">AI can use your family info to answer better.</p>
          <button type="submit" disabled={aiTask !== null} className="family-btn family-btn-primary">
            {aiTask === "assistant" ? "Thinking..." : "Send"}
          </button>
        </div>
      </form>
    </article>
  );
}
