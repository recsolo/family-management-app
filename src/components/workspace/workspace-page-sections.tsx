"use client";

import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";

import { AssistantChatPanel } from "@/components/workspace/assistant-chat-panel";
import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import { SlideOverSheet } from "@/components/ui/slide-over-sheet";
import { useFormEditor } from "@/hooks/useFormEditor";
import {
  formatReminderWhen,
  getChoreCadenceLabel,
  getChoreStatus,
  type FamilyQuestCadence,
  type FamilyQuestMetric,
  getReminderStatus,
  getTodayKey,
  isChoreScheduledForDate,
  WEEKDAY_OPTIONS,
  type AppNotification,
  type AppState,
  type BudgetGoal,
  type BudgetStyle,
  type ChoreCadence,
  type Recipe,
} from "@/lib/familyflow";
import { formatTimestamp } from "@/lib/format";
import type { ActiveTab } from "@/lib/workspace-tabs";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";

type RecipeMatch = Recipe & {
  matches: number;
  missing: string[];
};

type BudgetPlanRow = {
  label: string;
  percent: number;
  amount: number;
};

type RouteMetric = {
  label: string;
  value: string;
  note?: string;
};

type WorkspacePageSectionsProps = {
  activeTab: ActiveTab;
  currentUserId: string;
  state: AppState;
  memberList: HouseholdMember[];
  memberNames: string[];
  role: HouseholdRole;
  computed: {
    recipeMatches: RecipeMatch[];
    bestRecipe?: RecipeMatch;
    budgetPlan: BudgetPlanRow[];
    savingsPercent: number;
    savingsAmount: number;
    completedChores: number;
    openChores: number;
    familyQuestBoard: AppState["familyQuestBoard"];
    currentUserNotifications: AppNotification[];
    unreadNotificationCount: number;
    ownerCount: number;
    adminCount: number;
  };
  actions: {
    addChore: (data: { title: string; assignee: string; cadence: ChoreCadence; dueTime: string; points: number; customDays: number[] }) => void;
    addReminder: (data: { title: string; when: string; cadence: "once" | "daily" | "weekdays" | "weekly"; scheduledFor: string; audience: string; delivery: { inApp: boolean; browser: boolean; email: boolean } }) => void;
    addRoutine: (data: { name: string; timeWindow: string; items: string[] }) => void;
    addPantryItems: (ingredients: string) => void;
    toggleChore: (id: string) => void;
    removeReminder: (id: string) => void;
    updateBudget: (key: keyof AppState["budget"], value: AppState["budget"][keyof AppState["budget"]]) => void;
    handleAssistantPrompt: (prompt: string) => void;
    generateMealPlan: () => void;
    generateBudgetCoach: () => void;
    goToTab: (tab: ActiveTab) => void;
    openAiChatFocus: () => void;
    openMemberProfile: (memberId: string) => void;
    openNotification: (notification: AppNotification) => void;
    markNotificationRead: (notificationId: string) => void;
    markAllNotificationsRead: () => void;
    redeemFamilySharedReward: (rewardId: string) => void;
    addFamilyQuest: (quest: { title: string; detail: string; cadence: FamilyQuestCadence; metric: FamilyQuestMetric; target: number; rewardPoints: number; rewardTitle: string }) => void;
    rotateInviteCode: () => void;
    saveHouseholdDetails: (event: FormEvent<HTMLFormElement>) => void;
    updateMember: (memberId: string, nextRole: Exclude<HouseholdRole, "owner">) => void;
    removeMember: (memberId: string) => void;
    enableBrowserAlerts: () => void;
  };
  uiState: {
    aiTask: "assistant" | "meal-plan" | "budget-coach" | null;
    rotatingInvite: boolean;
    savingHouseholdName: boolean;
    memberActionId: string | null;
    assistantSuggestions: string[];
    householdNameInput: string;
    setHouseholdNameInput: Dispatch<SetStateAction<string>>;
    inviteCode: string;
    canManageHousehold: boolean;
    canManageRoles: boolean;
    canRemoveMembers: boolean;
  };
};

type InsightCardProps = {
  kicker: string;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
};

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

function RouteMetricStrip({ items, tone = "light" }: { items: RouteMetric[]; tone?: "light" | "dark" }) {
  return (
    <div className="family-route-metrics">
      {items.map((item) => (
        <div key={item.label} className={tone === "dark" ? "family-dark-note" : "family-sidebar-note"}>
          <p className={`family-kicker ${tone === "dark" ? "text-[var(--on-bold-kicker)]" : "family-eyebrow"}`}>{item.label}</p>
          <p className={`mt-3 font-serif text-3xl ${tone === "dark" ? "text-white" : "text-[var(--foreground)]"}`}>{item.value}</p>
          {item.note ? <p className={`mt-2 text-sm leading-6 ${tone === "dark" ? "text-stone-200" : "text-[var(--muted)]"}`}>{item.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

function InsightCard({ kicker, title, body, className, children }: InsightCardProps) {
  return (
    <article className={`${className ?? "family-panel"} rounded-[28px] p-6 md:p-7`}>
      <p className={`family-kicker ${className?.includes("dark") || className?.includes("accent") ? "text-[var(--on-bold-kicker)]" : "family-eyebrow"}`}>{kicker}</p>
      <h3 className={`mt-4 font-serif text-4xl leading-tight ${className?.includes("dark") || className?.includes("accent") ? "text-white" : "text-[var(--foreground)]"}`}>{title}</h3>
      <p className={`mt-4 text-sm leading-7 ${className?.includes("dark") || className?.includes("accent") ? "text-stone-200" : "text-[var(--muted)]"}`}>{body}</p>
      {children}
    </article>
  );
}

function EmptyState({ children, className }: EmptyStateProps) {
  return <div className={`family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)] ${className ?? ""}`}>{children}</div>;
}

function QuestMedalShelf({ board }: { board: AppState["familyQuestBoard"] }) {
  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="family-list-card">
          <p className="family-kicker family-eyebrow">Quest streak</p>
          <p className="mt-3 font-serif text-3xl text-stone-900">{board.currentStreak} days</p>
        </div>
        <div className="family-list-card">
          <p className="family-kicker family-eyebrow">Best streak</p>
          <p className="mt-3 font-serif text-3xl text-stone-900">{board.longestStreak} days</p>
        </div>
        <div className="family-list-card">
          <p className="family-kicker family-eyebrow">Quest wins</p>
          <p className="mt-3 font-serif text-3xl text-stone-900">{board.completedQuestCount}</p>
        </div>
      </div>
      {board.medals.length > 0 ? (
        <div className="rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
          <p className="family-kicker family-eyebrow">Medal shelf</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {board.medals.slice(0, 4).map((medal) => (
              <span
                key={medal.id}
                className={`family-badge ${
                  medal.tone === "gold" ? "family-badge-gold" : medal.tone === "silver" ? "family-badge-accent" : "family-badge-warm"
                }`}
                title={medal.detail}
              >
                {medal.title}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspacePageSections(props: WorkspacePageSectionsProps) {
  switch (props.activeTab) {
    case "help":
      return <HelpPage {...props} />;
    case "inbox":
      return <InboxPage {...props} />;
    case "ops":
      return <OperationsPage {...props} />;
    case "meals":
      return <MealsPage {...props} />;
    case "budget":
      return <BudgetPage {...props} />;
    case "family":
      return <FamilyPage {...props} />;
    case "ai":
      return <AiStudioPage {...props} />;
    case "dashboard":
    default:
      return <DashboardPage {...props} />;
  }
}

function HelpPage(props: WorkspacePageSectionsProps) {
  const { state } = props;
  const { handleAssistantPrompt, openAiChatFocus } = props.actions;
  const { aiTask } = props.uiState;

  const [chatInput, setChatInput] = useState("");

  const helpPrompts = [
    "How do I invite someone into my family?",
    "How do points, rewards, and quests work?",
    "How do I use Partner Space?",
    "How do I open my profile and update it?",
  ];

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--family family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Help</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Need help?</h3>
          </div>
          <div className="family-route-chip">Help</div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <InsightCard
            kicker="Guide"
            title="Main pages"
            body="Tap a page name to learn what it does."
            className="family-panel"
          >
            <div className="mt-5 grid gap-3">
              <div className="family-list-card">
                <h4 className="font-serif text-2xl">Today</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Today&apos;s check, inbox, and quests.</p>
              </div>
              <div className="family-list-card">
                <h4 className="font-serif text-2xl">Profiles</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Goals, fitness, rewards, calendar, weather, and uploads.</p>
              </div>
              <div className="family-list-card">
                <h4 className="font-serif text-2xl">Family Room</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Members, invites, and profiles.</p>
              </div>
              <div className="family-list-card">
                <h4 className="font-serif text-2xl">Partner Space</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Private chat, dates, rewards, and milestones.</p>
              </div>
            </div>
          </InsightCard>

          <DisclosurePanel
            kicker="Questions"
            title="Ask AI"
            summary="Tap one to start."
            badge={`${helpPrompts.length} prompts`}
            defaultOpen
            className="family-panel family-surface-warm rounded-[28px] p-5 md:p-6"
          >
            <div className="grid gap-3">
              {helpPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAssistantPrompt(prompt)}
                  className="family-btn family-btn-soft justify-start rounded-[20px] px-4 py-4 text-left text-sm font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </DisclosurePanel>

          <InsightCard
            kicker="Ready"
            title={`${state.memberProfiles.length} profiles and ${state.notifications.length} alerts`}
            body="AI answers using your family data."
            className="family-card family-card-dark"
          />
        </div>

        <AssistantChatPanel
          history={state.assistantHistory}
          chatInput={chatInput}
          onChatInputChange={(value) => setChatInput(value)}
          onSubmitPrompt={handleAssistantPrompt}
          aiTask={aiTask}
          assistantSuggestions={helpPrompts}
          onOpenFocus={openAiChatFocus}
        />
      </div>
    </div>
  );
}

function DashboardPage(props: WorkspacePageSectionsProps) {
  const { state, memberList } = props;
  const { completedChores, currentUserNotifications, unreadNotificationCount, familyQuestBoard } = props.computed;
  const { goToTab, toggleChore } = props.actions;

  const todayKey = getTodayKey();
  const todayChores = state.chores.filter((chore) => isChoreScheduledForDate(chore, new Date()));
  const openTodayChores = todayChores.filter((chore) => !chore.done);
  const latestCompletedQuest = familyQuestBoard.quests
    .filter((quest) => quest.completedAt)
    .slice()
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))[0];
  const focusReminders = state.reminders
    .filter((reminder) => getReminderStatus(reminder, new Date()) === "due" || getReminderStatus(reminder, new Date()) === "scheduled")
    .slice(0, 3);
  const latestNotifications = currentUserNotifications.slice(0, 3);
  const todaysEvents = state.memberProfiles.flatMap((profile) =>
    profile.calendarEvents
      .filter((event) => event.date === todayKey)
      .map((event) => ({
        ...event,
        memberName: memberList.find((member) => member.id === profile.memberId)?.name ?? "Family member",
      })),
  );

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--dashboard family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Today</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Today</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Only the family items that matter today.</p>
          </div>
          <div className="family-route-chip">Today</div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DisclosurePanel
          kicker="Today&apos;s family check"
          title={`${completedChores}/${todayChores.length} done`}
          summary="Today only."
          badge={`${openTodayChores.length} open`}
          defaultOpen
          className="family-panel family-route-board family-route-board--dashboard family-animate-rise rounded-[32px] p-5 md:p-6"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Chores left</p>
              <p className="mt-3 font-serif text-3xl">{openTodayChores.length}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Events today</p>
              <p className="mt-3 font-serif text-3xl">{todaysEvents.length}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Reminders</p>
              <p className="mt-3 font-serif text-3xl">{focusReminders.length}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">New inbox</p>
              <p className="mt-3 font-serif text-3xl">{unreadNotificationCount}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => goToTab("inbox")} className="family-btn family-btn-secondary">
              Open inbox
            </button>
            <button type="button" onClick={() => goToTab("ops")} className="family-btn family-btn-soft">
              Open family ops
            </button>
          </div>
        </DisclosurePanel>

        <DisclosurePanel
          kicker="Family Inbox"
          title={unreadNotificationCount > 0 ? `${unreadNotificationCount} new` : "All clear"}
          summary="Latest alerts"
          badge={`${latestNotifications.length} shown`}
          defaultOpen
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-3">
            {latestNotifications.length > 0 ? (
              latestNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => goToTab("inbox")}
                  className={`family-list-card w-full text-left ${notification.readAt ? "" : "family-list-card-done"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{notification.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{notification.detail}</p>
                    </div>
                    <span className={`family-badge ${notification.readAt ? "family-badge-warm" : "family-badge-accent"}`}>
                      {notification.readAt ? "Seen" : "New"}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState>No alerts right now.</EmptyState>
            )}
          </div>
        </DisclosurePanel>

        <DisclosurePanel
          kicker="Family in the loop"
          title="Today"
          summary="Events, reminders, chores"
          badge={`${todaysEvents.length + focusReminders.length + openTodayChores.length} items`}
          defaultOpen
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-3">
            {todaysEvents.slice(0, 2).map((event) => (
              <div key={`${event.memberName}-${event.id}`} className="family-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl">{event.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {event.memberName}
                      {event.time ? ` at ${event.time}` : ""}
                    </p>
                  </div>
                  <span className="family-badge family-badge-accent">Event</span>
                </div>
              </div>
            ))}
            {focusReminders.slice(0, 2).map((reminder) => (
              <div key={reminder.id} className="family-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl">{reminder.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {formatReminderWhen(reminder)} for {reminder.audience}
                    </p>
                  </div>
                  <span className="family-badge family-badge-gold">Reminder</span>
                </div>
              </div>
            ))}
            {openTodayChores.slice(0, 2).map((chore) => (
              <button
                key={chore.id}
                type="button"
                onClick={() => toggleChore(chore.id)}
                className="family-list-card w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl">{chore.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {chore.assignee} / {getChoreCadenceLabel(chore)}
                    </p>
                  </div>
                  <span className="family-badge family-badge-warm">Chore</span>
                </div>
              </button>
            ))}
            {todaysEvents.length === 0 && focusReminders.length === 0 && openTodayChores.length === 0 ? (
              <EmptyState>Nothing urgent today.</EmptyState>
            ) : null}
          </div>
        </DisclosurePanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DisclosurePanel
          kicker="Quest board"
          title={`${familyQuestBoard.sharedPoints} shared points`}
          summary="Quest progress"
          badge={`${familyQuestBoard.quests.length} quests`}
          defaultOpen
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-3">
            {familyQuestBoard.quests.slice(0, 3).map((quest) => (
              <div key={quest.id} className="family-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl">{quest.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{quest.detail}</p>
                  </div>
                  <span className={`family-badge ${quest.completedAt ? "family-badge-accent" : "family-badge-gold"}`}>
                    {quest.progress}/{quest.target}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {quest.completedAt ? `${quest.rewardTitle} unlocked` : `${quest.rewardPoints} shared points`}
                </p>
              </div>
            ))}
          </div>
          {latestCompletedQuest ? (
            <div className="mt-5 rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
              <p className="family-kicker family-eyebrow">Latest unlock</p>
              <p className="mt-3 font-serif text-2xl text-stone-900">{latestCompletedQuest.rewardTitle}</p>
            </div>
          ) : null}
          <DisclosurePanel
            kicker="Badges"
            title="Streak medals"
            summary="Open to see quest medals."
            badge={`${familyQuestBoard.medals.length} medals`}
            className="mt-5 rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4"
          >
            <QuestMedalShelf board={familyQuestBoard} />
          </DisclosurePanel>
        </DisclosurePanel>
      </div>
    </div>
  );
}

function InboxPage(props: WorkspacePageSectionsProps) {
  const { currentUserNotifications, unreadNotificationCount } = props.computed;
  const { markAllNotificationsRead, markNotificationRead, openNotification } = props.actions;

  const newestAlert = currentUserNotifications[0];
  const unreadAlerts = currentUserNotifications.filter((notification) => !notification.readAt);
  const olderAlerts = currentUserNotifications.filter((notification) => notification.readAt);

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--family family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Inbox</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Family Inbox</h3>
          </div>
          <div className="family-route-chip">Inbox</div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <RouteMetricStrip
            items={[
              { label: "New", value: `${unreadNotificationCount}`, note: unreadNotificationCount > 0 ? "Check these first." : "Nothing new." },
              { label: "All alerts", value: `${currentUserNotifications.length}`, note: "Recent updates." },
              { label: "Latest", value: newestAlert ? newestAlert.kind.replace("-", " ") : "Quiet", note: newestAlert ? newestAlert.title : "No alerts yet." },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Actions</p>
            <button type="button" onClick={markAllNotificationsRead} className="family-btn family-btn-primary mt-4">
              Mark all read
            </button>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="family-panel family-route-board family-route-board--family family-animate-rise rounded-[28px] p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">New</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Unread first</h3>
            </div>
            <span className="family-badge family-badge-accent">{unreadNotificationCount} unread</span>
          </div>
          <div className="mt-5 space-y-4">
            {unreadAlerts.length > 0 ? (
              unreadAlerts.map((notification) => (
                <div key={notification.id} className="family-inbox-card family-inbox-card-unread">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">{notification.kind.replace("-", " ")}</p>
                      <h4 className="mt-3 font-serif text-2xl">{notification.title}</h4>
                    </div>
                    <span className="family-badge family-badge-accent">New</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{notification.detail}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => openNotification(notification)} className="family-btn family-btn-primary">
                      Open
                    </button>
                    <button type="button" onClick={() => markNotificationRead(notification.id)} className="family-btn family-btn-soft">
                      Mark read
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>No unread alerts.</EmptyState>
            )}
          </div>
        </article>

        <DisclosurePanel
          kicker="Older"
          title="Seen alerts"
          summary="Open older alerts when you need them."
          badge={`${olderAlerts.length} seen`}
          className="family-panel family-surface-warm rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-4">
            {olderAlerts.length > 0 ? (
              olderAlerts.slice(0, 8).map((notification) => (
                <button key={notification.id} type="button" onClick={() => openNotification(notification)} className="family-inbox-card w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">{notification.kind.replace("-", " ")}</p>
                      <h4 className="mt-3 font-serif text-xl">{notification.title}</h4>
                    </div>
                    <span className="family-badge family-badge-warm">Seen</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{notification.detail}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState>No older alerts.</EmptyState>
            )}
          </div>
        </DisclosurePanel>
      </div>
    </div>
  );
}

function OperationsPage(props: WorkspacePageSectionsProps) {
  const { state, memberNames } = props;
  const { completedChores } = props.computed;
  const { addChore, toggleChore, addReminder, removeReminder, enableBrowserAlerts } = props.actions;

  const [opsSheetOpen, setOpsSheetOpen] = useState(false);

  const choreForm = useFormEditor({
    defaults: {
      title: "",
      assignee: memberNames[0] ?? "",
      cadence: "daily" as ChoreCadence,
      dueTime: "09:00",
      points: "5",
      customDays: [] as number[],
    },
    onSubmit: (fields) => {
      addChore({
        title: fields.title,
        assignee: fields.assignee,
        cadence: fields.cadence,
        dueTime: fields.dueTime,
        points: Number(fields.points) || 5,
        customDays: fields.customDays,
      });
      setOpsSheetOpen(false);
    },
    validate: (fields) => fields.title.trim().length > 0,
  });

  const reminderForm = useFormEditor({
    defaults: {
      title: "",
      when: "",
      cadence: "once" as "once" | "daily" | "weekdays" | "weekly",
      scheduledFor: "",
      audience: "Family",
      inApp: true,
      browser: false,
      email: false,
    },
    onSubmit: (fields) => {
      addReminder({
        title: fields.title,
        when: fields.when,
        cadence: fields.cadence,
        scheduledFor: fields.scheduledFor,
        audience: fields.audience,
        delivery: { inApp: fields.inApp, browser: fields.browser, email: fields.email },
      });
      setOpsSheetOpen(false);
    },
    validate: (fields) => fields.title.trim().length > 0,
  });

  function toggleChoreDay(day: number) {
    const current = choreForm.fields.customDays;
    choreForm.setField(
      "customDays",
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  const todayChores = state.chores.filter((chore) => isChoreScheduledForDate(chore, new Date()));
  const dueChores = todayChores.filter((chore) => getChoreStatus(chore, new Date()) === "due");
  const overdueChores = todayChores.filter((chore) => getChoreStatus(chore, new Date()) === "overdue");
  const dueReminders = state.reminders.filter((reminder) => getReminderStatus(reminder, new Date()) === "due");
  const upcomingReminders = state.reminders
    .filter((reminder) => {
      const status = getReminderStatus(reminder, new Date());
      return status === "due" || status === "scheduled";
    })
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--ops family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Chores and reminders</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">See what is due today.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">Family Ops</div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <RouteMetricStrip
            tone="dark"
            items={[
              { label: "Due now", value: `${dueChores.length}`, note: `${completedChores} finished today.` },
              { label: "Overdue", value: `${overdueChores.length}`, note: overdueChores.length > 0 ? "These should stand out first." : "Nothing late right now." },
              { label: "Due reminders", value: `${dueReminders.length}`, note: `${memberNames.length} people can receive reminders.` },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Simple flow</p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Clear today first</p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <article className="family-panel family-route-board family-route-board--ops family-animate-rise rounded-[28px] p-6 md:p-7 family-ops-board-shell">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">Today&apos;s chore board</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Only what matters today.</h3>
            </div>
            <span className="family-badge family-badge-gold">{todayChores.filter((chore) => !chore.done).length} open</span>
          </div>
          <div className="mt-6 space-y-4">
            {todayChores.length > 0 ? (
              todayChores
                .slice()
                .sort((left, right) => {
                  const order = { overdue: 0, due: 1, done: 2, upcoming: 3 } as const;
                  return order[getChoreStatus(left, new Date())] - order[getChoreStatus(right, new Date())];
                })
                .map((chore) => {
                  const status = getChoreStatus(chore, new Date());

                  return (
                    <button
                      key={chore.id}
                      type="button"
                      onClick={() => toggleChore(chore.id)}
                      className={`family-ops-chore-card ${chore.done ? "family-ops-chore-card-done" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-serif text-2xl">{chore.title}</h4>
                          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                            {chore.assignee} / {getChoreCadenceLabel(chore)} / by {chore.dueTime}
                          </p>
                        </div>
                        <span className={`family-badge ${status === "done" ? "family-badge-accent" : status === "overdue" ? "family-badge-danger" : "family-badge-gold"}`}>
                          {status === "done" ? "Done" : status === "overdue" ? "Late" : "Due"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                        {chore.points} pts · {chore.streakCount} day streak
                      </p>
                    </button>
                  );
                })
            ) : (
              <EmptyState>No chores are scheduled for today. Add one below if you want the board to fill in.</EmptyState>
            )}
          </div>
        </article>

        <div className="family-panel family-animate-rise rounded-[28px] p-5 md:p-6 flex items-center justify-between gap-4">
          <div>
            <p className="family-kicker family-eyebrow">Setup</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Add chores and reminders with repeat rules.</p>
          </div>
          <button type="button" onClick={() => setOpsSheetOpen(true)} className="family-btn family-btn-primary">
            Add / schedule
          </button>
        </div>

        <SlideOverSheet open={opsSheetOpen} onClose={() => setOpsSheetOpen(false)} title="Add chore or reminder">
          <div className="space-y-5">
            <form className="space-y-4" onSubmit={choreForm.handleSubmit}>
              <p className="family-kicker family-eyebrow">New chore</p>
              <label className="block text-sm font-medium text-stone-700">
                Job
                <input value={choreForm.fields.title} onChange={(event) => choreForm.setField("title", event.target.value)} placeholder="Take out recycling" className="family-input mt-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Assign to
                  <select value={choreForm.fields.assignee} onChange={(event) => choreForm.setField("assignee", event.target.value)} className="family-select mt-2">
                    {memberNames.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Repeats
                  <select value={choreForm.fields.cadence} onChange={(event) => choreForm.setField("cadence", event.target.value as ChoreCadence)} className="family-select mt-2">
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Once a week</option>
                    <option value="custom">Custom days</option>
                  </select>
                </label>
              </div>
              {(choreForm.fields.cadence === "custom" || choreForm.fields.cadence === "weekly") ? (
                <div>
                  <p className="text-sm font-medium text-stone-700">Days</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleChoreDay(day.value)}
                        className={`family-nav-pill ${choreForm.fields.customDays.includes(day.value) ? "family-nav-pill-active" : ""}`}
                      >
                        {day.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Due time
                  <input type="time" value={choreForm.fields.dueTime} onChange={(event) => choreForm.setField("dueTime", event.target.value)} className="family-input mt-2" />
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Points
                  <input type="number" min="1" step="1" value={choreForm.fields.points} onChange={(event) => choreForm.setField("points", event.target.value)} className="family-input mt-2" />
                </label>
              </div>
              <button type="submit" className="family-btn family-btn-primary">
                Add chore
              </button>
            </form>

            <form className="space-y-4 border-t border-[var(--line-soft)] pt-5" onSubmit={reminderForm.handleSubmit}>
              <p className="family-kicker family-eyebrow">New reminder</p>
              <label className="block text-sm font-medium text-stone-700">
                Reminder
                <input value={reminderForm.fields.title} onChange={(event) => reminderForm.setField("title", event.target.value)} placeholder="Dentist forms in backpack" className="family-input mt-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Date and time
                  <input
                    type="datetime-local"
                    value={reminderForm.fields.scheduledFor}
                    onChange={(event) => {
                      reminderForm.setFields({ scheduledFor: event.target.value, when: event.target.value });
                    }}
                    className="family-input mt-2"
                  />
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Repeat
                  <select value={reminderForm.fields.cadence} onChange={(event) => reminderForm.setField("cadence", event.target.value as "once" | "daily" | "weekdays" | "weekly")} className="family-select mt-2">
                    <option value="once">One time</option>
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Every week</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-stone-700">
                Who gets it
                <select value={reminderForm.fields.audience} onChange={(event) => reminderForm.setField("audience", event.target.value)} className="family-select mt-2">
                  <option value="Family">Family</option>
                  {memberNames.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-3">
                <p className="text-sm font-medium text-stone-700">How it should show up</p>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={reminderForm.fields.inApp} onChange={(event) => reminderForm.setField("inApp", event.target.checked)} />
                  In the app inbox
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={reminderForm.fields.browser} onChange={(event) => reminderForm.setField("browser", event.target.checked)} />
                  Browser alert
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={reminderForm.fields.email} onChange={(event) => reminderForm.setField("email", event.target.checked)} />
                  Email reminder
                </label>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={enableBrowserAlerts} className="family-btn family-btn-soft">
                    Enable browser alerts
                  </button>
                  <button type="submit" className="family-btn family-btn-primary">
                    Save reminder
                  </button>
                </div>
              </div>
            </form>
          </div>
        </SlideOverSheet>
      </div>

      <article className="family-panel family-animate-rise rounded-[30px] p-6 md:p-7 family-reminder-shell">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="family-kicker family-eyebrow">Reminder queue</p>
            <h3 className="mt-4 font-serif text-4xl leading-tight">Only the next reminders stay visible.</h3>
          </div>
          <span className="family-badge family-badge-accent">{dueReminders.length} due now</span>
        </div>
        <div className="mt-6 space-y-4">
          {upcomingReminders.length > 0 ? (
            upcomingReminders.map((reminder) => {
              const status = getReminderStatus(reminder, new Date());

              return (
                <div key={reminder.id} className="family-reminder-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{reminder.title}</h4>
                      <p className="family-reminder-time mt-3">{formatReminderWhen(reminder)}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        For {reminder.audience} · {status === "due" ? "Due now" : "Coming up"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`family-badge ${status === "due" ? "family-badge-danger" : "family-badge-gold"}`}>
                        {status === "due" ? "Due" : "Soon"}
                      </span>
                      <button type="button" onClick={() => removeReminder(reminder.id)} className="family-btn family-btn-secondary px-3 py-2 text-xs uppercase tracking-[0.2em]">
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState>No active reminders are showing yet. Add one from the tucked-away setup panel when you need it.</EmptyState>
          )}
        </div>
      </article>
    </div>
  );
}

function MealsPage(props: WorkspacePageSectionsProps) {
  const { state } = props;
  const { recipeMatches, bestRecipe } = props.computed;
  const { addPantryItems, generateMealPlan } = props.actions;
  const { aiTask } = props.uiState;

  const [ingredientInput, setIngredientInput] = useState("");

  const topRecipeMatches = recipeMatches.slice(0, 4);
  const tonightRecipe = bestRecipe ?? topRecipeMatches[0];
  const tonightMissingCount = tonightRecipe?.missing.length ?? 0;

  function handleAddPantryItems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ingredientInput.trim()) {
      addPantryItems(ingredientInput);
      setIngredientInput("");
    }
  }

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--meals family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Dinner</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Pick tonight&apos;s meal.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">See the best match first, then open the other tools only when you need them.</p>
          </div>
          <div className="family-route-chip">Dinner</div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="family-route-notice family-route-notice--dark family-meals-match-card">
            <p className="family-kicker text-[var(--on-bold-kicker)]">Best match</p>
            <h4 className="mt-4 font-serif text-3xl text-white">{tonightRecipe ? tonightRecipe.name : "No dinner pick yet"}</h4>
            <p className="mt-3 text-sm leading-6 text-stone-200">
              {tonightRecipe
                ? tonightMissingCount > 0
                  ? `${tonightRecipe.matches}/${tonightRecipe.ingredients.length} ready. Still need ${tonightMissingCount} more item${tonightMissingCount === 1 ? "" : "s"}.`
                  : "Everything is ready for tonight."
                : "Add pantry items to get a dinner pick."}
            </p>
            {tonightRecipe ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] bg-white/8 px-4 py-3">
                  <p className="family-kicker text-[var(--on-bold-kicker)]">Ready</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{tonightRecipe.matches}</p>
                </div>
                <div className="rounded-[18px] bg-white/8 px-4 py-3">
                  <p className="family-kicker text-[var(--on-bold-kicker)]">Buy</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{tonightMissingCount}</p>
                </div>
                <div className="rounded-[18px] bg-white/8 px-4 py-3">
                  <p className="family-kicker text-[var(--on-bold-kicker)]">Type</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-100">
                    {tonightRecipe.tags[0] ?? "Dinner"}
                  </p>
                </div>
              </div>
            ) : null}
            {tonightRecipe?.missing.length ? (
              <div className="mt-4 rounded-[18px] bg-white/8 px-4 py-3">
                <p className="family-kicker text-[var(--on-bold-kicker)]">Need to buy</p>
                <p className="mt-2 text-sm leading-6 text-stone-100">{tonightRecipe.missing.join(", ")}</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="family-route-notice family-route-notice--gold family-meals-ai-card">
              <p className="family-kicker family-eyebrow">AI plan</p>
              <h4 className="mt-4 font-serif text-3xl leading-tight">Build tonight&apos;s plan</h4>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Get prep notes and a short shopping list.</p>
              <button type="button" onClick={generateMealPlan} disabled={aiTask !== null} className="family-btn family-btn-secondary mt-5">
                {aiTask === "meal-plan" ? "Generating..." : "Build dinner plan"}
              </button>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Pantry</p>
              <p className="mt-3 font-serif text-3xl">{state.pantry.length} items</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {state.pantry.length > 0 ? "Open Pantry to add or change what you have." : "Open Pantry and add a few basics."}
              </p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-5">
        <DisclosurePanel
          kicker="Pantry"
          title="Pantry"
          summary="Add or update what you have."
          badge={`${state.pantry.length} items`}
          className="family-panel family-surface-warm family-meals-form-card rounded-[28px] p-5 md:p-6"
        >
          <form className="space-y-4" onSubmit={handleAddPantryItems}>
            <label className="block text-sm font-medium text-stone-700">
              Pantry items
              <input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Tomatoes, rice, tortillas" className="family-input mt-2" />
            </label>
            <button type="submit" className="family-btn family-btn-primary">
              Save pantry
            </button>
          </form>
          <div className="family-pantry-shelf mt-6">
            {state.pantry.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {state.pantry.map((item) => (
                  <span key={item} className="family-pantry-chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState>Add a few basics to get started.</EmptyState>
            )}
          </div>
        </DisclosurePanel>

        <DisclosurePanel
          kicker="More ideas"
          title="Dinner ideas"
          summary="Open more recipe matches."
          badge={`${topRecipeMatches.length} ideas`}
          className="family-panel family-route-board family-route-board--meals family-animate-rise rounded-[30px] p-5 md:p-6"
        >
          <div className="grid gap-4">
            {topRecipeMatches.length > 0 ? (
              topRecipeMatches.map((recipe, index) => (
                <article key={recipe.name} className={`family-recipe-card ${index === 0 ? "family-recipe-card-top" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{recipe.name}</h4>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{recipe.description}</p>
                    </div>
                    <span className={`family-badge ${recipe.matches > 0 ? "family-badge-accent" : "family-badge-warm"}`}>
                      {recipe.matches}/{recipe.ingredients.length} ready
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                    {recipe.missing.length > 0 ? `Need: ${recipe.missing.join(", ")}.` : "Ready to cook."}
                  </p>
                  <div className="family-recipe-meter mt-4">
                    <div className="family-recipe-meter__fill" style={{ width: `${(recipe.matches / recipe.ingredients.length) * 100}%` }} />
                  </div>
                </article>
              ))
            ) : (
              <EmptyState>Add pantry items to see dinner ideas.</EmptyState>
            )}
          </div>
        </DisclosurePanel>

        <DisclosurePanel
          kicker="AI dinner plan"
          title="Dinner plan"
          summary="Open the full plan when you want prep notes and the shopping list."
          badge={state.latestMealPlan ? "Ready" : "Not built"}
          className="family-panel family-route-board family-route-board--meals-accent family-animate-rise rounded-[30px] p-5 md:p-6 family-meal-plan-shell"
        >
          {state.latestMealPlan ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-4xl leading-tight">{state.latestMealPlan.headline}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{state.latestMealPlan.summary}</p>
              </div>
              <div className="space-y-4">
                {state.latestMealPlan.meals.slice(0, 3).map((meal) => (
                  <div key={`${meal.day}-${meal.recipe}`} className="family-meal-day">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{meal.day}</p>
                        <h4 className="mt-3 font-serif text-2xl">{meal.recipe}</h4>
                      </div>
                      <span className="family-badge family-badge-gold">{meal.missingIngredients.length > 0 ? "Needs extras" : "Ready"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{meal.whyItFits}</p>
                    <div className="family-meal-day__grid mt-4">
                      <div>
                        <p className="family-kicker family-eyebrow">Uses</p>
                        <p className="mt-2 text-sm leading-7 text-stone-700">{meal.usesIngredients.join(", ")}</p>
                      </div>
                      <div>
                        <p className="family-kicker family-eyebrow">Need</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{meal.missingIngredients.length > 0 ? meal.missingIngredients.join(", ") : "Nothing extra"}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Prep: {meal.prepNote}</p>
                  </div>
                ))}
              </div>
              <div className="family-shopping-card">
                <p className="family-kicker family-eyebrow">Shopping list</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {state.latestMealPlan.shoppingList.slice(0, 8).map((item) => (
                    <span key={item} className="family-badge family-badge-warm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState>Build a dinner plan when you want prep notes and a shopping list.</EmptyState>
          )}
        </DisclosurePanel>
      </div>
    </div>
  );
}

function BudgetPage(props: WorkspacePageSectionsProps) {
  const { state } = props;
  const { budgetPlan, savingsPercent, savingsAmount } = props.computed;
  const { updateBudget, generateBudgetCoach } = props.actions;
  const { aiTask } = props.uiState;

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--budget family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Money</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">See your money plan.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">Budget Lab</div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
          <RouteMetricStrip
            tone="dark"
            items={[
              { label: "Income", value: `$${state.budget.income.toLocaleString()}`, note: "Monthly take-home." },
              { label: "Savings", value: `${savingsPercent}%`, note: `$${savingsAmount.toLocaleString()} set aside.` },
              { label: "Mode", value: state.budget.style, note: `Goal: ${state.budget.goal}.` },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">AI help</p>
            <h4 className="mt-4 font-serif text-3xl leading-tight">Get a quick money check.</h4>
            <button type="button" onClick={generateBudgetCoach} disabled={aiTask !== null} className="family-btn family-btn-primary mt-5">
              {aiTask === "budget-coach" ? "Generating..." : "Check my plan"}
            </button>
          </div>
        </div>
      </article>

      <div className="grid gap-5">
        <article className="family-panel family-route-board family-route-board--budget family-animate-rise rounded-[28px] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="family-kicker family-eyebrow">Suggested plan</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Monthly split</h3>
            </div>
            <span className="family-badge family-badge-gold">{budgetPlan.length} categories</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {budgetPlan.map((row) => (
              <div key={row.label} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                <p className="family-kicker family-eyebrow">{row.label}</p>
                <p className="mt-3 text-4xl font-semibold text-stone-900">{row.percent}%</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">${row.amount.toLocaleString()} per month</p>
              </div>
            ))}
          </div>
        </article>

        <DisclosurePanel
          kicker="Change numbers"
          title="Edit budget"
          summary="Open this only when you want to change the plan."
          badge="Settings"
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-4">
            <label className="block text-sm font-medium text-stone-700">
              Income
              <input
                type="number"
                min="0"
                step="100"
                value={state.budget.income}
                onChange={(event) => updateBudget("income", Number(event.target.value) || 0)}
                className="family-input mt-2"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Family size
              <input
                type="number"
                min="1"
                max="10"
                value={state.budget.familySize}
                onChange={(event) => updateBudget("familySize", Number(event.target.value) || 1)}
                className="family-input mt-2"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Goal
              <select value={state.budget.goal} onChange={(event) => updateBudget("goal", event.target.value as BudgetGoal)} className="family-select mt-2">
                <option value="stability">Monthly stability</option>
                <option value="savings">Increase savings</option>
                <option value="debt">Pay down debt</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Style
              <select value={state.budget.style} onChange={(event) => updateBudget("style", event.target.value as BudgetStyle)} className="family-select mt-2">
                <option value="balanced">Balanced</option>
                <option value="lean">Lean</option>
                <option value="comfort">Comfort-first</option>
              </select>
            </label>
          </div>
        </DisclosurePanel>

        <DisclosurePanel
          kicker="AI budget help"
          title="AI notes"
          summary="Open the coach notes only when you want extra guidance."
          badge={state.latestBudgetCoach ? "Ready" : "No report"}
          className="family-panel family-animate-rise rounded-[28px] p-5 md:p-6"
        >
          {state.latestBudgetCoach ? (
            <div className="space-y-5">
              <div className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                <p className="family-kicker family-eyebrow">Summary</p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestBudgetCoach.summary}</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="family-card family-card-dark rounded-[24px] p-5">
                  <p className="family-kicker text-[var(--on-bold-kicker)]">Wins</p>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-100">
                    {state.latestBudgetCoach.wins.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="family-card family-card-gold rounded-[24px] p-5">
                  <p className="family-kicker family-eyebrow">Watch</p>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--foreground)]">
                    {state.latestBudgetCoach.watchouts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                  <p className="family-kicker family-eyebrow">Next</p>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--muted)]">
                    {state.latestBudgetCoach.nextSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState>Run the AI check when you want help with the plan.</EmptyState>
          )}
        </DisclosurePanel>
      </div>
    </div>
  );
}

function FamilyPage(props: WorkspacePageSectionsProps) {
  const { state, currentUserId, role, memberList } = props;
  const { ownerCount, adminCount } = props.computed;
  const { updateMember, removeMember, saveHouseholdDetails, rotateInviteCode, addRoutine, openMemberProfile } = props.actions;
  const {
    memberActionId,
    canManageRoles,
    canRemoveMembers,
    canManageHousehold,
    householdNameInput,
    setHouseholdNameInput,
    savingHouseholdName,
    inviteCode,
    rotatingInvite,
  } = props.uiState;

  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [routineTimeWindow, setRoutineTimeWindow] = useState("");
  const [routineItems, setRoutineItems] = useState("");

  function handleAddRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (routineName.trim()) {
      addRoutine({
        name: routineName,
        timeWindow: routineTimeWindow,
        items: routineItems.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setRoutineName("");
      setRoutineTimeWindow("");
      setRoutineItems("");
    }
  }

  function getInviteLink() {
    if (typeof window === "undefined") {
      return "";
    }

    const params = new URLSearchParams({
      mode: "join",
      inviteCode,
      household: householdNameInput,
    });

    return `${window.location.origin}/?${params.toString()}`;
  }

  async function copyInviteValue(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setShareStatus(message);
    } catch {
      setShareStatus("Copy failed. Please try again.");
    }
  }

  async function handleCopyInviteLink() {
    const inviteLink = getInviteLink();
    if (!inviteLink) {
      setShareStatus("Invite link is not ready yet.");
      return;
    }

    await copyInviteValue(inviteLink, "Invite link copied.");
  }

  async function handleCopyInviteMessage() {
    const inviteLink = getInviteLink();
    if (!inviteLink) {
      setShareStatus("Invite link is not ready yet.");
      return;
    }

    const familyName = householdNameInput || "our family space";
    const inviteMessage = `Join ${familyName} on FamilyFlow AI.\nUse invite code ${inviteCode} or open this link:\n${inviteLink}`;
    await copyInviteValue(inviteMessage, "Invite message copied.");
  }

  async function handleShareInvite() {
    const inviteLink = getInviteLink();
    if (!inviteLink) {
      setShareStatus("Invite link is not ready yet.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const familyName = householdNameInput || "our family space";
        await navigator.share({
          title: `Join ${familyName} on FamilyFlow AI`,
          text: `Join ${familyName} with invite code ${inviteCode}.`,
          url: inviteLink,
        });
        setShareStatus("Invite shared.");
        return;
      } catch {
        // Fall back to copy if the share dialog is canceled or unavailable.
      }
    }

    await handleCopyInviteLink();
  }

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--family family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Family</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Manage your family.</h3>
          </div>
          <div className="family-route-chip">Family Room</div>
        </div>
        <div className="mt-6">
          <RouteMetricStrip
            items={[
              { label: "Members", value: `${memberList.length}`, note: `${ownerCount} owner and ${adminCount} admin.` },
              { label: "Invite code", value: inviteCode, note: canManageHousehold ? "Admins can change it." : "Ask an admin to change it." },
              { label: "Routines", value: `${state.routines.length}`, note: state.routines[0] ? state.routines[0].name : "None yet." },
            ]}
          />
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--family family-animate-rise rounded-[28px] p-6 md:p-7">
          <p className="family-kicker family-eyebrow">Family members</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight">Members</h3>
          <div className="mt-5 space-y-3">
            {memberList.map((member) => {
              const isCurrentUser = member.id === currentUserId;
              const canChangeRole = canManageRoles && !isCurrentUser && member.role !== "owner";
              const canRemoveMember = canRemoveMembers && !isCurrentUser && (role === "owner" ? member.role !== "owner" : member.role === "member");
              const memberBusy = memberActionId === member.id;
              const profile = state.memberProfiles.find((entry) => entry.memberId === member.id);
              const points = profile?.pointsBalance ?? 0;

              return (
                <div key={member.id} className="rounded-[22px] border border-[var(--line-soft)] bg-white/74 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">
                        {member.name}
                        {isCurrentUser ? " (you)" : ""}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{member.email}</p>
                    </div>
                    <span className={`family-badge ${member.role === "owner" ? "family-badge-warm" : member.role === "admin" ? "family-badge-accent" : "family-badge-gold"}`}>
                      {member.role}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                    <span className="family-badge family-badge-warm">{points} pts</span>
                    <span>{profile?.goals.filter((goal) => goal.status === "done").length ?? 0} goals done</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => openMemberProfile(member.id)} className="family-btn family-btn-primary">
                      Open profile
                    </button>
                    {!isCurrentUser ? (
                      <button type="button" onClick={() => openMemberProfile(member.id)} className="family-btn family-btn-soft">
                        Open chat
                      </button>
                    ) : null}
                  </div>
                  {(canChangeRole || canRemoveMember) ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {canChangeRole ? (
                        <label className="text-sm font-medium text-stone-700">
                          Role
                          <select
                            value={member.role}
                            onChange={(event) => updateMember(member.id, event.target.value as Exclude<HouseholdRole, "owner">)}
                            disabled={memberBusy}
                            className="family-select ml-2 inline-flex w-auto min-w-[8rem]"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        </label>
                      ) : null}
                      {canRemoveMember ? (
                        <button type="button" onClick={() => removeMember(member.id)} disabled={memberBusy} className="family-btn family-btn-secondary">
                          {memberBusy ? "Updating..." : "Remove member"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        <div className="grid gap-5">
          <DisclosurePanel
            kicker="Invite family"
            title="Invite family"
            summary="Open this when you need the invite tools."
            badge="Invite tools"
            defaultOpen
            className="family-panel family-surface-warm rounded-[28px] p-5 md:p-6"
          >
            <form className="space-y-4" onSubmit={saveHouseholdDetails}>
              <label className="block text-sm font-medium text-stone-700">
                Family name
                <input
                  value={householdNameInput}
                  onChange={(event) => setHouseholdNameInput(event.target.value)}
                  disabled={!canManageHousehold || savingHouseholdName}
                  className="family-input mt-2 disabled:cursor-not-allowed disabled:bg-stone-100"
                />
              </label>
              <button type="submit" disabled={!canManageHousehold || savingHouseholdName} className="family-btn family-btn-primary">
                {savingHouseholdName ? "Saving..." : "Save name"}
              </button>
            </form>
            <div className="mt-5 rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
              <p className="family-kicker family-eyebrow">Invite code</p>
              <p className="mt-4 text-center font-serif text-4xl tracking-[0.3em] text-stone-900">{inviteCode}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleCopyInviteLink()} className="family-btn family-btn-primary">
                  Copy link
                </button>
                <button type="button" onClick={() => void handleCopyInviteMessage()} className="family-btn family-btn-soft">
                  Copy message
                </button>
                <button type="button" onClick={() => void handleShareInvite()} className="family-btn family-btn-secondary">
                  Share
                </button>
              </div>
              {shareStatus ? <p className="mt-4 text-sm leading-6 text-[var(--accent-strong)]">{shareStatus}</p> : null}
            </div>
            <button type="button" onClick={rotateInviteCode} disabled={!canManageHousehold || rotatingInvite} className="family-btn family-btn-secondary mt-5">
              {rotatingInvite ? "Refreshing..." : "New invite code"}
            </button>
          </DisclosurePanel>

          <InsightCard
            kicker="Routines"
            title={state.routines[0] ? state.routines[0].name : "No routine yet"}
            body={state.routines[0] ? `${state.routines[0].timeWindow}. ${state.routines[0].items.join(", ")}.` : "Add a routine below."}
            className="family-card family-card-gold"
          />
        </div>
      </div>

      <DisclosurePanel
        kicker="Routines"
        title="Routines"
        summary="Open this when you want to add or review routines."
        badge={`${state.routines.length} saved`}
        className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-5 md:p-6"
      >
        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <form className="space-y-4" onSubmit={handleAddRoutine}>
              <label className="block text-sm font-medium text-stone-700">
                Routine name
                <input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Saturday reset" className="family-input mt-2" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Time window
                <input value={routineTimeWindow} onChange={(event) => setRoutineTimeWindow(event.target.value)} placeholder="9:00 AM - 10:30 AM" className="family-input mt-2" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Steps
                <input value={routineItems} onChange={(event) => setRoutineItems(event.target.value)} placeholder="Laundry, wipe counters, prep snacks" className="family-input mt-2" />
              </label>
              <button type="submit" className="family-btn family-btn-primary">
                Add routine
              </button>
            </form>
          </div>

          <div className="family-route-column">
            <div>
              <p className="family-kicker family-eyebrow">Saved routines</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Saved routines</h3>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {state.routines.length > 0 ? (
                state.routines.map((routine) => (
                  <div key={routine.id} className="rounded-[22px] border border-[var(--line-soft)] bg-white/74 p-4">
                    <h4 className="font-serif text-2xl">{routine.name}</h4>
                    <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">{routine.timeWindow}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{routine.items.join(", ")}</p>
                  </div>
                ))
              ) : (
                <EmptyState className="md:col-span-2">Add your first routine.</EmptyState>
              )}
            </div>
          </div>
        </div>
      </DisclosurePanel>
    </div>
  );
}

function AiStudioPage(props: WorkspacePageSectionsProps) {
  const { state } = props;
  const { handleAssistantPrompt, openAiChatFocus } = props.actions;
  const { aiTask, assistantSuggestions } = props.uiState;

  const [chatInput, setChatInput] = useState("");

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--ai family-animate-rise rounded-[30px] p-5 md:p-6">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">AI</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Ask a question.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">AI</div>
        </div>
        <div className="mt-5">
          <button type="button" onClick={openAiChatFocus} className="family-btn family-btn-primary">
            Open chat only
          </button>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <AssistantChatPanel
          history={state.assistantHistory}
          chatInput={chatInput}
          onChatInputChange={(value) => setChatInput(value)}
          onSubmitPrompt={handleAssistantPrompt}
          aiTask={aiTask}
          assistantSuggestions={assistantSuggestions}
          onOpenFocus={openAiChatFocus}
        />

        <DisclosurePanel
          kicker="Prompts"
          title="Prompts"
          summary="Tap one to start."
          badge={`${assistantSuggestions.length} prompts`}
          defaultOpen
          className="family-panel family-surface-warm rounded-[28px] p-5 md:p-6"
        >
          <div className="grid gap-3">
            {assistantSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleAssistantPrompt(suggestion)}
                disabled={aiTask !== null}
                className="family-btn family-btn-soft justify-start rounded-[20px] px-4 py-4 text-left text-sm font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </DisclosurePanel>
      </div>
    </div>
  );
}
