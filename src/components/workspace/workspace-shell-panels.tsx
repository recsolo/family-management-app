"use client";

import { useState } from "react";

import type { ActiveTab } from "@/lib/workspace-tabs";
import type { AppNotification } from "@/lib/familyflow";

import type { WorkspaceNavigationItem } from "@/components/workspace/workspace-shell-data";
import { WORKSPACE_NAV_GROUPS } from "@/components/workspace/workspace-shell-data";

type TopBarProps = {
  householdName: string;
  userName: string;
  activeTitle: string;
  activeDetail: string;
  navigation: WorkspaceNavigationItem[];
  activeTab: ActiveTab;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onSignOut: () => void;
};

function formatNotificationTime(value: string) {
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

export function WorkspaceTopBar({
  householdName,
  userName,
  activeTitle,
  activeDetail,
  navigation,
  activeTab,
  notifications,
  unreadNotificationCount,
  onNavigate,
  onOpenNotification,
  onMarkAllNotificationsRead,
  onSignOut,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const recentNotifications = notifications.slice(0, 6);

  return (
    <header className="family-topbar family-animate-rise">
      <div className="family-topbar__brand">
        <p className="family-kicker family-eyebrow">FamilyFlow</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{activeTitle}</h1>
        {activeDetail ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{activeDetail}</p> : null}
      </div>

      <div className="family-topbar__actions">
        <div className="family-topbar__meta family-topbar__meta-surface">
          <span className="family-badge family-badge-warm">{householdName}</span>
          <span className="text-sm text-[var(--muted)]">{userName}</span>
        </div>
        <button
          type="button"
          aria-expanded={notificationsOpen}
          aria-controls="family-notification-menu"
          onClick={() => {
            setMenuOpen(false);
            setNotificationsOpen((current) => !current);
          }}
          className={`family-notification-button ${unreadNotificationCount > 0 ? "family-notification-button-active" : ""}`}
        >
          <span className="family-notification-button__label">Alerts</span>
          {unreadNotificationCount > 0 ? <span className="family-notification-button__count">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span> : null}
        </button>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="family-command-menu"
          onClick={() => {
            setNotificationsOpen(false);
            setMenuOpen((current) => !current);
          }}
          className="family-menu-button"
        >
          <span className="family-menu-button__label">Menu</span>
          <span className="family-menu-button__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        {menuOpen ? (
          <>
            <button type="button" aria-label="Close navigation menu" className="family-command-backdrop" onClick={() => setMenuOpen(false)} />
            <div id="family-command-menu" className="family-command-popout" role="dialog" aria-label="Page navigation">
              <div className="family-command-popout__header">
                <div>
                  <p className="family-kicker family-eyebrow">Menu</p>
                  <h2 className="mt-2 family-command-popout__title font-serif leading-tight">Pages</h2>
                </div>
                <button type="button" onClick={() => setMenuOpen(false)} className="family-btn family-btn-secondary">
                  Close
                </button>
              </div>

              <nav className="family-command-popout__nav mt-4" aria-label="Workspace pages">
                {WORKSPACE_NAV_GROUPS.map((group) => (
                  <div key={group.label} className="family-nav-group">
                    <p className="family-nav-group__label">{group.label}</p>
                    <div className="family-nav-group__items">
                      {group.items.map((item) => {
                        const isActive = item.value === activeTab;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => {
                              setMenuOpen(false);
                              onNavigate(item.value);
                            }}
                            className={`family-command-link ${isActive ? "family-command-link-active" : ""}`}
                          >
                            <span>
                              <span className="family-kicker family-eyebrow">{item.detail}</span>
                              <span className="family-command-link__title mt-2 block font-serif leading-tight">{item.label}</span>
                            </span>
                            <span className={`family-badge ${isActive ? "family-badge-accent" : "family-badge-warm"}`}>
                              {isActive ? "Here" : item.badge ?? "Open"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="family-command-popout__footer mt-4 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--line-soft)] bg-white/75 p-4">
                <div>
                  <p className="family-kicker family-eyebrow">Account</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{userName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="family-btn family-btn-secondary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {notificationsOpen ? (
        <>
          <button
            type="button"
            aria-label="Close alerts"
            className="family-command-backdrop"
            onClick={() => setNotificationsOpen(false)}
          />
          <div id="family-notification-menu" className="family-notification-popout" role="dialog" aria-label="Recent alerts">
            <div className="family-notification-popout__header">
              <div>
                <p className="family-kicker family-eyebrow">Inbox</p>
                <h2 className="mt-2 family-command-popout__title font-serif leading-tight">New alerts</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onMarkAllNotificationsRead} className="family-btn family-btn-soft">
                  Mark all read
                </button>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="family-btn family-btn-secondary">
                  Close
                </button>
              </div>
            </div>

            <div className="family-notification-popout__body mt-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      void onOpenNotification(notification);
                    }}
                    className={`family-notification-item ${notification.readAt ? "" : "family-notification-item-unread"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{notification.kind.replace("-", " ")}</p>
                        <p className="mt-2 font-serif text-xl leading-tight text-[var(--foreground)]">{notification.title}</p>
                      </div>
                      <span className={`family-badge ${notification.readAt ? "family-badge-warm" : "family-badge-accent"}`}>
                        {notification.readAt ? "Seen" : "New"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{notification.detail}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="family-notification-empty">
                  No alerts yet.
                </div>
              )}
            </div>

            <div className="family-command-popout__footer mt-4 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--line-soft)] bg-white/75 p-4">
              <div>
                <p className="family-kicker family-eyebrow">More</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Open the full inbox.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  onNavigate("inbox");
                }}
                className="family-btn family-btn-primary"
              >
                Open inbox
              </button>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
