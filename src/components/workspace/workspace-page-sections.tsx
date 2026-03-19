"use client";

import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";

import { AssistantChatPanel } from "@/components/workspace/assistant-chat-panel";
import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import {
  formatReminderWhen,
  getChoreCadenceLabel,
  getChoreStatus,
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
import type { ActiveTab } from "@/lib/workspace-tabs";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

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
  householdNameInput: string;
  setHouseholdNameInput: Dispatch<SetStateAction<string>>;
  inviteCode: string;
  canManageHousehold: boolean;
  canManageRoles: boolean;
  canRemoveMembers: boolean;
  ingredientInput: string;
  setIngredientInput: Dispatch<SetStateAction<string>>;
  choreTitle: string;
  setChoreTitle: Dispatch<SetStateAction<string>>;
  choreAssignee: string;
  setChoreAssignee: Dispatch<SetStateAction<string>>;
  choreCadence: ChoreCadence;
  setChoreCadence: Dispatch<SetStateAction<ChoreCadence>>;
  choreDueTime: string;
  setChoreDueTime: Dispatch<SetStateAction<string>>;
  chorePoints: string;
  setChorePoints: Dispatch<SetStateAction<string>>;
  choreDays: number[];
  toggleChoreDay: (day: number) => void;
  reminderTitle: string;
  setReminderTitle: Dispatch<SetStateAction<string>>;
  reminderWhen: string;
  setReminderWhen: Dispatch<SetStateAction<string>>;
  reminderCadence: "once" | "daily" | "weekdays" | "weekly";
  setReminderCadence: Dispatch<SetStateAction<"once" | "daily" | "weekdays" | "weekly">>;
  reminderScheduledFor: string;
  setReminderScheduledFor: Dispatch<SetStateAction<string>>;
  reminderAudience: string;
  setReminderAudience: Dispatch<SetStateAction<string>>;
  reminderInApp: boolean;
  setReminderInApp: Dispatch<SetStateAction<boolean>>;
  reminderBrowser: boolean;
  setReminderBrowser: Dispatch<SetStateAction<boolean>>;
  reminderEmail: boolean;
  setReminderEmail: Dispatch<SetStateAction<boolean>>;
  routineName: string;
  setRoutineName: Dispatch<SetStateAction<string>>;
  routineTimeWindow: string;
  setRoutineTimeWindow: Dispatch<SetStateAction<string>>;
  routineItems: string;
  setRoutineItems: Dispatch<SetStateAction<string>>;
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  aiTask: AiTask;
  rotatingInvite: boolean;
  savingHouseholdName: boolean;
  memberActionId: string | null;
  assistantSuggestions: string[];
  currentUserNotifications: AppNotification[];
  unreadNotificationCount: number;
  recipeMatches: RecipeMatch[];
  bestRecipe?: RecipeMatch;
  familyQuestBoard: AppState["familyQuestBoard"];
  budgetPlan: BudgetPlanRow[];
  savingsPercent: number;
  savingsAmount: number;
  completedChores: number;
  openChores: number;
  ownerCount: number;
  adminCount: number;
  goToTab: (tab: ActiveTab) => void;
  openAiChatFocus: () => void;
  openMemberProfile: (memberId: string) => void;
  openNotification: (notification: AppNotification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  redeemFamilySharedReward: (rewardId: string) => void;
  handleAssistantPrompt: (prompt: string) => void;
  generateMealPlan: () => void;
  generateBudgetCoach: () => void;
  rotateInviteCode: () => void;
  saveHouseholdDetails: (event: FormEvent<HTMLFormElement>) => void;
  updateMember: (memberId: string, nextRole: Exclude<HouseholdRole, "owner">) => void;
  removeMember: (memberId: string) => void;
  addPantryItems: (event: FormEvent<HTMLFormElement>) => void;
  updateBudget: (key: keyof AppState["budget"], value: AppState["budget"][keyof AppState["budget"]]) => void;
  addChore: (event: FormEvent<HTMLFormElement>) => void;
  toggleChore: (id: string) => void;
  addReminder: (event: FormEvent<HTMLFormElement>) => void;
  removeReminder: (id: string) => void;
  addRoutine: (event: FormEvent<HTMLFormElement>) => void;
  enableBrowserAlerts: () => void;
};

type PageProps = Omit<WorkspacePageSectionsProps, "activeTab">;

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
          <p className={`family-kicker ${tone === "dark" ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{item.label}</p>
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
      <p className={`family-kicker ${className?.includes("dark") || className?.includes("accent") ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{kicker}</p>
      <h3 className={`mt-4 font-serif text-4xl leading-tight ${className?.includes("dark") || className?.includes("accent") ? "text-white" : "text-[var(--foreground)]"}`}>{title}</h3>
      <p className={`mt-4 text-sm leading-7 ${className?.includes("dark") || className?.includes("accent") ? "text-stone-200" : "text-[var(--muted)]"}`}>{body}</p>
      {children}
    </article>
  );
}

function EmptyState({ children, className }: EmptyStateProps) {
  return <div className={`family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)] ${className ?? ""}`}>{children}</div>;
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

export function WorkspacePageSections(props: WorkspacePageSectionsProps) {
  switch (props.activeTab) {
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

function DashboardPage({
  state,
  bestRecipe,
  memberList,
  completedChores,
  openChores,
  currentUserNotifications,
  unreadNotificationCount,
  familyQuestBoard,
  goToTab,
  toggleChore,
}: PageProps) {
  const todayKey = getTodayKey();
  const firstReminder = state.reminders[0];
  const firstRoutine = state.routines[0];
  const dinnerLead = state.latestMealPlan?.meals[0];
  const todayChores = state.chores.filter((chore) => isChoreScheduledForDate(chore, new Date()));
  const focusReminders = state.reminders
    .filter((reminder) => getReminderStatus(reminder, new Date()) === "due" || getReminderStatus(reminder, new Date()) === "scheduled")
    .slice(0, 3);
  const todaysEvents = state.memberProfiles.flatMap((profile) =>
    profile.calendarEvents
      .filter((event) => event.date === todayKey)
      .map((event) => ({
        ...event,
        memberName: memberList.find((member) => member.id === profile.memberId)?.name ?? "Family member",
      })),
  );
  const dashboardMetrics: RouteMetric[] = [
    {
      label: "Dinner tonight",
      value: dinnerLead?.recipe ?? bestRecipe?.name ?? "Still deciding",
      note: dinnerLead ? dinnerLead.whyItFits : bestRecipe ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients already line up.` : "Add pantry staples to unlock smarter dinner guidance.",
    },
    {
      label: "Today's events",
      value: `${todaysEvents.length}`,
      note: todaysEvents[0] ? `${todaysEvents[0].memberName}: ${todaysEvents[0].title}` : "Member appointments show up here on the day they happen.",
    },
    {
      label: "Household load",
      value: `${todayChores.filter((chore) => !chore.done).length} chores`,
      note: `${focusReminders.length} reminder${focusReminders.length === 1 ? "" : "s"} are on deck.`,
    },
  ];

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--dashboard family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Today&apos;s family check</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">See what&apos;s next today.</h3>
          </div>
          <div className="family-route-chip">Today</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Keep this page focused on today: dinner, chores, reminders, and appointments that need attention right now.
        </p>
        <div className="mt-6">
          <RouteMetricStrip items={dashboardMetrics} />
        </div>
      </article>

      <div className="grid gap-5 2xl:grid-cols-[1.04fr_0.96fr]">
        <InsightCard
          kicker="Tonight's dinner signal"
          title={dinnerLead?.recipe ?? bestRecipe?.name ?? "Set the pantry stage"}
          body={
            dinnerLead
              ? `${dinnerLead.day} is already mapped with a dinner choice, so you can move straight into prep instead of debating what to cook.`
              : bestRecipe
                ? `${bestRecipe.name} is the strongest current match based on what is already in the house. This makes dinner planning feel like a decision desk instead of a guess.`
                : "Add pantry items so the meal planner can stop guessing and start suggesting dinner from what the family actually has."
          }
          className="family-card family-card-dark family-grid-lines"
        >
          {dinnerLead ? (
            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/10 p-4 text-sm leading-7 text-stone-100">
              {dinnerLead.whyItFits}
            </div>
          ) : bestRecipe ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {bestRecipe.ingredients.map((ingredient) => (
                <span key={ingredient} className="family-badge bg-white/10 text-stone-100">
                  {ingredient}
                </span>
              ))}
            </div>
          ) : null}
        </InsightCard>

        <DisclosurePanel
          kicker="Appointments for today"
          title="Know who needs to be where."
          summary="Tap to open the day schedule without keeping it on screen all the time."
          badge={`${todaysEvents.length} today`}
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-3">
            {todaysEvents.length > 0 ? (
              todaysEvents.slice(0, 4).map((event) => (
                <div key={`${event.memberName}-${event.id}`} className="family-list-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{event.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {event.memberName}
                        {event.time ? ` / ${event.time}` : ""}
                      </p>
                    </div>
                    <span className="family-badge family-badge-accent">Today</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{event.detail || "Open the member profile for more details."}</p>
                </div>
              ))
            ) : (
              <EmptyState>No appointments are on the calendar for today yet.</EmptyState>
            )}
          </div>
        </DisclosurePanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <DisclosurePanel
          kicker="Chore board"
          title={`${completedChores}/${todayChores.length} done today`}
          summary="Open the chore list when you want to clear jobs, then tuck it away again."
          badge={`${todayChores.filter((chore) => !chore.done).length} open`}
          defaultOpen
          className="family-panel family-route-board family-route-board--dashboard family-animate-rise rounded-[32px] p-5 md:p-6"
        >
          <div className="space-y-3">
            {todayChores.length > 0 ? (
              todayChores.slice(0, 4).map((chore) => (
                <button
                  key={chore.id}
                  type="button"
                  onClick={() => toggleChore(chore.id)}
                  className={`family-list-card w-full text-left ${chore.done ? "family-list-card-done" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{chore.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {chore.assignee} / {getChoreCadenceLabel(chore)}
                      </p>
                    </div>
                    <span className={`family-badge ${chore.done ? "family-badge-accent" : "family-badge-gold"}`}>
                      {chore.done ? "Done" : "Open"}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState>Add the first chore to start building a visible shared completion board.</EmptyState>
            )}
          </div>
        </DisclosurePanel>

        <div className="grid gap-5">
          <InsightCard
            kicker="Coming up"
            title={focusReminders[0] ? focusReminders[0].title : firstReminder ? firstReminder.title : "No reminder queued"}
            body={
              focusReminders[0]
                ? `${formatReminderWhen(focusReminders[0])} for ${focusReminders[0].audience}.`
                : firstReminder
                  ? `${formatReminderWhen(firstReminder)} for ${firstReminder.audience}.`
                  : "Capture school items, pickup timing, or household resets so they do not disappear into memory."
            }
            className="family-panel family-surface-warm"
          />

          <InsightCard
            kicker="Today's rhythm"
            title={firstRoutine ? firstRoutine.name : "No shared routine yet"}
            body={
              firstRoutine
                ? `${firstRoutine.timeWindow}. ${firstRoutine.items.join(", ")}.`
                : "Add a repeatable routine so the household has a steady rhythm for mornings, after-school, or evenings."
            }
            className="family-card family-card-soft"
          >
            <button type="button" onClick={() => goToTab("meals")} className="family-btn family-btn-secondary mt-5">
              Open Meal Planner
            </button>
          </InsightCard>
        </div>
      </div>

      <div className="grid gap-5">
        <InsightCard
          kicker="Family quest board"
          title={`${familyQuestBoard.sharedPoints} shared points ready`}
          body="Daily and weekly quests turn chores, goals, and game time into one team reward loop."
          className="family-panel"
        >
          <div className="mt-5 space-y-3">
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
          <button type="button" onClick={() => goToTab("games")} className="family-btn family-btn-secondary mt-5">
            Open Game Room
          </button>
        </InsightCard>

        <InsightCard
          kicker="Family in the loop"
          title={`${memberList.length} people are connected.`}
          body="Profiles, private chats, and the family room all work better when everyone has their own place in the app."
          className="family-panel"
        >
          <div className="mt-5 flex flex-wrap gap-2">
            {memberList.slice(0, 6).map((member) => (
              <span key={member.id} className="family-badge family-badge-accent">
                {member.name}
              </span>
            ))}
          </div>
        </InsightCard>

        <InsightCard
          kicker="Family Inbox"
          title={unreadNotificationCount > 0 ? `${unreadNotificationCount} fresh alert${unreadNotificationCount === 1 ? "" : "s"}` : "Inbox is calm"}
          body={
            currentUserNotifications[0]
              ? `${currentUserNotifications[0].title}. ${currentUserNotifications[0].detail}`
              : "New messages, reminders, and shared wins will show up here first."
          }
          className="family-card family-card-gold"
        >
          <button type="button" onClick={() => goToTab("inbox")} className="family-btn family-btn-secondary mt-5">
            Open inbox
          </button>
        </InsightCard>
      </div>
    </div>
  );
}

function InboxPage({
  currentUserNotifications,
  unreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
}: PageProps) {
  const newestAlert = currentUserNotifications[0];
  const unreadAlerts = currentUserNotifications.filter((notification) => !notification.readAt);
  const olderAlerts = currentUserNotifications.filter((notification) => notification.readAt);

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--family family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Family inbox</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Catch every update in one feed.</h3>
          </div>
          <div className="family-route-chip">Inbox</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Messages, reminders, partner nudges, and shared wins all land here so the next thing to do is easy to spot.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <RouteMetricStrip
            items={[
              { label: "Unread alerts", value: `${unreadNotificationCount}`, note: unreadNotificationCount > 0 ? "These should stand out first." : "Nothing urgent is waiting." },
              { label: "Saved alerts", value: `${currentUserNotifications.length}`, note: "Recent family events stay in the feed." },
              { label: "Latest alert", value: newestAlert ? newestAlert.kind.replace("-", " ") : "Quiet", note: newestAlert ? newestAlert.title : "The feed will fill as the family uses the app." },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Quick action</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Open an alert to jump straight to the right page, or mark items read when you already handled them.
            </p>
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
              <p className="family-kicker family-eyebrow">Needs your eye</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Unread first.</h3>
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
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{notification.detail}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {formatNotificationTime(notification.createdAt)}
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
              <EmptyState>No unread alerts right now. The inbox is fully caught up.</EmptyState>
            )}
          </div>
        </article>

        <DisclosurePanel
          kicker="Recent history"
          title="Everything else you already saw."
          summary="Keep old alerts tucked away until you want to revisit them."
          badge={`${olderAlerts.length} seen`}
          className="family-panel family-surface-warm rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-4">
            {olderAlerts.length > 0 ? (
              olderAlerts.slice(0, 12).map((notification) => (
                <button key={notification.id} type="button" onClick={() => openNotification(notification)} className="family-inbox-card w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">{notification.kind.replace("-", " ")}</p>
                      <h4 className="mt-3 font-serif text-2xl">{notification.title}</h4>
                    </div>
                    <span className="family-badge family-badge-warm">Seen</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{notification.detail}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {formatNotificationTime(notification.createdAt)}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState>Once you start clearing alerts, the recent history feed will show them here.</EmptyState>
            )}
          </div>
        </DisclosurePanel>
      </div>
    </div>
  );
}

function OperationsPage({
  state,
  memberNames,
  choreTitle,
  setChoreTitle,
  choreAssignee,
  setChoreAssignee,
  choreCadence,
  setChoreCadence,
  choreDueTime,
  setChoreDueTime,
  chorePoints,
  setChorePoints,
  choreDays,
  toggleChoreDay,
  addChore,
  completedChores,
  toggleChore,
  reminderTitle,
  setReminderTitle,
  reminderWhen,
  setReminderWhen,
  reminderCadence,
  setReminderCadence,
  reminderScheduledFor,
  setReminderScheduledFor,
  reminderAudience,
  setReminderAudience,
  reminderInApp,
  setReminderInApp,
  reminderBrowser,
  setReminderBrowser,
  reminderEmail,
  setReminderEmail,
  addReminder,
  removeReminder,
  enableBrowserAlerts,
}: PageProps) {
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
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          This page now stays focused on today: what is due, what is late, and what needs to be added.
        </p>
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
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Keep the forms tucked away, clear today&apos;s jobs first, and let alerts handle the rest.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <article className="family-panel family-route-board family-route-board--ops family-animate-rise rounded-[28px] p-6 md:p-7 family-ops-board-shell">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">Today&apos;s chore board</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Only what matters today.</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Tap a card to mark it done. Overdue chores stay at the top.</p>
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

        <DisclosurePanel
          kicker="Add or schedule"
          title="Keep setup hidden until you need it."
          summary="One place to add chores and reminders with repeat rules and delivery choices."
          badge="Open setup"
          className="family-panel family-surface-accent family-ops-form-card rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-5">
            <form className="space-y-4" onSubmit={addChore}>
              <p className="family-kicker family-eyebrow">New chore</p>
              <label className="block text-sm font-medium text-stone-700">
                Job
                <input value={choreTitle} onChange={(event) => setChoreTitle(event.target.value)} placeholder="Take out recycling" className="family-input mt-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Assign to
                  <select value={choreAssignee} onChange={(event) => setChoreAssignee(event.target.value)} className="family-select mt-2">
                    {memberNames.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Repeats
                  <select value={choreCadence} onChange={(event) => setChoreCadence(event.target.value as ChoreCadence)} className="family-select mt-2">
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Once a week</option>
                    <option value="custom">Custom days</option>
                  </select>
                </label>
              </div>
              {(choreCadence === "custom" || choreCadence === "weekly") ? (
                <div>
                  <p className="text-sm font-medium text-stone-700">Days</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleChoreDay(day.value)}
                        className={`family-nav-pill ${choreDays.includes(day.value) ? "family-nav-pill-active" : ""}`}
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
                  <input type="time" value={choreDueTime} onChange={(event) => setChoreDueTime(event.target.value)} className="family-input mt-2" />
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Points
                  <input type="number" min="1" step="1" value={chorePoints} onChange={(event) => setChorePoints(event.target.value)} className="family-input mt-2" />
                </label>
              </div>
              <button type="submit" className="family-btn family-btn-primary">
                Add chore
              </button>
            </form>

            <form className="space-y-4 border-t border-[var(--line-soft)] pt-5" onSubmit={addReminder}>
              <p className="family-kicker family-eyebrow">New reminder</p>
              <label className="block text-sm font-medium text-stone-700">
                Reminder
                <input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="Dentist forms in backpack" className="family-input mt-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Date and time
                  <input
                    type="datetime-local"
                    value={reminderScheduledFor}
                    onChange={(event) => {
                      setReminderScheduledFor(event.target.value);
                      setReminderWhen(event.target.value);
                    }}
                    className="family-input mt-2"
                  />
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Repeat
                  <select value={reminderCadence} onChange={(event) => setReminderCadence(event.target.value as "once" | "daily" | "weekdays" | "weekly")} className="family-select mt-2">
                    <option value="once">One time</option>
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Every week</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-stone-700">
                Who gets it
                <select value={reminderAudience} onChange={(event) => setReminderAudience(event.target.value)} className="family-select mt-2">
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
                  <input type="checkbox" checked={reminderInApp} onChange={(event) => setReminderInApp(event.target.checked)} />
                  In the app inbox
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={reminderBrowser} onChange={(event) => setReminderBrowser(event.target.checked)} />
                  Browser alert
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={reminderEmail} onChange={(event) => setReminderEmail(event.target.checked)} />
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
        </DisclosurePanel>
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

function MealsPage({
  state,
  ingredientInput,
  setIngredientInput,
  addPantryItems,
  bestRecipe,
  recipeMatches,
  aiTask,
  generateMealPlan,
}: PageProps) {
  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--meals family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Meal time</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Pick meals from what you already have.</h3>
          </div>
          <div className="family-route-chip">Meal Planner</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Add pantry items, compare recipes, and build a meal plan from one page.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <DisclosurePanel
            kicker="Pantry tools"
            title="Add what you have."
            summary="Open this only when you want to update pantry items or check the shelf."
            badge={`${state.pantry.length} items`}
            defaultOpen
            className="family-panel family-surface-warm family-meals-form-card rounded-[28px] p-5 md:p-6"
          >
            <form className="space-y-4" onSubmit={addPantryItems}>
              <label className="block text-sm font-medium text-stone-700">
                Add ingredients
                <input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Tomatoes, rice, tortillas" className="family-input mt-2" />
              </label>
              <button type="submit" className="family-btn family-btn-primary">
                Add pantry items
              </button>
            </form>
            <div className="family-pantry-shelf mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="family-kicker family-eyebrow">Pantry shelf</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">These are the ingredients your meal page can already work with.</p>
                </div>
                <span className="family-badge family-badge-gold">{state.pantry.length} items</span>
              </div>
              {state.pantry.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {state.pantry.map((item) => (
                    <span key={item} className="family-pantry-chip">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState className="mt-4">Add a few staples and this shelf will start filling in.</EmptyState>
              )}
            </div>
          </DisclosurePanel>

          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="family-route-notice family-route-notice--dark family-meals-match-card">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Best match</p>
              <h4 className="mt-4 font-serif text-3xl text-white">{bestRecipe ? bestRecipe.name : "No pantry leader yet"}</h4>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                {bestRecipe
                  ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients are already covered. Missing: ${bestRecipe.missing.length > 0 ? bestRecipe.missing.join(", ") : "nothing extra needed"}.`
                  : "Once the pantry has a few staples, this route becomes the fastest path from ingredients to dinner."}
              </p>
              {bestRecipe ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {bestRecipe.ingredients.map((ingredient) => (
                    <span key={ingredient} className="family-badge bg-white/10 text-stone-100">
                      {ingredient}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="family-route-notice family-route-notice--gold family-meals-ai-card">
              <p className="family-kicker family-eyebrow">AI help</p>
              <h4 className="mt-4 font-serif text-3xl leading-tight">Turn your pantry into a meal plan.</h4>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Generate a plan and get shopping needs, prep notes, and meal order.</p>
              <button type="button" onClick={generateMealPlan} disabled={aiTask !== null} className="family-btn family-btn-secondary mt-5">
                {aiTask === "meal-plan" ? "Generating..." : "Generate AI meal plan"}
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--meals family-animate-rise rounded-[30px] p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">Recipe ideas</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Meals that fit your pantry.</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">The top card is the strongest current match, then everything else follows behind it.</p>
            </div>
            <span className="family-badge family-badge-gold">{state.pantry.length} pantry items</span>
          </div>
          <div className="mt-6 grid gap-4">
            {recipeMatches.map((recipe, index) => (
              <article key={recipe.name} className={`family-recipe-card ${index === 0 ? "family-recipe-card-top" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl">{recipe.name}</h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{recipe.description}</p>
                  </div>
                  <span className={`family-badge ${recipe.matches > 0 ? "family-badge-accent" : "family-badge-warm"}`}>{recipe.matches}/{recipe.ingredients.length} ready</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {recipe.missing.length > 0 ? `Still needed: ${recipe.missing.join(", ")}.` : "You already have everything needed for this recipe."}
                </p>
                <div className="family-recipe-meter mt-4">
                  <div className="family-recipe-meter__fill" style={{ width: `${(recipe.matches / recipe.ingredients.length) * 100}%` }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="family-badge family-badge-warm">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="family-panel family-route-board family-route-board--meals-accent family-animate-rise rounded-[30px] p-6 md:p-7 family-meal-plan-shell">
          <p className="family-kicker family-eyebrow">AI meal plan</p>
          {state.latestMealPlan ? (
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="font-serif text-4xl leading-tight">{state.latestMealPlan.headline}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestMealPlan.summary}</p>
              </div>
              <div className="space-y-4">
                {state.latestMealPlan.meals.map((meal) => (
                  <div key={`${meal.day}-${meal.recipe}`} className="family-meal-day">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{meal.day}</p>
                        <h4 className="mt-3 font-serif text-2xl">{meal.recipe}</h4>
                      </div>
                      <span className="family-badge family-badge-gold">{meal.missingIngredients.length > 0 ? "Needs a few extras" : "Ready to cook"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{meal.whyItFits}</p>
                    <div className="family-meal-day__grid mt-4">
                      <div>
                        <p className="family-kicker family-eyebrow">Uses</p>
                        <p className="mt-2 text-sm leading-7 text-stone-700">{meal.usesIngredients.join(", ")}</p>
                      </div>
                      <div>
                        <p className="family-kicker family-eyebrow">Missing</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{meal.missingIngredients.length > 0 ? meal.missingIngredients.join(", ") : "Nothing extra needed"}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Prep note: {meal.prepNote}</p>
                  </div>
                ))}
              </div>
              <div className="family-shopping-card">
                <p className="family-kicker family-eyebrow">Shopping list</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {state.latestMealPlan.shoppingList.map((item) => (
                    <span key={item} className="family-badge family-badge-warm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState className="mt-4">Generate a meal plan and the assistant will turn your pantry into a practical multi-day cooking plan.</EmptyState>
          )}
        </article>
      </div>
    </div>
  );
}

function BudgetPage({
  state,
  updateBudget,
  budgetPlan,
  aiTask,
  generateBudgetCoach,
  savingsPercent,
  savingsAmount,
}: PageProps) {
  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--budget family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Money plan</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">See a simple plan for your money.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">Budget Lab</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          Update your numbers, review the plan, and get budget help without leaving this page.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
          <RouteMetricStrip
            tone="dark"
            items={[
              { label: "Income", value: `$${state.budget.income.toLocaleString()}`, note: "Monthly take-home baseline." },
              { label: "Savings reserve", value: `${savingsPercent}%`, note: `$${savingsAmount.toLocaleString()} currently protected.` },
              { label: "Planning mode", value: state.budget.style, note: `Primary goal is ${state.budget.goal}.` },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Coach ready</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Run the coach when you want translated next steps instead of another static percentage chart.
            </p>
            <button type="button" onClick={generateBudgetCoach} disabled={aiTask !== null} className="family-btn family-btn-primary mt-5">
              {aiTask === "budget-coach" ? "Generating..." : "Get AI budget coaching"}
            </button>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <DisclosurePanel
          kicker="Budget settings"
          title="Set the family money plan."
          summary="Open the settings only when you want to change the numbers."
          badge="Money inputs"
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <div className="space-y-4">
            <label className="block text-sm font-medium text-stone-700">
              Monthly take-home income
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
              Primary goal
              <select value={state.budget.goal} onChange={(event) => updateBudget("goal", event.target.value as BudgetGoal)} className="family-select mt-2">
                <option value="stability">Monthly stability</option>
                <option value="savings">Increase savings</option>
                <option value="debt">Pay down debt</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Planning style
              <select value={state.budget.style} onChange={(event) => updateBudget("style", event.target.value as BudgetStyle)} className="family-select mt-2">
                <option value="balanced">Balanced</option>
                <option value="lean">Lean</option>
                <option value="comfort">Comfort-first</option>
              </select>
            </label>
          </div>
        </DisclosurePanel>

        <article className="family-panel family-route-board family-route-board--budget family-animate-rise rounded-[28px] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="family-kicker family-eyebrow">Suggested plan</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Your monthly split.</h3>
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
      </div>

      <DisclosurePanel
        kicker="AI budget help"
        title="Budget help for your family."
        summary="Open the coaching notes when you want AI guidance instead of raw numbers."
        badge={state.latestBudgetCoach ? "Coach ready" : "No report"}
        className="family-panel family-animate-rise rounded-[28px] p-5 md:p-6"
      >
        {state.latestBudgetCoach ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-4xl leading-tight">Budget help for your family.</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestBudgetCoach.summary}</p>
              </div>
              <div className="family-card family-card-dark rounded-[24px] p-5">
                <p className="family-kicker text-[rgba(241,214,136,0.76)]">Wins</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-100">
                  {state.latestBudgetCoach.wins.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-5">
              <div className="family-card family-card-gold rounded-[24px] p-5">
                <p className="family-kicker family-eyebrow">Watchouts</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--foreground)]">
                  {state.latestBudgetCoach.watchouts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                <p className="family-kicker family-eyebrow">Next steps</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--muted)]">
                  {state.latestBudgetCoach.nextSteps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState>Generate budget coaching and the assistant will review the current household plan and suggest next actions.</EmptyState>
        )}
      </DisclosurePanel>
    </div>
  );
}

function FamilyPage({
  state,
  currentUserId,
  role,
  memberList,
  memberActionId,
  updateMember,
  removeMember,
  canManageRoles,
  canRemoveMembers,
  canManageHousehold,
  householdNameInput,
  setHouseholdNameInput,
  saveHouseholdDetails,
  savingHouseholdName,
  inviteCode,
  rotatingInvite,
  rotateInviteCode,
  routineName,
  setRoutineName,
  routineTimeWindow,
  setRoutineTimeWindow,
  routineItems,
  setRoutineItems,
  addRoutine,
  familyQuestBoard,
  redeemFamilySharedReward,
  ownerCount,
  adminCount,
  goToTab,
  openMemberProfile,
}: PageProps) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

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
            <p className="family-kicker family-eyebrow">Family setup</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Invite family and keep things organized.</h3>
          </div>
          <div className="family-route-chip">Family Room</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Manage members, share invites, and keep family routines in one place.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <RouteMetricStrip
            items={[
              { label: "Connected members", value: `${memberList.length}`, note: `${ownerCount} owner and ${adminCount} admin currently manage access.` },
              { label: "Invite path", value: inviteCode, note: canManageHousehold ? "Owners and admins can rotate the code." : "Invite control is limited to admins and owners." },
              { label: "Routine count", value: `${state.routines.length}`, note: "Shared rhythms live beside household access now." },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Who can manage what</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Owners can change roles. Admins can remove standard members. Everyone else can use the family space.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--family family-animate-rise rounded-[28px] p-6 md:p-7">
          <p className="family-kicker family-eyebrow">Family members</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight">Who is in your family space.</h3>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Owners can update roles. Admins can remove standard members. Everyone else can use the app.
          </p>
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
            title="Share your family link."
            summary="Keep the invite tools tucked away until you need to copy or send them."
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
              <div className="mt-5 rounded-[20px] border border-[var(--line-soft)] bg-white/80 p-4">
                <p className="family-kicker family-eyebrow">Family invite link</p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Tap Copy link or Share to send the family invite.</p>
              </div>
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
            kicker="Family routine"
            title={state.routines[0] ? state.routines[0].name : "No routine built yet"}
            body={
              state.routines[0]
                ? `${state.routines[0].timeWindow}. ${state.routines[0].items.join(", ")}.`
                : "Add the first routine here so the family has one repeatable flow it can keep returning to."
            }
            className="family-card family-card-gold"
          />

          <InsightCard
            kicker="Shared rewards"
            title={`${familyQuestBoard.sharedPoints} family points ready`}
            body="Complete quests, then turn the shared point bank into movie nights, dinner picks, or an extra game-night bonus."
            className="family-panel"
          >
            <div className="mt-5 space-y-3">
              {familyQuestBoard.rewards.slice(0, 2).map((reward) => (
                <div key={reward.id} className="family-list-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{reward.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reward.detail}</p>
                    </div>
                    <span className="family-badge family-badge-gold">{reward.cost} pts</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => redeemFamilySharedReward(reward.id)}
                    disabled={familyQuestBoard.sharedPoints < reward.cost}
                    className="family-btn family-btn-secondary mt-4"
                  >
                    Unlock reward
                  </button>
                </div>
              ))}
            </div>
          </InsightCard>

          <InsightCard
            kicker="Family wins"
            title={state.familyAchievements[0]?.title ?? "No shared wins yet"}
            body={
              state.familyAchievements[0]
                ? `${state.familyAchievements[0].memberName} shared: ${state.familyAchievements[0].detail || "A new family accomplishment just landed."}`
                : "Profile pages can now send completed goals and fitness wins here for the whole family to celebrate."
            }
            className="family-panel"
          />

          <InsightCard
            kicker="Partner page"
            title={state.partnerSpace?.memberIds.length === 2 ? "Private page is ready." : "Set up the grown-up page."}
            body={
              state.partnerSpace?.memberIds.length === 2
                ? "Open Partner Space from the menu for private messages, date-night planning, and rewards."
                : "Once two partners are chosen, they get a private page for messages, date ideas, and rewards."
            }
            className="family-card family-card-dark"
          >
            <button type="button" onClick={() => goToTab("partner")} className="family-btn family-btn-primary mt-5">
              Open Partner Space
            </button>
          </InsightCard>
        </div>
      </div>

      <DisclosurePanel
        kicker="Family routine"
        title="Build a family routine."
        summary="Open this section when you want to add or review routines instead of keeping the whole builder on screen."
        badge={`${state.routines.length} saved`}
        className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-5 md:p-6"
      >
        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <form className="space-y-4" onSubmit={addRoutine}>
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
              <h3 className="mt-4 font-serif text-4xl leading-tight">Family routines you can reuse.</h3>
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
                <EmptyState className="md:col-span-2">Add your first routine to give the household a consistent repeatable rhythm.</EmptyState>
              )}
            </div>
          </div>
        </div>
      </DisclosurePanel>
    </div>
  );
}

function AiStudioPage({
  state,
  chatInput,
  setChatInput,
  handleAssistantPrompt,
  aiTask,
  assistantSuggestions,
  openAiChatFocus,
}: PageProps) {
  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--ai family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">FamilyFlow help</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Ask for help with the whole family plan.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">AI Studio</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          Ask the assistant for help using your real family data from the rest of the app.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
          <RouteMetricStrip
            tone="dark"
            items={[
              { label: "Messages", value: `${state.assistantHistory.length}`, note: "The assistant keeps conversation context from this workspace." },
              { label: "Prompt seeds", value: `${assistantSuggestions.length}`, note: "Quick starts help the family ask higher-quality questions." },
              { label: "Shared context", value: `${state.pantry.length + state.reminders.length + state.routines.length}`, note: "Pantry, reminders, and routines are all available to the assistant." },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Chat tip</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Need a cleaner chat room? Open the chat-only view and the rest of the page disappears.</p>
            <button type="button" onClick={openAiChatFocus} className="family-btn family-btn-primary mt-4">
              Open chat-only view
            </button>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.96fr]">
        <AssistantChatPanel
          history={state.assistantHistory}
          chatInput={chatInput}
          onChatInputChange={(value) => setChatInput(value)}
          onSubmitPrompt={handleAssistantPrompt}
          aiTask={aiTask}
          assistantSuggestions={assistantSuggestions}
          onOpenFocus={openAiChatFocus}
        />

        <div className="space-y-5">
          <DisclosurePanel
            kicker="Quick ideas"
            title="Start with a helpful question."
            summary="Prompt starters stay under one button so the page feels calmer."
            badge={`${assistantSuggestions.length} prompts`}
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

          <InsightCard
            kicker="Shared context"
            title="What FamilyFlow can see."
            body="The assistant uses live family info, not a blank page."
            className="family-card family-card-dark"
          >
            <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-200">
              <li>Current pantry and budget settings</li>
              <li>Shared chores, reminders, and routines</li>
              <li>Household workspace data from the database</li>
              <li>Recent conversation history from this family workspace</li>
            </ul>
          </InsightCard>
        </div>
      </div>
    </div>
  );
}
