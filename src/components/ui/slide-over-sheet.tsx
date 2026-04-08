"use client";

import { useEffect, type ReactNode } from "react";

type SlideOverSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function SlideOverSheet({ open, onClose, title, children }: SlideOverSheetProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        className="family-sheet-backdrop"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="family-sheet"
      >
        <div className="family-sheet__header">
          <div>
            <p className="family-kicker family-eyebrow">Edit</p>
            <h2 className="mt-2 font-serif text-2xl leading-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="family-btn family-btn-secondary"
          >
            Close
          </button>
        </div>

        <div className="family-sheet__body">
          {children}
        </div>
      </div>
    </>
  );
}
