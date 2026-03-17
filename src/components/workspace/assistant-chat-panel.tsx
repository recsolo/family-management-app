"use client";

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

  return (
    <article className={`family-chat-shell family-animate-rise rounded-[30px] ${isFocus ? "family-chat-shell-focus" : "family-panel p-6 md:p-7"}`}>
      <div className="family-chat-shell__header">
        <div>
          <p className="family-kicker family-eyebrow">{isFocus ? "Chat-only view" : "Chat"}</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{isFocus ? "Just you and FamilyFlow." : "Talk to FamilyFlow."}</h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            {isFocus
              ? "This page is only for chatting. Ask about meals, chores, money, or anything your family needs help planning."
              : "Ask for weekly planning help, dinner ideas, calmer routines, or anything else the family needs."}
          </p>
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

      <div className="mt-5 flex flex-wrap gap-3">
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

      <div className={`family-scroll family-chat-stream ${isFocus ? "family-chat-stream-focus" : ""}`}>
        {history.length > 0 ? (
          history.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-[20px] px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "family-chat-assistant" : "family-chat-user"}`}>
              <p className="family-kicker opacity-70">{message.role === "assistant" ? "FamilyFlow AI" : "You"}</p>
              <p className="mt-2">{message.content}</p>
            </div>
          ))
        ) : (
          <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
            Start with a weekly plan, a dinner question, or a school-night reset.
          </div>
        )}
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitPrompt(chatInput);
        }}
      >
        <textarea
          value={chatInput}
          onChange={(event) => onChatInputChange(event.target.value)}
          rows={isFocus ? 5 : 4}
          placeholder="Ask for a weekly plan, meal help, school-night reset, or reminder strategy."
          className="family-textarea"
        />

        <div className="family-chat-compose">
          <p className="text-sm leading-7 text-[var(--muted)]">FamilyFlow can use your pantry, chores, reminders, routines, and budget to give smarter answers.</p>
          <button type="submit" disabled={aiTask !== null} className="family-btn family-btn-primary">
            {aiTask === "assistant" ? "Thinking..." : "Send to assistant"}
          </button>
        </div>
      </form>
    </article>
  );
}
