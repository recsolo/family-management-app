"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AssistantChatPanel } from "@/components/workspace/assistant-chat-panel";
import { GameRoomPage } from "@/components/workspace/game-room-page";
import { MemberProfilePage } from "@/components/workspace/member-profile-page-compact";
import { PartnerSpacePage } from "@/components/workspace/partner-space-page";
import { WorkspacePageSections } from "@/components/workspace/workspace-page-sections";
import { buildWorkspaceShellData } from "@/components/workspace/workspace-shell-data";
import { WorkspaceTopBar } from "@/components/workspace/workspace-shell-panels";
import { applyArcadeRunResult, applyUnoGameResult } from "@/lib/game-results";
import {
  type AppNotification,
  type ArcadeRun,
  type ChoreCadence,
  createId,
  type DirectMessage,
  type FamilyQuestCadence,
  type FamilyQuestMetric,
  formatReminderWhen,
  getBudgetPlan,
  getChoreStatus,
  getNextChoreStreakCount,
  getQuestWindowKey,
  getReminderOccurrenceKey,
  getReminderStatus,
  getTodayKey,
  isChoreScheduledForDate,
  normalizeIngredient,
  type PartnerRewardCategory,
  recalculateFamilyQuestBoard,
  RECIPES,
  type AppState,
  type BudgetCoach,
  type ChatMessage,
  type FitnessLog,
  type MealPlan,
  type ProfileUpload,
  type UnoGame,
  syncStateWithMembers,
} from "@/lib/familyflow";
import { getMemberProfilePath, getWorkspacePath, WORKSPACE_AI_CHAT_PATH, type ActiveTab } from "@/lib/workspace-tabs";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

type Props = {
  activeTab: ActiveTab;
  currentUserId: string;
  initialState: AppState;
  householdName: string;
  inviteCode: string;
  role: HouseholdRole;
  userName: string;
  members: HouseholdMember[];
  view?: "default" | "focus-chat" | "member-profile";
  memberProfileId?: string;
};

const QUEST_MEDAL_RULES = [
  {
    id: "quest-medal-first-win",
    title: "First Spark",
    detail: "Complete the first family quest.",
    tone: "bronze" as const,
    matches: (board: AppState["familyQuestBoard"]) => board.completedQuestCount >= 1,
  },
  {
    id: "quest-medal-streak-3",
    title: "On a Roll",
    detail: "Hit a 3-day quest streak.",
    tone: "silver" as const,
    matches: (board: AppState["familyQuestBoard"]) => board.currentStreak >= 3,
  },
  {
    id: "quest-medal-streak-7",
    title: "Family Fire",
    detail: "Hit a 7-day quest streak.",
    tone: "gold" as const,
    matches: (board: AppState["familyQuestBoard"]) => board.currentStreak >= 7,
  },
  {
    id: "quest-medal-points-200",
    title: "Treasure Chest",
    detail: "Bank 200 lifetime shared quest points.",
    tone: "gold" as const,
    matches: (board: AppState["familyQuestBoard"]) => board.lifetimeSharedPoints >= 200,
  },
] satisfies Array<{
  id: string;
  title: string;
  detail: string;
  tone: "gold" | "silver" | "bronze";
  matches: (board: AppState["familyQuestBoard"]) => boolean;
}>;

export function FamilyFlowApp({
  activeTab,
  currentUserId,
  initialState,
  householdName: initialHouseholdName,
  inviteCode: initialInviteCode,
  role,
  userName,
  members,
  view = "default",
  memberProfileId,
}: Props) {
  const router = useRouter();
  const initialMemberNames = Array.from(new Set(members.map((member) => member.name.trim()).filter(Boolean)));
  const [state, setState] = useState<AppState>(syncStateWithMembers(initialState, members));
  const stateRef = useRef(state);
  const [householdName, setHouseholdName] = useState(initialHouseholdName);
  const [householdNameInput, setHouseholdNameInput] = useState(initialHouseholdName);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [memberList, setMemberList] = useState(members);
  const [ingredientInput, setIngredientInput] = useState("");
  const [choreTitle, setChoreTitle] = useState("");
  const [choreAssignee, setChoreAssignee] = useState(initialMemberNames[0] ?? userName);
  const [choreCadence, setChoreCadence] = useState<ChoreCadence>("daily");
  const [choreDueTime, setChoreDueTime] = useState("18:00");
  const [chorePoints, setChorePoints] = useState("10");
  const [choreDays, setChoreDays] = useState<number[]>([1, 3, 5]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");
  const [reminderCadence, setReminderCadence] = useState<"once" | "daily" | "weekdays" | "weekly">("once");
  const [reminderScheduledFor, setReminderScheduledFor] = useState("");
  const [reminderAudience, setReminderAudience] = useState("Family");
  const [reminderInApp, setReminderInApp] = useState(true);
  const [reminderBrowser, setReminderBrowser] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [routineTimeWindow, setRoutineTimeWindow] = useState("");
  const [routineItems, setRoutineItems] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiTask, setAiTask] = useState<AiTask>(null);
  const [saving, setSaving] = useState(false);
  const [rotatingInvite, setRotatingInvite] = useState(false);
  const [savingHouseholdName, setSavingHouseholdName] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [assistantSuggestions, setAssistantSuggestions] = useState<string[]>([
    "Plan a calm weeknight for our family.",
    "Turn our chores into a simple Saturday reset.",
    "What should we prep tonight to make tomorrow easier?",
  ]);
  const reminderBrowserSyncRef = useRef(false);
  const reminderInboxSyncRef = useRef(false);
  const reminderEmailSyncRef = useRef(false);

  function getQuestDayKey(value: string) {
    return value.slice(0, 10);
  }

  function computeQuestStreak(completions: AppState["familyQuestBoard"]["recentCompletions"]) {
    const uniqueDays = Array.from(
      new Set(
        completions
          .map((completion) => getQuestDayKey(completion.completedAt))
          .filter(Boolean),
      ),
    ).sort((left, right) => right.localeCompare(left));

    if (uniqueDays.length === 0) {
      return { current: 0, longest: 0 };
    }

    let current = 1;
    for (let index = 1; index < uniqueDays.length; index += 1) {
      const previous = new Date(`${uniqueDays[index - 1]}T12:00:00`);
      const next = new Date(`${uniqueDays[index]}T12:00:00`);
      const diffDays = Math.round((previous.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays !== 1) {
        break;
      }
      current += 1;
    }

    let longest = 1;
    let running = 1;
    for (let index = 1; index < uniqueDays.length; index += 1) {
      const previous = new Date(`${uniqueDays[index - 1]}T12:00:00`);
      const next = new Date(`${uniqueDays[index]}T12:00:00`);
      const diffDays = Math.round((previous.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        running += 1;
        longest = Math.max(longest, running);
      } else {
        running = 1;
      }
    }

    return { current, longest };
  }

  function awardQuestMedals(board: AppState["familyQuestBoard"], earnedAt: string) {
    const medalIds = new Set(board.medals.map((medal) => medal.id));
    const newMedals = QUEST_MEDAL_RULES.filter((rule) => rule.matches(board) && !medalIds.has(rule.id)).map((rule) => ({
      id: rule.id,
      title: rule.title,
      detail: rule.detail,
      tone: rule.tone,
      earnedAt,
    }));

    return {
      board: newMedals.length > 0 ? { ...board, medals: [...newMedals, ...board.medals].slice(0, 12) } : board,
      newMedals,
    };
  }

  function refreshQuestBoard(nextState: AppState) {
    return {
      ...nextState,
      familyQuestBoard: recalculateFamilyQuestBoard(nextState.familyQuestBoard, nextState),
    };
  }

  function applyQuestCelebrations(previousState: AppState, nextState: AppState) {
    const previouslyCompleted = new Set(
      previousState.familyQuestBoard.quests
        .filter((quest) => quest.completedAt)
        .map((quest) => `${quest.id}:${quest.windowKey}:${quest.completedAt}`),
    );
    const newlyCompletedQuests = nextState.familyQuestBoard.quests.filter(
      (quest) => quest.completedAt && !previouslyCompleted.has(`${quest.id}:${quest.windowKey}:${quest.completedAt}`),
    );

    if (newlyCompletedQuests.length === 0) {
      return nextState;
    }

    const earnedAt = newlyCompletedQuests[0]?.completedAt ?? new Date().toISOString();
    const recentCompletions = [
      ...newlyCompletedQuests.map((quest) => ({
        id: createId("quest-completion"),
        questId: quest.id,
        title: quest.title,
        cadence: quest.cadence,
        rewardPoints: quest.rewardPoints,
        rewardTitle: quest.rewardTitle,
        completedAt: quest.completedAt ?? earnedAt,
        windowKey: quest.windowKey,
      })),
      ...nextState.familyQuestBoard.recentCompletions,
    ].slice(0, 30);
    const streak = computeQuestStreak(recentCompletions);
    const questBoardWithHistory = {
      ...nextState.familyQuestBoard,
      completedQuestCount: nextState.familyQuestBoard.completedQuestCount + newlyCompletedQuests.length,
      currentStreak: streak.current,
      longestStreak: Math.max(nextState.familyQuestBoard.longestStreak, streak.longest),
      recentCompletions,
    };
    const { board: nextQuestBoard, newMedals } = awardQuestMedals(questBoardWithHistory, earnedAt);

    const nextAchievements = [
      ...newlyCompletedQuests.map((quest) => ({
        id: createId("achievement"),
        memberId: currentUserId,
        memberName: userName,
        title: `${quest.title} is complete`,
        detail: `${quest.rewardTitle} unlocked and ${quest.rewardPoints} shared points landed in the family bank.`,
        points: quest.rewardPoints,
        createdAt: quest.completedAt ?? new Date().toISOString(),
        kind: "quest" as const,
      })),
      ...newMedals.map((medal) => ({
        id: createId("achievement"),
        memberId: currentUserId,
        memberName: userName,
        title: `${medal.title} medal earned`,
        detail: medal.detail,
        points: 0,
        createdAt: medal.earnedAt,
        kind: "quest" as const,
      })),
      ...nextState.familyAchievements,
    ].slice(0, 60);

    const notifications = [
      ...newlyCompletedQuests.flatMap((quest) =>
        createNotifications(
          memberList.filter((member) => member.id !== currentUserId).map((member) => member.id),
          {
            kind: "achievement",
            title: `${quest.title} is complete`,
            detail: `${quest.rewardTitle} unlocked and ${quest.rewardPoints} shared points were added.`,
            link: getWorkspacePath("family"),
            actorId: currentUserId,
            actorName: userName,
            createdAt: quest.completedAt ?? new Date().toISOString(),
          },
        ),
      ),
      ...newMedals.flatMap((medal) =>
        createNotifications(
          memberList.filter((member) => member.id !== currentUserId).map((member) => member.id),
          {
            kind: "achievement",
            title: `${medal.title} medal earned`,
            detail: medal.detail,
            link: getWorkspacePath("family"),
            actorId: currentUserId,
            actorName: userName,
            createdAt: medal.earnedAt,
          },
        ),
      ),
    ];

    return appendNotifications(
      {
        ...nextState,
        familyQuestBoard: nextQuestBoard,
        familyAchievements: nextAchievements,
      },
      notifications,
    );
  }

  const memberNames = useMemo(() => {
    const names = memberList.map((member) => member.name.trim()).filter(Boolean);
    return Array.from(new Set(names.length > 0 ? names : [userName]));
  }, [memberList, userName]);

  const canManageHousehold = role === "owner" || role === "admin";
  const canManageRoles = role === "owner";
  const canRemoveMembers = role === "owner" || role === "admin";

  const recipeMatches = useMemo(() => {
    const pantrySet = new Set(state.pantry.map(normalizeIngredient));
    return RECIPES.map((recipe) => {
      const matches = recipe.ingredients.filter((ingredient) => pantrySet.has(ingredient)).length;
      const missing = recipe.ingredients.filter((ingredient) => !pantrySet.has(ingredient));
      return { ...recipe, matches, missing };
    }).sort((left, right) => right.matches - left.matches);
  }, [state.pantry]);

  const bestRecipe = recipeMatches[0];
  const budgetPlan = useMemo(() => getBudgetPlan(state.budget), [state.budget]);
  const savingsRow = budgetPlan.find((row) => row.label === "savings");
  const currentUserMember = useMemo(() => memberList.find((member) => member.id === currentUserId) ?? null, [memberList, currentUserId]);
  const todayChores = useMemo(() => state.chores.filter((chore) => isChoreScheduledForDate(chore, new Date())), [state.chores]);
  const completedChores = todayChores.filter((chore) => chore.done).length;
  const choreStatusSummary = useMemo(() => {
    const statuses = todayChores.map((chore) => getChoreStatus(chore, new Date()));
    return {
      due: statuses.filter((status) => status === "due").length,
      overdue: statuses.filter((status) => status === "overdue").length,
      done: statuses.filter((status) => status === "done").length,
    };
  }, [todayChores]);
  const dueReminders = useMemo(
    () =>
      state.reminders.filter((reminder) => {
        const audienceName = reminder.audience.trim().toLowerCase();
        const matchesUser =
          reminder.audience === "Family" ||
          audienceName === currentUserMember?.name.trim().toLowerCase() ||
          audienceName === userName.trim().toLowerCase();

        return matchesUser && getReminderStatus(reminder, new Date()) === "due";
      }),
    [state.reminders, currentUserMember, userName],
  );

  useEffect(() => {
    if (!memberNames.includes(choreAssignee)) {
      setChoreAssignee(memberNames[0] ?? userName);
    }
  }, [choreAssignee, memberNames, userName]);

  useEffect(() => {
    if (reminderAudience !== "Family" && !memberNames.includes(reminderAudience)) {
      setReminderAudience("Family");
    }
  }, [memberNames, reminderAudience]);

  useEffect(() => {
    setLocalState((current) => syncStateWithMembers(current, memberList));
  }, [memberList]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (dueReminders.length === 0 || reminderInboxSyncRef.current) {
      return;
    }

    const pendingReminderIds = dueReminders
      .filter((reminder) => reminder.delivery.inApp && getReminderOccurrenceKey(reminder, new Date()) !== reminder.lastDeliveredAt)
      .map((reminder) => reminder.id);

    if (pendingReminderIds.length === 0) {
      return;
    }

    reminderInboxSyncRef.current = true;
    const deliveredAt = new Date().toISOString();

    void updateState((current) => {
      const notifications = current.reminders
        .filter((reminder) => pendingReminderIds.includes(reminder.id))
        .flatMap((reminder) =>
          createNotifications([currentUserId], {
            kind: "reminder",
            title: reminder.title,
            detail: `${formatReminderWhen(reminder)} for ${reminder.audience}`,
            link: getWorkspacePath("ops"),
            actorId: null,
            actorName: "FamilyFlow",
            createdAt: deliveredAt,
          }),
        );

      const nextState: AppState = {
        ...current,
        reminders: current.reminders.map((reminder) =>
          pendingReminderIds.includes(reminder.id)
            ? {
                ...reminder,
                lastDeliveredAt: getReminderOccurrenceKey(reminder, new Date()) ?? deliveredAt,
              }
            : reminder,
        ),
      };

      return appendNotifications(nextState, notifications);
    }).finally(() => {
      reminderInboxSyncRef.current = false;
    });
  }, [currentUserId, dueReminders]);

  useEffect(() => {
    if (
      dueReminders.length === 0 ||
      reminderBrowserSyncRef.current ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const pendingBrowserReminders = dueReminders.filter(
      (reminder) => reminder.delivery.browser && getReminderOccurrenceKey(reminder, new Date()) !== reminder.lastBrowserDeliveredAt,
    );

    if (pendingBrowserReminders.length === 0) {
      return;
    }

    reminderBrowserSyncRef.current = true;
    const deliveredAt = new Date().toISOString();

    pendingBrowserReminders.forEach((reminder) => {
      const notification = new Notification(reminder.title, {
        body: `${formatReminderWhen(reminder)} · ${reminder.audience}`,
        tag: reminder.id,
      });

      notification.onclick = () => {
        window.focus();
        goToTab("ops");
      };
    });

    void updateState((current) => ({
      ...current,
      reminders: current.reminders.map((reminder) =>
        pendingBrowserReminders.some((entry) => entry.id === reminder.id)
          ? {
              ...reminder,
              lastBrowserDeliveredAt: getReminderOccurrenceKey(reminder, new Date()) ?? deliveredAt,
            }
          : reminder,
      ),
    })).finally(() => {
      reminderBrowserSyncRef.current = false;
    });
  }, [dueReminders]);

  useEffect(() => {
    if (dueReminders.length === 0 || reminderEmailSyncRef.current) {
      return;
    }

    const pendingEmailReminderIds = dueReminders
      .filter((reminder) => reminder.delivery.email && getReminderOccurrenceKey(reminder, new Date()) !== reminder.lastEmailDeliveredAt)
      .map((reminder) => reminder.id);

    if (pendingEmailReminderIds.length === 0) {
      return;
    }

    reminderEmailSyncRef.current = true;
    void fetch("/api/reminders/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderIds: pendingEmailReminderIds }),
    })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || !Array.isArray(body.sentReminderIds) || body.sentReminderIds.length === 0) {
          return;
        }

        void updateState((current) => ({
          ...current,
          reminders: current.reminders.map((reminder) =>
            body.sentReminderIds.includes(reminder.id)
              ? {
                  ...reminder,
                  lastEmailDeliveredAt: getReminderOccurrenceKey(reminder, new Date()) ?? new Date().toISOString(),
                }
              : reminder,
          ),
        }));
      })
      .finally(() => {
        reminderEmailSyncRef.current = false;
      });
  }, [dueReminders]);

  async function persistState(nextState: AppState) {
    const normalizedState = refreshQuestBoard(nextState);
    stateRef.current = normalizedState;
    setState(normalizedState);
    setSaving(true);
    setSaveError(null);

    const response = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: normalizedState }),
    });

    setSaving(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setSaveError(body.error ?? "Workspace changes could not be saved.");
    }
  }

  async function updateState(updater: (current: AppState) => AppState) {
    const currentState = stateRef.current;
    const updatedState = updater(currentState);
    const normalizedState = refreshQuestBoard(updatedState);
    const nextState = applyQuestCelebrations(currentState, normalizedState);
    await persistState(nextState);
  }

  function setLocalState(updater: (current: AppState) => AppState) {
    setState((current) => {
      const nextState = refreshQuestBoard(updater(current));
      stateRef.current = nextState;
      return nextState;
    });
  }

  function goToTab(tab: ActiveTab) {
    router.push(getWorkspacePath(tab));
  }

  function openAiChatFocus() {
    router.push(WORKSPACE_AI_CHAT_PATH);
  }

  function openMemberProfile(memberId: string) {
    router.push(getMemberProfilePath(memberId));
  }

  async function updateGameRoom(updater: (current: AppState["gameRoom"]) => AppState["gameRoom"]) {
    await updateState((current) => ({
      ...current,
      gameRoom: updater(current.gameRoom),
    }));
  }

  async function saveArcadeSelection(memberId: string) {
    await updateGameRoom((current) => ({
      ...current,
      selectedArcadeMemberId: memberId,
    }));
  }

  async function saveArcadeRun(run: ArcadeRun) {
    await updateState((current) => applyArcadeRunResult(current, memberList, run).state);
  }

  async function saveUnoGame(game: UnoGame | null) {
    await updateState((current) => applyUnoGameResult(current, memberList, game).state);
  }

  async function redeemFamilySharedReward(rewardId: string) {
    await updateState((current) => {
      const reward = current.familyQuestBoard.rewards.find((entry) => entry.id === rewardId);
      if (!reward || current.familyQuestBoard.sharedPoints < reward.cost) {
        return current;
      }

      const redeemedAt = new Date().toISOString();
      const nextState: AppState = {
        ...current,
        familyQuestBoard: {
          ...current.familyQuestBoard,
          sharedPoints: current.familyQuestBoard.sharedPoints - reward.cost,
          rewards: current.familyQuestBoard.rewards.map((entry) =>
            entry.id === rewardId
              ? { ...entry, redemptions: entry.redemptions + 1, lastRedeemedAt: redeemedAt }
              : entry,
          ),
        },
      };

      const notifications = createNotifications(
        memberList.filter((member) => member.id !== currentUserId).map((member) => member.id),
        {
          kind: "reward",
          title: `${userName} unlocked ${reward.title}`,
          detail: reward.detail,
          link: getWorkspacePath("games"),
          actorId: currentUserId,
          actorName: userName,
          createdAt: redeemedAt,
        },
      );

      return appendNotifications(nextState, notifications);
    });
  }

  async function addFamilyQuest(quest: {
    title: string;
    detail: string;
    cadence: FamilyQuestCadence;
    metric: FamilyQuestMetric;
    target: number;
    rewardPoints: number;
    rewardTitle: string;
  }) {
    const trimmedTitle = quest.title.trim();
    if (!trimmedTitle) {
      return;
    }

    await updateState((current) => ({
      ...current,
      familyQuestBoard: {
        ...current.familyQuestBoard,
        quests: [
          ...current.familyQuestBoard.quests,
          {
            id: createId("family-quest"),
            title: trimmedTitle,
            detail: quest.detail.trim(),
            cadence: quest.cadence,
            metric: quest.metric,
            source: "custom",
            target: Math.max(1, quest.target),
            progress: 0,
            rewardPoints: Math.max(1, quest.rewardPoints),
            rewardTitle: quest.rewardTitle.trim() || "Family bonus",
            windowKey: getQuestWindowKey(quest.cadence),
            completedAt: null,
          },
        ],
      },
    }));
  }

  function getSortedParticipantIds(leftId: string, rightId: string) {
    return [leftId, rightId].sort((first, second) => first.localeCompare(second));
  }

  function findDirectThread(memberId: string) {
    const participantIds = getSortedParticipantIds(currentUserId, memberId);
    return state.directThreads.find(
      (thread) =>
        thread.participantIds.length === 2 &&
        thread.participantIds[0] === participantIds[0] &&
        thread.participantIds[1] === participantIds[1],
    );
  }

  function createNotifications(
    recipientUserIds: string[],
    config: {
      kind: AppNotification["kind"];
      title: string;
      detail: string;
      link: string;
      actorId?: string | null;
      actorName?: string;
      createdAt?: string;
    },
  ) {
    const createdAt = config.createdAt ?? new Date().toISOString();

    return Array.from(new Set(recipientUserIds))
      .filter(Boolean)
      .map((recipientUserId) => ({
        id: createId("notification"),
        recipientUserId,
        actorId: config.actorId ?? currentUserId,
        actorName: config.actorName ?? userName,
        kind: config.kind,
        title: config.title,
        detail: config.detail,
        link: config.link,
        createdAt,
        readAt: null,
      })) satisfies AppNotification[];
  }

  function appendNotifications(current: AppState, notifications: AppNotification[]) {
    if (notifications.length === 0) {
      return current;
    }

    return {
      ...current,
      notifications: [...notifications, ...current.notifications]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 200),
    };
  }

  function getNotificationRecipientsForAudience(audience: string) {
    if (audience === "Family") {
      return memberList.filter((member) => member.id !== currentUserId).map((member) => member.id);
    }

    return memberList
      .filter((member) => member.name.trim().toLowerCase() === audience.trim().toLowerCase() && member.id !== currentUserId)
      .map((member) => member.id);
  }

  function getReminderRecipientIds(audience: string) {
    if (audience === "Family") {
      return memberList.map((member) => member.id);
    }

    return memberList
      .filter((member) => member.name.trim().toLowerCase() === audience.trim().toLowerCase())
      .map((member) => member.id);
  }

  function toggleChoreDay(day: number) {
    setChoreDays((current) =>
      current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day].sort((left, right) => left - right),
    );
  }

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSaveError("Browser alerts are not supported on this device.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setSaveError("Browser alerts were not allowed.");
      return;
    }

    setReminderBrowser(true);
    setSaveError(null);
  }

  function getPartnerRecipientIds(memberIds: string[]) {
    return memberIds.filter((memberId) => memberId !== currentUserId);
  }

  async function markNotificationRead(notificationId: string) {
    await updateState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId && !notification.readAt ? { ...notification, readAt: new Date().toISOString() } : notification,
      ),
    }));
  }

  async function markAllNotificationsRead() {
    await updateState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.recipientUserId === currentUserId && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    }));
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
    }

    router.push(notification.link);
  }

  async function sendDirectMessage(memberId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const message: DirectMessage = {
      id: createId("message"),
      senderId: currentUserId,
      senderName: userName,
      content: trimmed,
      createdAt: new Date().toISOString(),
      editedAt: null,
    };
    const participantIds = getSortedParticipantIds(currentUserId, memberId);
    const targetMember = memberList.find((member) => member.id === memberId);
    const notifications = createNotifications(
      targetMember ? [targetMember.id] : [],
      {
        kind: "message",
        title: `${userName} sent you a message`,
        detail: trimmed,
        link: getMemberProfilePath(currentUserId),
        createdAt: message.createdAt,
      },
    );

    await updateState((current) => {
      const existingThread = current.directThreads.find(
        (thread) =>
          thread.participantIds.length === 2 &&
          thread.participantIds[0] === participantIds[0] &&
          thread.participantIds[1] === participantIds[1],
      );

      const nextThread = existingThread
        ? {
            ...existingThread,
            messages: [...existingThread.messages, message].slice(-120),
          }
        : {
            id: createId("thread"),
            participantIds,
            messages: [message],
          };

      return {
        ...current,
        directThreads: existingThread
          ? current.directThreads.map((thread) => (thread.id === existingThread.id ? nextThread : thread))
          : [nextThread, ...current.directThreads],
        notifications: [...notifications, ...current.notifications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 200),
      };
    });
  }

  async function editDirectMessage(memberId: string, messageId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const participantIds = getSortedParticipantIds(currentUserId, memberId);
    const editedAt = new Date().toISOString();

    await updateState((current) => ({
      ...current,
      directThreads: current.directThreads.map((thread) =>
        thread.participantIds.length === 2 &&
        thread.participantIds[0] === participantIds[0] &&
        thread.participantIds[1] === participantIds[1]
          ? {
              ...thread,
              messages: thread.messages.map((message) =>
                message.id === messageId && message.senderId === currentUserId
                  ? { ...message, content: trimmed, editedAt }
                  : message,
              ),
            }
          : thread,
      ),
    }));
  }

  async function deleteDirectMessage(memberId: string, messageId: string) {
    const participantIds = getSortedParticipantIds(currentUserId, memberId);

    await updateState((current) => ({
      ...current,
      directThreads: current.directThreads.flatMap((thread) => {
        const isTargetThread =
          thread.participantIds.length === 2 &&
          thread.participantIds[0] === participantIds[0] &&
          thread.participantIds[1] === participantIds[1];

        if (!isTargetThread) {
          return [thread];
        }

        const nextMessages = thread.messages.filter(
          (message) => !(message.id === messageId && message.senderId === currentUserId),
        );

        return nextMessages.length > 0 ? [{ ...thread, messages: nextMessages }] : [];
      }),
    }));
  }

  async function configurePartnerSpace(memberIds: string[]) {
    const nextMemberIds = Array.from(new Set(memberIds.filter(Boolean))).slice(0, 2);
    if (nextMemberIds.length !== 2) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            memberIds: nextMemberIds,
          }
        : {
            memberIds: nextMemberIds,
            messages: [],
            privateRewards: [],
            anniversaries: [],
            bucketList: [],
            datePlans: [],
            connectionNotes: [],
          },
    }));
  }

  async function sendPartnerMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || !state.partnerSpace) {
      return;
    }

    const message: DirectMessage = {
      id: createId("partner-message"),
      senderId: currentUserId,
      senderName: userName,
      content: trimmed,
      createdAt: new Date().toISOString(),
      editedAt: null,
    };
    const notifications = createNotifications(getPartnerRecipientIds(state.partnerSpace.memberIds), {
      kind: "partner",
      title: `${userName} sent a private note`,
      detail: trimmed,
      link: getWorkspacePath("partner"),
      createdAt: message.createdAt,
    });

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        partnerSpace: current.partnerSpace
          ? {
              ...current.partnerSpace,
              messages: [...current.partnerSpace.messages, message].slice(-160),
            }
          : current.partnerSpace,
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function editPartnerMessage(messageId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed || !state.partnerSpace) {
      return;
    }

    const editedAt = new Date().toISOString();

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            messages: current.partnerSpace.messages.map((message) =>
              message.id === messageId && message.senderId === currentUserId
                ? { ...message, content: trimmed, editedAt }
                : message,
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerMessage(messageId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            messages: current.partnerSpace.messages.filter(
              (message) => !(message.id === messageId && message.senderId === currentUserId),
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function addPartnerReward(reward: {
    title: string;
    detail: string;
    cost: number;
    category: PartnerRewardCategory;
    favorite: boolean;
  }) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            privateRewards: [
                {
                  id: createId("partner-reward"),
                  title: reward.title,
                  detail: reward.detail,
                  cost: reward.cost,
                  category: reward.category,
                  favorite: reward.favorite,
                  createdByMemberId: currentUserId,
                  createdByName: userName,
                  redemptions: 0,
                  lastRedeemedAt: null,
                  redemptionHistory: [],
                },
                ...current.partnerSpace.privateRewards,
              ],
          }
        : current.partnerSpace,
    }));
  }

  async function updatePartnerReward(
    rewardId: string,
    reward: {
      title: string;
      detail: string;
      cost: number;
      category: PartnerRewardCategory;
      favorite: boolean;
    },
  ) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            privateRewards: current.partnerSpace.privateRewards.map((entry) =>
              entry.id === rewardId
                  ? {
                      ...entry,
                      title: reward.title,
                      detail: reward.detail,
                      cost: reward.cost,
                      category: reward.category,
                      favorite: reward.favorite,
                    }
                  : entry,
              ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerReward(rewardId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            privateRewards: current.partnerSpace.privateRewards.filter((entry) => entry.id !== rewardId),
          }
        : current.partnerSpace,
    }));
  }

  async function redeemPartnerReward(rewardId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => {
      const reward = current.partnerSpace?.privateRewards.find((entry) => entry.id === rewardId);
      if (!reward) {
        return current;
      }

      const currentProfile = current.memberProfiles.find((profile) => profile.memberId === currentUserId);
      if (!currentProfile || currentProfile.pointsBalance < reward.cost) {
        return current;
      }

      const redeemedAt = new Date().toISOString();
      const recipientIds = getPartnerRecipientIds(current.partnerSpace?.memberIds ?? []);
      const notifications = createNotifications(recipientIds, {
        kind: "partner",
        title: `${userName} used ${reward.title}`,
        detail: reward.detail || `${reward.cost} points turned into something fun for the two of you.`,
        link: getWorkspacePath("partner"),
        createdAt: redeemedAt,
      });

      const nextState: AppState = {
        ...current,
        memberProfiles: current.memberProfiles.map((profile) =>
          profile.memberId === currentUserId ? { ...profile, pointsBalance: profile.pointsBalance - reward.cost } : profile,
        ),
        partnerSpace: current.partnerSpace
          ? {
              ...current.partnerSpace,
              privateRewards: current.partnerSpace.privateRewards.map((entry) =>
                entry.id === rewardId
                  ? {
                      ...entry,
                      redemptions: entry.redemptions + 1,
                      lastRedeemedAt: redeemedAt,
                      redemptionHistory: [
                        {
                          id: createId("partner-reward-redemption"),
                          redeemedAt,
                          redeemedByMemberId: currentUserId,
                          redeemedByName: userName,
                        },
                        ...entry.redemptionHistory,
                      ].slice(0, 20),
                    }
                  : entry,
              ),
            }
          : current.partnerSpace,
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function addPartnerAnniversary(entry: { title: string; date: string; detail: string; memory: string }) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            anniversaries: [
              {
                id: createId("partner-anniversary"),
                title: entry.title,
                date: entry.date,
                detail: entry.detail,
                memory: entry.memory,
              },
              ...current.partnerSpace.anniversaries,
            ].slice(0, 24),
          }
        : current.partnerSpace,
    }));
  }

  async function updatePartnerAnniversary(
    anniversaryId: string,
    entry: { title: string; date: string; detail: string; memory: string },
  ) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            anniversaries: current.partnerSpace.anniversaries.map((anniversary) =>
              anniversary.id === anniversaryId
                ? {
                    ...anniversary,
                    title: entry.title,
                    date: entry.date,
                    detail: entry.detail,
                    memory: entry.memory,
                  }
                : anniversary,
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerAnniversary(anniversaryId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            anniversaries: current.partnerSpace.anniversaries.filter((entry) => entry.id !== anniversaryId),
          }
        : current.partnerSpace,
    }));
  }

  async function addPartnerBucketListItem(entry: {
    title: string;
    detail: string;
    targetWhen: string;
    memory: string;
    status: "idea" | "planned" | "done";
  }) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            bucketList: [
              {
                id: createId("partner-bucket"),
                title: entry.title,
                detail: entry.detail,
                targetWhen: entry.targetWhen,
                memory: entry.memory,
                status: entry.status,
              },
              ...current.partnerSpace.bucketList,
            ].slice(0, 40),
          }
        : current.partnerSpace,
    }));
  }

  async function updatePartnerBucketListItem(
    itemId: string,
    entry: {
      title: string;
      detail: string;
      targetWhen: string;
      memory: string;
      status: "idea" | "planned" | "done";
    },
  ) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            bucketList: current.partnerSpace.bucketList.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    title: entry.title,
                    detail: entry.detail,
                    targetWhen: entry.targetWhen,
                    memory: entry.memory,
                    status: entry.status,
                  }
                : item,
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerBucketListItem(itemId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            bucketList: current.partnerSpace.bucketList.filter((entry) => entry.id !== itemId),
          }
        : current.partnerSpace,
    }));
  }

  async function addPartnerDatePlan(plan: {
    title: string;
    when: string;
    location: string;
    detail: string;
    budget: string;
    status: "idea" | "planned" | "booked";
  }) {
    if (!state.partnerSpace) {
      return;
    }

    const createdAt = new Date().toISOString();
    const notifications = createNotifications(getPartnerRecipientIds(state.partnerSpace.memberIds), {
      kind: "partner",
      title: `${userName} added a date-night plan`,
      detail: `${plan.title}${plan.when ? ` for ${plan.when}` : ""}`,
      link: getWorkspacePath("partner"),
      createdAt,
    });

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        partnerSpace: current.partnerSpace
          ? {
              ...current.partnerSpace,
              datePlans: [
                {
                  id: createId("date-night"),
                  title: plan.title,
                  when: plan.when,
                  location: plan.location,
                  detail: plan.detail,
                  budget: plan.budget,
                  status: plan.status,
                },
                ...current.partnerSpace.datePlans,
              ],
            }
          : current.partnerSpace,
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function updatePartnerDatePlan(
    planId: string,
    plan: {
      title: string;
      when: string;
      location: string;
      detail: string;
      budget: string;
      status: "idea" | "planned" | "booked";
    },
  ) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            datePlans: current.partnerSpace.datePlans.map((entry) =>
              entry.id === planId
                ? {
                    ...entry,
                    title: plan.title,
                    when: plan.when,
                    location: plan.location,
                    detail: plan.detail,
                    budget: plan.budget,
                    status: plan.status,
                  }
                : entry,
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerDatePlan(planId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            datePlans: current.partnerSpace.datePlans.filter((entry) => entry.id !== planId),
          }
        : current.partnerSpace,
    }));
  }

  async function addPartnerConnectionNote(note: { title: string; content: string }) {
    if (!state.partnerSpace) {
      return;
    }

    const createdAt = new Date().toISOString();
    const notifications = createNotifications(getPartnerRecipientIds(state.partnerSpace.memberIds), {
      kind: "partner",
      title: `${userName} left a closer note`,
      detail: note.title || "A little love note",
      link: getWorkspacePath("partner"),
      createdAt,
    });

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        partnerSpace: current.partnerSpace
          ? {
              ...current.partnerSpace,
              connectionNotes: [
                {
                  id: createId("partner-note"),
                  authorId: currentUserId,
                  authorName: userName,
                  title: note.title,
                  content: note.content,
                  createdAt,
                },
                ...current.partnerSpace.connectionNotes,
              ].slice(0, 80),
            }
          : current.partnerSpace,
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function updatePartnerConnectionNote(noteId: string, note: { title: string; content: string }) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            connectionNotes: current.partnerSpace.connectionNotes.map((entry) =>
              entry.id === noteId && entry.authorId === currentUserId
                ? {
                    ...entry,
                    title: note.title,
                    content: note.content,
                  }
                : entry,
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function deletePartnerConnectionNote(noteId: string) {
    if (!state.partnerSpace) {
      return;
    }

    await updateState((current) => ({
      ...current,
      partnerSpace: current.partnerSpace
        ? {
            ...current.partnerSpace,
            connectionNotes: current.partnerSpace.connectionNotes.filter(
              (entry) => !(entry.id === noteId && entry.authorId === currentUserId),
            ),
          }
        : current.partnerSpace,
    }));
  }

  async function updateMemberProfile(memberId: string, updater: (profile: AppState["memberProfiles"][number]) => AppState["memberProfiles"][number]) {
    await updateState((current) => {
      const baseProfiles = syncStateWithMembers(current, memberList).memberProfiles;
      return {
        ...current,
        memberProfiles: baseProfiles.map((profile) => (profile.memberId === memberId ? updater(profile) : profile)),
      };
    });
  }

  async function addFamilyAchievement(
    memberId: string,
    title: string,
    detail: string,
    points: number,
    kind: AppState["familyAchievements"][number]["kind"],
    notifications: AppNotification[] = [],
  ) {
    const member = memberList.find((entry) => entry.id === memberId);
    if (!member) {
      return;
    }

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        familyAchievements: [
          {
            id: createId("achievement"),
            memberId,
            memberName: member.name,
            title,
            detail,
            points,
            kind,
            createdAt: new Date().toISOString(),
          },
          ...current.familyAchievements,
        ].slice(0, 60),
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function callAi<T>(payload: { kind: "assistant" | "meal-plan" | "budget-coach"; prompt?: string; history?: ChatMessage[] }) {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { data?: T; error?: string };
    if (!response.ok || !body.data) {
      throw new Error(body.error ?? "The AI request failed.");
    }

    return body.data;
  }

  async function handleAssistantPrompt(prompt: string) {
    if (!prompt.trim()) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: prompt.trim() };
    const nextHistory = [...state.assistantHistory, userMessage];
    setAiTask("assistant");
    setAiError(null);
    setChatInput("");
    setLocalState((current) => ({ ...current, assistantHistory: nextHistory }));

    try {
      const data = await callAi<{ reply: string; suggestions: string[] }>({
        kind: "assistant",
        prompt: prompt.trim(),
        history: nextHistory,
      });
      setLocalState((current) => ({
        ...current,
        assistantHistory: [...nextHistory, { role: "assistant", content: data.reply }],
      }));
      setAssistantSuggestions(data.suggestions);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The AI assistant could not respond.");
    } finally {
      setAiTask(null);
    }
  }

  async function generateMealPlan() {
    setAiTask("meal-plan");
    setAiError(null);
    try {
      const data = await callAi<MealPlan>({ kind: "meal-plan" });
      setLocalState((current) => ({ ...current, latestMealPlan: data }));
      goToTab("meals");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The meal planner could not generate a plan.");
    } finally {
      setAiTask(null);
    }
  }

  async function generateBudgetCoach() {
    setAiTask("budget-coach");
    setAiError(null);
    try {
      const data = await callAi<BudgetCoach>({ kind: "budget-coach" });
      setLocalState((current) => ({ ...current, latestBudgetCoach: data }));
      goToTab("budget");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The budget coach could not respond.");
    } finally {
      setAiTask(null);
    }
  }

  async function rotateInviteCode() {
    setRotatingInvite(true);
    setSaveError(null);
    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate-invite" }),
    });

    const body = (await response.json()) as { inviteCode?: string; error?: string };
    setRotatingInvite(false);
    if (!response.ok || !body.inviteCode) {
      setSaveError(body.error ?? "Invite code could not be regenerated.");
      return;
    }

    setInviteCode(body.inviteCode);
  }

  async function saveHouseholdDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingHouseholdName(true);
    setSaveError(null);

    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename-household", householdName: householdNameInput }),
    });

    const body = (await response.json()) as { householdName?: string; error?: string };
    setSavingHouseholdName(false);
    if (!response.ok || !body.householdName) {
      setSaveError(body.error ?? "Household name could not be updated.");
      return;
    }

    setHouseholdName(body.householdName);
    setHouseholdNameInput(body.householdName);
  }

  async function updateMember(memberId: string, nextRole: Exclude<HouseholdRole, "owner">) {
    setMemberActionId(memberId);
    setSaveError(null);

    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-member-role", memberId, role: nextRole }),
    });

    const body = (await response.json()) as { members?: HouseholdMember[]; error?: string };
    setMemberActionId(null);
    if (!response.ok || !body.members) {
      setSaveError(body.error ?? "Member role could not be updated.");
      return;
    }

    const nextMembers = body.members;
    setMemberList(nextMembers);
    setLocalState((current) => syncStateWithMembers(current, nextMembers));
  }

  async function removeMember(memberId: string) {
    setMemberActionId(memberId);
    setSaveError(null);

    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-member", memberId }),
    });

    const body = (await response.json()) as { members?: HouseholdMember[]; error?: string };
    setMemberActionId(null);
    if (!response.ok || !body.members) {
      setSaveError(body.error ?? "Member could not be removed.");
      return;
    }

    const nextMembers = body.members;
    setMemberList(nextMembers);
    await persistState(syncStateWithMembers(stateRef.current, nextMembers));
  }

  async function addPantryItems(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const additions = ingredientInput.split(",").map(normalizeIngredient).filter(Boolean);
    if (!additions.length) {
      return;
    }

    await updateState((current) => ({
      ...current,
      pantry: Array.from(new Set([...current.pantry, ...additions])),
    }));
    setIngredientInput("");
  }

  async function updateBudget<K extends keyof AppState["budget"]>(key: K, value: AppState["budget"][K]) {
    await updateState((current) => ({
      ...current,
      budget: { ...current.budget, [key]: value },
    }));
  }

  async function addChore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choreTitle.trim()) {
      return;
    }

    const trimmedTitle = choreTitle.trim();
    const normalizedCadence = choreCadence;
    const normalizedCustomDays =
      normalizedCadence === "custom"
        ? choreDays
        : normalizedCadence === "weekly"
          ? [choreDays[0] ?? 1]
          : [];
    const normalizedPoints = Math.max(1, Number(chorePoints) || 10);
    const assigneeMember = memberList.find((member) => member.name.trim().toLowerCase() === choreAssignee.trim().toLowerCase());
    const notifications = createNotifications(
      assigneeMember && assigneeMember.id !== currentUserId ? [assigneeMember.id] : [],
      {
        kind: "system",
        title: `${userName} assigned you a chore`,
        detail: `${trimmedTitle} · ${normalizedPoints} pts`,
        link: getWorkspacePath("ops"),
      },
    );

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        chores: [
          ...current.chores,
          {
            id: createId("chore"),
            title: trimmedTitle,
            assignee: choreAssignee,
            cadence: normalizedCadence,
            customDays: normalizedCustomDays,
            dueTime: choreDueTime || "18:00",
            points: normalizedPoints,
            done: false,
            completedOn: null,
            streakCount: 0,
            lastCompletedOn: null,
          },
        ],
      };

      return appendNotifications(nextState, notifications);
    });
    setChoreTitle("");
    setChoreCadence("daily");
    setChoreDueTime("18:00");
    setChorePoints("10");
    setChoreDays([1, 3, 5]);
  }

  async function toggleChore(id: string) {
    const todayKey = getTodayKey();
    await updateState((current) => {
      const targetChore = current.chores.find((chore) => chore.id === id);
      if (!targetChore) {
        return current;
      }

      const assigneeMember = memberList.find((member) => member.name.trim().toLowerCase() === targetChore.assignee.trim().toLowerCase());
      const nextDone = !targetChore.done;
      const nextStreak = nextDone ? getNextChoreStreakCount(targetChore, todayKey) : Math.max(0, targetChore.streakCount - 1);
      const pointsDelta = nextDone ? targetChore.points : -targetChore.points;
      const notifications =
        nextDone && assigneeMember
          ? createNotifications([assigneeMember.id], {
              kind: "achievement",
              title: `Nice work on ${targetChore.title}`,
              detail: `${targetChore.points} points added to your total.`,
              link: getMemberProfilePath(assigneeMember.id),
              actorId: currentUserId,
              actorName: userName,
            })
          : [];

      const nextState: AppState = {
        ...current,
        chores: current.chores.map((chore) =>
          chore.id === id
            ? {
                ...chore,
                done: nextDone,
                completedOn: nextDone ? todayKey : null,
                streakCount: nextStreak,
                lastCompletedOn: nextDone ? todayKey : chore.lastCompletedOn,
              }
            : chore,
        ),
        memberProfiles: assigneeMember
          ? current.memberProfiles.map((profile) =>
              profile.memberId === assigneeMember.id
                ? {
                    ...profile,
                    pointsBalance: Math.max(0, profile.pointsBalance + pointsDelta),
                    lifetimePoints: Math.max(profile.lifetimePoints, profile.lifetimePoints + Math.max(pointsDelta, 0)),
                  }
                : profile,
            )
          : current.memberProfiles,
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function addReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderScheduledFor.trim()) {
      return;
    }

    const trimmedTitle = reminderTitle.trim();
    const scheduledForDate = new Date(reminderScheduledFor);
    const trimmedWhen = Number.isNaN(scheduledForDate.getTime()) ? reminderWhen.trim() : formatReminderWhen({
      id: "preview",
      title: trimmedTitle,
      when: reminderWhen.trim(),
      audience: reminderAudience,
      cadence: reminderCadence,
      scheduledFor: scheduledForDate.toISOString(),
      delivery: { inApp: reminderInApp, browser: reminderBrowser, email: reminderEmail },
      lastDeliveredAt: null,
      lastBrowserDeliveredAt: null,
      lastEmailDeliveredAt: null,
    });
    const notifications = createNotifications(getNotificationRecipientsForAudience(reminderAudience), {
      kind: "reminder",
      title: `${userName} added a reminder`,
      detail: `${trimmedTitle} / ${trimmedWhen}`,
      link: getWorkspacePath("ops"),
    });

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        reminders: [
          {
            id: createId("reminder"),
            title: trimmedTitle,
            when: trimmedWhen,
            audience: reminderAudience,
            cadence: reminderCadence,
            scheduledFor: Number.isNaN(scheduledForDate.getTime()) ? null : scheduledForDate.toISOString(),
            delivery: {
              inApp: reminderInApp,
              browser: reminderBrowser,
              email: reminderEmail,
            },
            lastDeliveredAt: null,
            lastBrowserDeliveredAt: null,
            lastEmailDeliveredAt: null,
          },
          ...current.reminders,
        ],
      };

      return appendNotifications(nextState, notifications);
    });
    setReminderTitle("");
    setReminderWhen("");
    setReminderCadence("once");
    setReminderScheduledFor("");
    setReminderAudience("Family");
    setReminderInApp(true);
    setReminderBrowser(false);
    setReminderEmail(false);
  }

  async function removeReminder(id: string) {
    await updateState((current) => ({
      ...current,
      reminders: current.reminders.filter((reminder) => reminder.id !== id),
    }));
  }

  async function addRoutine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = routineItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!routineName.trim() || !routineTimeWindow.trim() || !items.length) {
      return;
    }

    await updateState((current) => ({
      ...current,
      routines: [
        ...current.routines,
        {
          id: createId("routine"),
          name: routineName.trim(),
          timeWindow: routineTimeWindow.trim(),
          items,
        },
      ],
    }));
    setRoutineName("");
    setRoutineTimeWindow("");
    setRoutineItems("");
  }

  async function saveProfileBasics(memberId: string, headline: string, about: string) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      headline,
      about,
    }));
  }

  async function saveProfileWeatherLocation(memberId: string, weatherLocation: string) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      weatherLocation,
    }));
  }

  async function saveProfileFitness(memberId: string, entry: FitnessLog) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      fitnessLogs: [entry, ...profile.fitnessLogs.filter((fitness) => fitness.date !== entry.date)].slice(0, 30),
    }));
  }

  async function shareProfileFitness(memberId: string) {
    const member = memberList.find((entry) => entry.id === memberId);
    const profile = state.memberProfiles.find((entry) => entry.memberId === memberId);
    const todayEntry = profile?.fitnessLogs.find((entry) => entry.date === getTodayKey());

    if (!member || !todayEntry) {
      return;
    }

    const notifications = createNotifications(
      memberList.filter((entry) => entry.id !== memberId).map((entry) => entry.id),
      {
        kind: "achievement",
        title: `${member.name} shared a fitness win`,
        detail: `${todayEntry.steps} steps and ${todayEntry.movementMinutes} active minutes.`,
        link: getMemberProfilePath(memberId),
        actorId: memberId,
        actorName: member.name,
      },
    );

    await addFamilyAchievement(
      memberId,
      `${member.name} shared a fitness win`,
      `${todayEntry.steps} steps, ${todayEntry.movementMinutes} active minutes, and ${todayEntry.waterCups} cups of water.`,
      0,
      "fitness",
      notifications,
    );
  }

  async function addProfileGoal(
    memberId: string,
    goal: {
      title: string;
      detail: string;
      category: string;
      targetDate: string;
      points: number;
    },
  ) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      goals: [
        {
          id: createId("goal"),
          title: goal.title,
          detail: goal.detail,
          category: goal.category || "Goal",
          targetDate: goal.targetDate,
          points: goal.points,
          status: "active",
          completedAt: null,
          sharedAt: null,
        },
        ...profile.goals,
      ],
    }));
  }

  async function completeProfileGoal(memberId: string, goalId: string) {
    const member = memberList.find((entry) => entry.id === memberId);
    const goal = state.memberProfiles.find((entry) => entry.memberId === memberId)?.goals.find((entry) => entry.id === goalId);
    if (!member || !goal || goal.status === "done") {
      return;
    }

    const completedAt = new Date().toISOString();
    const notifications = createNotifications([memberId], {
      kind: "goal",
      title: `You earned ${goal.points} points`,
      detail: `${goal.title} was marked finished.`,
      link: getMemberProfilePath(memberId),
      actorId: memberId,
      actorName: member.name,
      createdAt: completedAt,
    });

    await updateState((current) => {
      const nextState: AppState = {
        ...current,
        memberProfiles: current.memberProfiles.map((profile) => {
          if (profile.memberId !== memberId) {
            return profile;
          }

          return {
            ...profile,
            pointsBalance: profile.pointsBalance + goal.points,
            lifetimePoints: profile.lifetimePoints + goal.points,
            goals: profile.goals.map((entry) =>
              entry.id === goalId ? { ...entry, status: "done", completedAt } : entry,
            ),
          };
        }),
      };

      return appendNotifications(nextState, notifications);
    });
  }

  async function shareProfileGoal(memberId: string, goalId: string) {
    const member = memberList.find((entry) => entry.id === memberId);
    const goal = state.memberProfiles.find((entry) => entry.memberId === memberId)?.goals.find((entry) => entry.id === goalId);

    if (!member || !goal || goal.sharedAt) {
      return;
    }

    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      goals: profile.goals.map((entry) => (entry.id === goalId ? { ...entry, sharedAt: new Date().toISOString() } : entry)),
    }));
    const notifications = createNotifications(
      memberList.filter((entry) => entry.id !== memberId).map((entry) => entry.id),
      {
        kind: "achievement",
        title: `${member.name} finished ${goal.title}`,
        detail: goal.detail || "A new goal was completed.",
        link: getMemberProfilePath(memberId),
        actorId: memberId,
        actorName: member.name,
      },
    );
    await addFamilyAchievement(memberId, `${member.name} finished ${goal.title}`, goal.detail || "A new goal was completed.", goal.points, "goal", notifications);
  }

  async function addProfileReward(
    memberId: string,
    reward: {
      title: string;
      detail: string;
      cost: number;
    },
  ) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      rewards: [
        {
          id: createId("reward"),
          title: reward.title,
          detail: reward.detail,
          cost: reward.cost,
          redemptions: 0,
          lastRedeemedAt: null,
        },
        ...profile.rewards,
      ],
    }));
  }

  async function redeemProfileReward(memberId: string, rewardId: string) {
    const member = memberList.find((entry) => entry.id === memberId);
    const reward = state.memberProfiles.find((entry) => entry.memberId === memberId)?.rewards.find((entry) => entry.id === rewardId);

    if (!member || !reward) {
      return;
    }

    const redeemedAt = new Date().toISOString();
    const selfNotifications = createNotifications([memberId], {
      kind: "reward",
      title: `You used points for ${reward.title}`,
      detail: `${reward.cost} points were spent on this reward.`,
      link: getMemberProfilePath(memberId),
      actorId: memberId,
      actorName: member.name,
      createdAt: redeemedAt,
    });

    await updateState((current) => {
      const targetProfile = current.memberProfiles.find((profile) => profile.memberId === memberId);
      if (!targetProfile || targetProfile.pointsBalance < reward.cost) {
        return current;
      }

      const nextState: AppState = {
        ...current,
        memberProfiles: current.memberProfiles.map((profile) => {
          if (profile.memberId !== memberId) {
            return profile;
          }

          return {
            ...profile,
            pointsBalance: profile.pointsBalance - reward.cost,
            rewards: profile.rewards.map((entry) =>
              entry.id === rewardId
                ? { ...entry, redemptions: entry.redemptions + 1, lastRedeemedAt: redeemedAt }
                : entry,
            ),
          };
        }),
      };

      return appendNotifications(nextState, selfNotifications);
    });

    const familyNotifications = createNotifications(
      memberList.filter((entry) => entry.id !== memberId).map((entry) => entry.id),
      {
        kind: "reward",
        title: `${member.name} unlocked ${reward.title}`,
        detail: reward.detail || "A reward was redeemed.",
        link: getMemberProfilePath(memberId),
        actorId: memberId,
        actorName: member.name,
        createdAt: redeemedAt,
      },
    );
    await addFamilyAchievement(memberId, `${member.name} unlocked ${reward.title}`, reward.detail || "A reward was redeemed.", 0, "reward", familyNotifications);
  }

  async function addProfileCalendarEvent(
    memberId: string,
    event: {
      title: string;
      date: string;
      time: string;
      detail: string;
    },
  ) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      calendarEvents: [
        {
          id: createId("calendar"),
          title: event.title,
          date: event.date,
          time: event.time,
          detail: event.detail,
        },
        ...profile.calendarEvents,
      ].sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)),
    }));
  }

  async function saveProfileAvatarUpload(memberId: string, upload: ProfileUpload) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      avatarUploadId: upload.id,
      uploads: [upload, ...profile.uploads.filter((entry) => entry.id !== upload.id && entry.kind !== "avatar")],
    }));
  }

  async function addProfileMemoryUpload(memberId: string, upload: ProfileUpload) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      uploads: [upload, ...profile.uploads.filter((entry) => entry.id !== upload.id)].slice(0, 18),
    }));
  }

  async function removeProfileUpload(memberId: string, uploadId: string) {
    await updateMemberProfile(memberId, (profile) => ({
      ...profile,
      avatarUploadId: profile.avatarUploadId === uploadId ? null : profile.avatarUploadId,
      uploads: profile.uploads.filter((entry) => entry.id !== uploadId),
    }));
  }

  const openChores = choreStatusSummary.due + choreStatusSummary.overdue;
  const savingsPercent = savingsRow?.percent ?? 0;
  const savingsAmount = savingsRow?.amount ?? 0;
  const primarySuggestion = assistantSuggestions[0] ?? "Ask the assistant for a weekly family planning reset.";
  const ownerCount = memberList.filter((member) => member.role === "owner").length;
  const adminCount = memberList.filter((member) => member.role === "admin").length;
  const currentUserNotifications = state.notifications
    .filter((notification) => notification.recipientUserId === currentUserId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const unreadNotificationCount = currentUserNotifications.filter((notification) => !notification.readAt).length;
  const activeMember = memberProfileId ? memberList.find((member) => member.id === memberProfileId) : null;
  const activeProfile = memberProfileId ? state.memberProfiles.find((profile) => profile.memberId === memberProfileId) : null;
  const activeDirectThread = activeMember ? findDirectThread(activeMember.id) : null;
  const partnerMembers = state.partnerSpace?.memberIds
    .map((memberId) => memberList.find((member) => member.id === memberId))
    .filter((member): member is HouseholdMember => Boolean(member)) ?? [];
  const currentUserIsPartner = Boolean(state.partnerSpace?.memberIds.includes(currentUserId));
  const canConfigurePartnerSpace = role === "owner" || role === "admin";
  const { navigation, activeNav } = buildWorkspaceShellData({
    activeTab,
    state,
    memberList,
    memberNames,
    bestRecipe,
    budgetPlanCount: budgetPlan.length,
    savingsPercent,
    savingsAmount,
    personalNotificationCount: currentUserNotifications.length,
    unreadNotificationCount,
    primarySuggestion,
    saving,
    assistantSuggestions,
    aiTask,
    inviteCode,
    canManageHousehold,
    rotatingInvite,
    completedChores,
    openChores,
    actions: {
      goToTab,
      generateMealPlan: () => {
        void generateMealPlan();
      },
      generateBudgetCoach: () => {
        void generateBudgetCoach();
      },
      rotateInviteCode: () => {
        void rotateInviteCode();
      },
      handleAssistantPrompt: (prompt) => {
        void handleAssistantPrompt(prompt);
      },
    },
  });
  const topBarTitle = view === "member-profile" && activeMember ? `${activeMember.name} profile` : activeNav.label;
  const topBarDetail = "";

  if (view === "member-profile" && (!activeMember || !activeProfile)) {
    return (
      <main className="family-stage overflow-hidden text-[var(--foreground)]">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="family-panel rounded-[32px] p-8 md:p-10">
            <p className="family-kicker family-eyebrow">Member profile</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight">We could not find that family member.</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              The profile may have been removed, or the member is not part of this household anymore.
            </p>
            <button type="button" onClick={() => goToTab("family")} className="family-btn family-btn-primary mt-6">
              Back to Family Room
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === "focus-chat") {
    return (
      <main className="family-stage family-chat-focus-page overflow-hidden text-[var(--foreground)]">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />

        <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6 lg:px-8">
          <WorkspaceTopBar
            householdName={householdName}
            userName={userName}
            activeTitle="AI chat"
            activeDetail=""
            navigation={navigation}
            activeTab={activeTab}
            notifications={currentUserNotifications}
            unreadNotificationCount={unreadNotificationCount}
            onNavigate={goToTab}
            onOpenNotification={(notification) => {
              void openNotification(notification);
            }}
            onMarkAllNotificationsRead={() => {
              void markAllNotificationsRead();
            }}
            onSignOut={() => {
              void signOut({ callbackUrl: "/" });
            }}
          />

          {(aiError || saveError) && (
            <div className="family-card mb-5 rounded-[30px] border border-rose-200 bg-rose-50/95 p-4 text-sm leading-7 text-rose-900">
              {aiError ?? saveError}
            </div>
          )}

          <AssistantChatPanel
            history={state.assistantHistory}
            chatInput={chatInput}
            onChatInputChange={(value) => setChatInput(value)}
            onSubmitPrompt={handleAssistantPrompt}
            aiTask={aiTask}
            assistantSuggestions={assistantSuggestions}
            mode="focus"
            onBackToStudio={() => goToTab("ai")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="family-stage overflow-hidden text-[var(--foreground)]">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <WorkspaceTopBar
          householdName={householdName}
          userName={userName}
          activeTitle={topBarTitle}
          activeDetail={topBarDetail}
          navigation={navigation}
          activeTab={activeTab}
          notifications={currentUserNotifications}
          unreadNotificationCount={unreadNotificationCount}
          onNavigate={goToTab}
          onOpenNotification={(notification) => {
            void openNotification(notification);
          }}
          onMarkAllNotificationsRead={() => {
            void markAllNotificationsRead();
          }}
          onSignOut={() => {
            void signOut({ callbackUrl: "/" });
          }}
        />

        {(aiError || saveError) && (
          <div className="family-card mb-5 rounded-[30px] border border-rose-200 bg-rose-50/95 p-4 text-sm leading-7 text-rose-900">
            {aiError ?? saveError}
          </div>
        )}

        <div className="space-y-5">
          {view === "member-profile" && activeMember && activeProfile ? (
            <MemberProfilePage
              key={activeMember.id}
              member={activeMember}
              profile={activeProfile}
              role={role}
              currentUserId={currentUserId}
              familyAchievements={state.familyAchievements}
              directMessages={activeDirectThread?.messages ?? []}
              onBackToFamilyRoom={() => goToTab(activeMember.id === currentUserId ? "dashboard" : "family")}
              onSendMessage={(content) => {
                void sendDirectMessage(activeMember.id, content);
              }}
              onEditMessage={(messageId, content) => {
                void editDirectMessage(activeMember.id, messageId, content);
              }}
              onDeleteMessage={(messageId) => {
                void deleteDirectMessage(activeMember.id, messageId);
              }}
              onSaveBasics={(headline, about) => {
                void saveProfileBasics(activeMember.id, headline, about);
              }}
              onSaveWeatherLocation={(location) => {
                void saveProfileWeatherLocation(activeMember.id, location);
              }}
              onSaveFitness={(entry) => {
                void saveProfileFitness(activeMember.id, entry);
              }}
              onShareFitness={() => {
                void shareProfileFitness(activeMember.id);
              }}
              onAddGoal={(goal) => {
                void addProfileGoal(activeMember.id, goal);
              }}
              onCompleteGoal={(goalId) => {
                void completeProfileGoal(activeMember.id, goalId);
              }}
              onShareGoal={(goalId) => {
                void shareProfileGoal(activeMember.id, goalId);
              }}
              onAddReward={(reward) => {
                void addProfileReward(activeMember.id, reward);
              }}
              onRedeemReward={(rewardId) => {
                void redeemProfileReward(activeMember.id, rewardId);
              }}
              onAddCalendarEvent={(event) => {
                void addProfileCalendarEvent(activeMember.id, event);
              }}
              onSaveAvatarUpload={(upload) => {
                void saveProfileAvatarUpload(activeMember.id, upload);
              }}
              onAddMemoryUpload={(upload) => {
                void addProfileMemoryUpload(activeMember.id, upload);
              }}
              onRemoveUpload={(uploadId) => {
                void removeProfileUpload(activeMember.id, uploadId);
              }}
            />
          ) : (
            <>
              {activeTab !== "partner" && activeTab !== "games" ? (
                <section className="space-y-5">
                  <WorkspacePageSections
                    activeTab={activeTab}
                    currentUserId={currentUserId}
                    state={state}
                    memberList={memberList}
                    memberNames={memberNames}
                    role={role}
                    householdNameInput={householdNameInput}
                    setHouseholdNameInput={setHouseholdNameInput}
                    inviteCode={inviteCode}
                    canManageHousehold={canManageHousehold}
                    canManageRoles={canManageRoles}
                    canRemoveMembers={canRemoveMembers}
                    ingredientInput={ingredientInput}
                    setIngredientInput={setIngredientInput}
                    choreTitle={choreTitle}
                    setChoreTitle={setChoreTitle}
                    choreAssignee={choreAssignee}
                    setChoreAssignee={setChoreAssignee}
                    choreCadence={choreCadence}
                    setChoreCadence={setChoreCadence}
                    choreDueTime={choreDueTime}
                    setChoreDueTime={setChoreDueTime}
                    chorePoints={chorePoints}
                    setChorePoints={setChorePoints}
                    choreDays={choreDays}
                    toggleChoreDay={toggleChoreDay}
                    reminderTitle={reminderTitle}
                    setReminderTitle={setReminderTitle}
                    reminderWhen={reminderWhen}
                    setReminderWhen={setReminderWhen}
                    reminderCadence={reminderCadence}
                    setReminderCadence={setReminderCadence}
                    reminderScheduledFor={reminderScheduledFor}
                    setReminderScheduledFor={setReminderScheduledFor}
                    reminderAudience={reminderAudience}
                    setReminderAudience={setReminderAudience}
                    reminderInApp={reminderInApp}
                    setReminderInApp={setReminderInApp}
                    reminderBrowser={reminderBrowser}
                    setReminderBrowser={setReminderBrowser}
                    reminderEmail={reminderEmail}
                    setReminderEmail={setReminderEmail}
                    routineName={routineName}
                    setRoutineName={setRoutineName}
                    routineTimeWindow={routineTimeWindow}
                    setRoutineTimeWindow={setRoutineTimeWindow}
                    routineItems={routineItems}
                    setRoutineItems={setRoutineItems}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    aiTask={aiTask}
                    rotatingInvite={rotatingInvite}
                    savingHouseholdName={savingHouseholdName}
                    memberActionId={memberActionId}
                    assistantSuggestions={assistantSuggestions}
                    currentUserNotifications={currentUserNotifications}
                    unreadNotificationCount={unreadNotificationCount}
                    recipeMatches={recipeMatches}
                    bestRecipe={bestRecipe}
                    familyQuestBoard={state.familyQuestBoard}
                    budgetPlan={budgetPlan}
                    savingsPercent={savingsPercent}
                    savingsAmount={savingsAmount}
                    completedChores={completedChores}
                    openChores={openChores}
                    ownerCount={ownerCount}
                    adminCount={adminCount}
                    goToTab={goToTab}
                    openAiChatFocus={openAiChatFocus}
                    openMemberProfile={openMemberProfile}
                    openNotification={(notification) => {
                      void openNotification(notification);
                    }}
                    markNotificationRead={(notificationId) => {
                      void markNotificationRead(notificationId);
                    }}
                    markAllNotificationsRead={() => {
                      void markAllNotificationsRead();
                    }}
                    redeemFamilySharedReward={(rewardId) => {
                      void redeemFamilySharedReward(rewardId);
                    }}
                    addFamilyQuest={(quest) => {
                      void addFamilyQuest(quest);
                    }}
                    handleAssistantPrompt={handleAssistantPrompt}
                    generateMealPlan={() => {
                      void generateMealPlan();
                    }}
                    generateBudgetCoach={() => {
                      void generateBudgetCoach();
                    }}
                    rotateInviteCode={() => {
                      void rotateInviteCode();
                    }}
                    saveHouseholdDetails={(event) => {
                      void saveHouseholdDetails(event);
                    }}
                    updateMember={(memberId, nextRole) => {
                      void updateMember(memberId, nextRole);
                    }}
                    removeMember={(memberId) => {
                      void removeMember(memberId);
                    }}
                    addPantryItems={(event) => {
                      void addPantryItems(event);
                    }}
                    updateBudget={(key, value) => {
                      void updateBudget(key, value);
                    }}
                    addChore={(event) => {
                      void addChore(event);
                    }}
                    toggleChore={(id) => {
                      void toggleChore(id);
                    }}
                    addReminder={(event) => {
                      void addReminder(event);
                    }}
                    removeReminder={(id) => {
                      void removeReminder(id);
                    }}
                    addRoutine={(event) => {
                      void addRoutine(event);
                    }}
                    enableBrowserAlerts={() => {
                      void enableBrowserAlerts();
                    }}
                  />
                </section>
              ) : null}

              {activeTab === "partner" ? (
                <PartnerSpacePage
                  currentUserId={currentUserId}
                  canConfigurePartnerSpace={canConfigurePartnerSpace}
                  currentUserIsPartner={currentUserIsPartner}
                  members={memberList}
                  memberProfiles={state.memberProfiles}
                  partnerMembers={partnerMembers}
                  partnerSpace={state.partnerSpace}
                  onConfigurePartnerSpace={(memberIds) => {
                    void configurePartnerSpace(memberIds);
                  }}
                  onSendMessage={(content) => {
                    void sendPartnerMessage(content);
                  }}
                  onEditMessage={(messageId, content) => {
                    void editPartnerMessage(messageId, content);
                  }}
                  onDeleteMessage={(messageId) => {
                    void deletePartnerMessage(messageId);
                  }}
                    onAddPrivateReward={(reward) => {
                      void addPartnerReward(reward);
                    }}
                    onUpdatePrivateReward={(rewardId, reward) => {
                      void updatePartnerReward(rewardId, reward);
                    }}
                    onDeletePrivateReward={(rewardId) => {
                      void deletePartnerReward(rewardId);
                    }}
                    onRedeemPrivateReward={(rewardId) => {
                      void redeemPartnerReward(rewardId);
                    }}
                    onAddDatePlan={(plan) => {
                      void addPartnerDatePlan(plan);
                    }}
                    onUpdateDatePlan={(planId, plan) => {
                      void updatePartnerDatePlan(planId, plan);
                    }}
                    onDeleteDatePlan={(planId) => {
                      void deletePartnerDatePlan(planId);
                    }}
                    onAddConnectionNote={(note) => {
                      void addPartnerConnectionNote(note);
                    }}
                    onUpdateConnectionNote={(noteId, note) => {
                      void updatePartnerConnectionNote(noteId, note);
                    }}
                    onDeleteConnectionNote={(noteId) => {
                      void deletePartnerConnectionNote(noteId);
                    }}
                    onAddAnniversary={(entry) => {
                      void addPartnerAnniversary(entry);
                    }}
                    onUpdateAnniversary={(anniversaryId, entry) => {
                      void updatePartnerAnniversary(anniversaryId, entry);
                    }}
                    onDeleteAnniversary={(anniversaryId) => {
                      void deletePartnerAnniversary(anniversaryId);
                    }}
                    onAddBucketListItem={(entry) => {
                      void addPartnerBucketListItem(entry);
                    }}
                    onUpdateBucketListItem={(itemId, entry) => {
                      void updatePartnerBucketListItem(itemId, entry);
                    }}
                    onDeleteBucketListItem={(itemId) => {
                      void deletePartnerBucketListItem(itemId);
                    }}
                  />
                ) : null}

              {activeTab === "games" ? (
                <GameRoomPage
                  currentUserId={currentUserId}
                  memberList={memberList}
                  gameRoom={state.gameRoom}
                  familyQuestBoard={state.familyQuestBoard}
                  onSelectArcadeMember={(memberId) => {
                    void saveArcadeSelection(memberId);
                  }}
                  onSaveArcadeRun={(run) => {
                    void saveArcadeRun(run);
                  }}
                  onSaveUnoGame={(game) => {
                    void saveUnoGame(game);
                  }}
                  onRedeemFamilyReward={(rewardId) => {
                    void redeemFamilySharedReward(rewardId);
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
