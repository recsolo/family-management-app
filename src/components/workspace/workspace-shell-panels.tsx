"use client";

import { useState } from "react";

import type { ActiveTab } from "@/lib/workspace-tabs";
import type { AppNotification } from "@/lib/familyflow";

import type {
  WorkspaceActionTone,
  WorkspaceHeroStat,
  WorkspaceNavigationItem,
  WorkspacePageProfile,
  WorkspaceTabMeta,
} from "@/components/workspace/workspace-shell-data";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

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

type LeftRailProps = {
  roleLabel: string;
  householdName: string;
  userName: string;
  memberCount: number;
  inviteCode: string;
  saving: boolean;
  primarySuggestion: string;
  navigation: WorkspaceNavigationItem[];
  activeTab: ActiveTab;
  aiTask: AiTask;
  onNavigate: (tab: ActiveTab) => void;
  onOpenAiChatFocus: () => void;
  onGenerateMealPlan: () => void;
  onGenerateBudgetCoach: () => void;
};

type HeroPanelProps = {
  activeTab: ActiveTab;
  aiTask: AiTask;
  activeMeta: WorkspaceTabMeta;
  activeNav: WorkspaceNavigationItem;
  activeHeroStats: WorkspaceHeroStat[];
  pageProfile: WorkspacePageProfile;
};

type RightRailProps = {
  householdName: string;
  activeNav: WorkspaceNavigationItem;
  activeHeroStats: WorkspaceHeroStat[];
  pageProfile: WorkspacePageProfile;
  onSignOut: () => void;
};

function getActionButtonClass(tone: WorkspaceActionTone) {
  switch (tone) {
    case "secondary":
      return "family-btn family-btn-secondary";
    case "ghost":
      return "family-btn family-btn-ghost";
    case "soft":
      return "family-btn family-btn-soft";
    case "primary":
    default:
      return "family-btn family-btn-primary";
  }
}

function usesDarkCopy(className: string) {
  return className.includes("dark") || className.includes("accent");
}

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
        <p className="family-kicker family-eyebrow">FamilyFlow AI</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{activeTitle}</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{activeDetail}</p>
      </div>

      <div className="family-topbar__actions">
        <div className="family-topbar__meta">
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
      </div>

      {menuOpen ? (
        <>
          <button type="button" aria-label="Close navigation menu" className="family-command-backdrop" onClick={() => setMenuOpen(false)} />
          <div id="family-command-menu" className="family-command-popout" role="dialog" aria-label="Page navigation">
            <div className="family-command-popout__header">
              <div>
                <p className="family-kicker family-eyebrow">Command menu</p>
                <h2 className="mt-2 family-command-popout__title font-serif leading-tight">Jump to a page</h2>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="family-btn family-btn-secondary">
                Close
              </button>
            </div>

            <nav className="family-command-popout__nav mt-4 grid" aria-label="Workspace pages">
              {navigation.map((item) => {
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
                      {isActive ? "Open" : item.badge ?? "Go"}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="family-command-popout__footer mt-4 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--line-soft)] bg-white/75 p-4">
              <div>
                <p className="family-kicker family-eyebrow">Account</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Signed in as {userName}.</p>
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
                <p className="family-kicker family-eyebrow">Family Inbox</p>
                <h2 className="mt-2 family-command-popout__title font-serif leading-tight">Recent alerts</h2>
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
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{notification.detail}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="family-notification-empty">
                  No alerts yet. New messages, reminders, and shared wins will show up here.
                </div>
              )}
            </div>

            <div className="family-command-popout__footer mt-4 flex items-center justify-between gap-3 rounded-[24px] border border-[var(--line-soft)] bg-white/75 p-4">
              <div>
                <p className="family-kicker family-eyebrow">Open the full inbox</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  See the complete feed and clear individual items on the inbox page.
                </p>
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

export function WorkspaceLeftRail({
  roleLabel,
  householdName,
  userName,
  memberCount,
  inviteCode,
  saving,
  primarySuggestion,
  navigation,
  activeTab,
  aiTask,
  onNavigate,
  onOpenAiChatFocus,
  onGenerateMealPlan,
  onGenerateBudgetCoach,
}: LeftRailProps) {
  const activeNav = navigation.find((item) => item.value === activeTab) ?? navigation[0];

  return (
    <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
      <section className="family-panel family-animate-rise rounded-[38px] p-4">
        <div className="family-card family-card-dark family-grid-lines rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">FamilyFlow AI</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(241,214,136,0.76)]">Private household operating system</p>
            </div>
            <span className="family-badge family-badge-gold">{roleLabel}</span>
          </div>

          <div className="mt-6">
            <h1 className="font-serif text-4xl leading-tight text-white">{householdName}</h1>
            <p className="mt-3 text-sm leading-7 text-stone-200">
              Signed in as {userName}. {memberCount} linked member{memberCount === 1 ? "" : "s"} sharing the same planning space.
            </p>
          </div>

          <div className="mt-6 family-dark-note">
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Invite code</p>
            <p className="mt-3 font-serif text-[1.85rem] tracking-[0.28em] text-white">{inviteCode}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="family-sidebar-note">
            <p className="family-kicker family-eyebrow">Sync status</p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {saving ? "Syncing the latest household changes." : "Everything is already saved for the family."}
            </p>
          </div>
          <div className="family-side-stat">
            <p className="family-kicker">Assistant cue</p>
            <p className="mt-3 text-sm leading-7 text-stone-100">{primarySuggestion}</p>
          </div>
        </div>
      </section>

      <section className="family-card family-command family-animate-rise rounded-[34px] p-3">
        <div className="family-nav-status mx-1 rounded-[24px] p-4">
          <p className="family-kicker family-eyebrow">You are here</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight">{activeNav.label}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{activeNav.detail} is the page on screen right now.</p>
        </div>
        <nav className="mt-3 space-y-3" aria-label="Primary">
          {navigation.map((item) => {
            const isActive = activeTab === item.value;

            return (
              <button
                key={item.value}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate(item.value)}
                className={`family-tab ${isActive ? "family-tab-active" : ""}`}
              >
                <span className={`family-tab-beacon ${isActive ? "family-tab-beacon-active" : ""}`} aria-hidden="true" />
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className={`family-kicker ${isActive ? "text-[rgba(241,214,136,0.76)]" : ""}`}>{isActive ? "Page open now" : item.detail}</span>
                    <span className="mt-2 block font-serif text-2xl leading-tight">{item.label}</span>
                  </span>
                  <span className={`family-tab-status ${isActive ? "family-tab-status-active" : ""}`}>{isActive ? "Open" : "Go"}</span>
                </span>
                <span className={`mt-3 block text-sm leading-7 ${isActive ? "text-stone-200" : "text-[var(--muted)]"}`}>
                  {isActive ? "This is the page you are looking at right now." : `Switch to ${item.label}.`}
                </span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="family-card family-card-dark family-animate-rise rounded-[34px] p-5">
        <p className="family-kicker text-[rgba(241,214,136,0.76)]">Quick concierge actions</p>
        <h2 className="mt-3 font-serif text-3xl leading-tight">Run the next smart move.</h2>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={onGenerateMealPlan} disabled={aiTask !== null} className="family-btn family-btn-primary w-full justify-between">
            <span>{aiTask === "meal-plan" ? "Generating plan..." : "Build meal plan"}</span>
            <span className="family-kicker text-black/60">Meals</span>
          </button>
          <button type="button" onClick={onGenerateBudgetCoach} disabled={aiTask !== null} className="family-btn family-btn-secondary w-full justify-between">
            <span>{aiTask === "budget-coach" ? "Analyzing..." : "Review money plan"}</span>
            <span className="family-kicker text-white/70">Budget</span>
          </button>
          <button
            type="button"
            onClick={activeTab === "ai" ? onOpenAiChatFocus : () => onNavigate("ai")}
            className="family-btn family-btn-ghost w-full justify-between"
          >
            <span>{activeTab === "ai" ? "Open chat-only view" : "Open AI Studio"}</span>
            <span className="family-kicker text-[rgba(241,214,136,0.76)]">Assistant</span>
          </button>
        </div>
      </section>
    </aside>
  );
}

export function WorkspaceHeroPanel({
  activeTab,
  aiTask,
  activeMeta,
  activeNav,
  activeHeroStats,
  pageProfile,
}: HeroPanelProps) {
  return (
    <section className="family-panel family-animate-rise rounded-[40px] p-4 md:p-5">
      <div className="grid gap-5 2xl:grid-cols-[1.06fr_0.94fr]">
        <article className={`${pageProfile.heroClass} rounded-[34px] p-7 md:p-8`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`family-badge ${pageProfile.heroTone === "dark" ? "family-badge-gold" : "family-badge-warm"}`}>{activeMeta.eyebrow}</span>
            <span className={`family-badge ${pageProfile.heroTone === "dark" ? "family-badge-warm" : "family-badge-accent"}`}>{activeNav.label}</span>
          </div>
          <h2 className={`mt-6 max-w-3xl font-serif text-5xl leading-[0.94] md:text-6xl ${pageProfile.heroTone === "dark" ? "text-white" : "text-[var(--foreground)]"}`}>
            {activeMeta.headline}
          </h2>
          <p className={`mt-5 max-w-2xl text-base leading-8 md:text-lg ${pageProfile.heroTone === "dark" ? "text-stone-200" : "text-[var(--muted)]"}`}>
            {activeMeta.description}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {activeHeroStats.slice(0, 3).map((stat) => (
              <div key={stat.label} className={pageProfile.heroTone === "dark" ? "family-dark-note" : "family-side-stat"}>
                <p className={`family-kicker ${pageProfile.heroTone === "dark" ? "text-[rgba(241,214,136,0.76)]" : ""}`}>{stat.label}</p>
                <p className="mt-3 font-serif text-4xl text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-5">
          <article className="family-focus-card">
            <p className="family-kicker family-eyebrow">{pageProfile.focusKicker}</p>
            <h3 className="mt-3 font-serif text-4xl leading-tight">{pageProfile.focusTitle}</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{pageProfile.focusBody}</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent-strong)]">{pageProfile.focusNote}</p>
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className={`${pageProfile.featureClass} rounded-[30px] p-5`}>
              <p className={`family-kicker ${usesDarkCopy(pageProfile.featureClass) ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{pageProfile.featureKicker}</p>
              <p className={`mt-3 font-serif text-4xl leading-tight ${usesDarkCopy(pageProfile.featureClass) ? "text-white" : "text-[var(--foreground)]"}`}>{pageProfile.featureTitle}</p>
              <p className={`mt-3 text-sm leading-7 ${usesDarkCopy(pageProfile.featureClass) ? "text-white/82" : "text-[var(--muted)]"}`}>{pageProfile.featureBody}</p>
              <p className={`mt-4 text-sm ${usesDarkCopy(pageProfile.featureClass) ? "text-white/70" : "text-[var(--accent-strong)]"}`}>{pageProfile.featureMeta}</p>
              {pageProfile.featureAction ? (
                <button
                  type="button"
                  onClick={pageProfile.featureAction.onClick}
                  disabled={aiTask !== null && ["meals", "budget", "ai"].includes(activeTab)}
                  className={`${getActionButtonClass(pageProfile.featureAction.tone)} mt-5`}
                >
                  {pageProfile.featureAction.label}
                </button>
              ) : null}
            </article>

            <article className={`${pageProfile.signalClass} rounded-[30px] p-5`}>
              <p className="family-kicker family-eyebrow">{pageProfile.signalKicker}</p>
              <h3 className="mt-3 font-serif text-3xl leading-tight">{pageProfile.signalTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{pageProfile.signalBody}</p>
              {pageProfile.signalTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pageProfile.signalTags.map((tag) => (
                    <span key={tag} className="family-badge family-badge-warm">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkspaceRightRail({ householdName, activeNav, activeHeroStats, pageProfile, onSignOut }: RightRailProps) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
      <section className="family-panel family-animate-rise rounded-[34px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="family-kicker family-eyebrow">{pageProfile.railLabel}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">{activeNav.label}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{pageProfile.railDescription}</p>
          </div>
          <button type="button" onClick={onSignOut} className="family-btn family-btn-secondary">
            Sign out
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {activeHeroStats.map((stat) => (
            <div key={stat.label} className="family-side-stat">
              <p className="family-kicker family-eyebrow">{stat.label}</p>
              <p className="mt-3 font-serif text-4xl">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="family-panel family-animate-rise rounded-[34px] p-6">
        <p className="family-kicker family-eyebrow">{householdName}</p>
        <div className="mt-5 space-y-4">
          {pageProfile.railCards.map((card) => (
            <div key={`${card.kicker}-${card.title}`} className={`${card.className} rounded-[24px] p-5`}>
              <p className={`family-kicker ${usesDarkCopy(card.className) ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{card.kicker}</p>
              <h3 className={`mt-3 font-serif text-2xl ${usesDarkCopy(card.className) ? "text-white" : "text-[var(--foreground)]"}`}>{card.title}</h3>
              <p className={`mt-2 text-sm leading-7 ${usesDarkCopy(card.className) ? "text-stone-200" : "text-[var(--muted)]"}`}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="family-card family-card-dark family-animate-rise rounded-[34px] p-6">
        <p className="family-kicker text-[rgba(241,214,136,0.76)]">Private assistant context</p>
        <h3 className="mt-4 font-serif text-4xl leading-tight text-white">{pageProfile.contextTitle}</h3>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-200">
          {pageProfile.contextItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
