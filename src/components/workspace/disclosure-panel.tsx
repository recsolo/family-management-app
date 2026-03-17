"use client";

import { useState, type ReactNode } from "react";

type DisclosurePanelProps = {
  kicker: string;
  title: string;
  summary: string;
  badge?: string;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function DisclosurePanel({
  kicker,
  title,
  summary,
  badge,
  defaultOpen = false,
  className,
  bodyClassName,
  children,
}: DisclosurePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={`family-disclosure ${className ?? ""}`.trim()}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="family-disclosure__summary">
        <div className="family-disclosure__copy">
          <p className="family-kicker family-eyebrow">{kicker}</p>
          <h3 className="family-disclosure__title font-serif">{title}</h3>
          <p className="family-disclosure__helper">{summary}</p>
        </div>
        <div className="family-disclosure__meta">
          {badge ? <span className="family-badge family-badge-gold">{badge}</span> : null}
          <span className="family-disclosure__toggle" aria-hidden="true">
            <span className="family-disclosure__toggle-line" />
            <span className="family-disclosure__toggle-line family-disclosure__toggle-line-vertical" />
          </span>
        </div>
      </summary>
      <div className={`family-disclosure__body ${bodyClassName ?? ""}`.trim()}>{children}</div>
    </details>
  );
}
