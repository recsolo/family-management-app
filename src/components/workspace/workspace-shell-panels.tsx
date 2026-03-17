"use client";

import type { ActiveTab } from "@/lib/workspace-tabs";

import type {
  WorkspaceActionTone,
  WorkspaceHeroStat,
  WorkspaceNavigationItem,
  WorkspacePageProfile,
  WorkspaceTabMeta,
} from "@/components/workspace/workspace-shell-data";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

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
