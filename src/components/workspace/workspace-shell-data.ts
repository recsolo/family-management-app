import { getTodayKey, type AppState, type Recipe } from "@/lib/familyflow";
import type { ActiveTab } from "@/lib/workspace-tabs";
import type { HouseholdMember } from "@/lib/workspace";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

export type WorkspaceActionTone = "primary" | "secondary" | "ghost" | "soft";

export type WorkspaceNavigationItem = {
  value: ActiveTab;
  label: string;
  detail: string;
  badge?: string | null;
};

export type WorkspaceTabMeta = {
  eyebrow: string;
  headline: string;
  description: string;
  spotlight: string;
};

export type WorkspaceHeroStat = {
  label: string;
  value: string | number;
};

export type WorkspaceRailCard = {
  kicker: string;
  title: string;
  body: string;
  className: string;
};

export type WorkspaceFeatureAction = {
  label: string;
  onClick: () => void;
  tone: WorkspaceActionTone;
};

export type WorkspacePageProfile = {
  heroTone: "light" | "dark";
  heroClass: string;
  focusKicker: string;
  focusTitle: string;
  focusBody: string;
  focusNote: string;
  featureClass: string;
  featureKicker: string;
  featureTitle: string;
  featureBody: string;
  featureMeta: string;
  featureAction?: WorkspaceFeatureAction;
  signalClass: string;
  signalKicker: string;
  signalTitle: string;
  signalBody: string;
  signalTags: string[];
  railLabel: string;
  railDescription: string;
  railCards: WorkspaceRailCard[];
  contextTitle: string;
  contextItems: string[];
};

export type RecipeMatch = Recipe & {
  matches: number;
  missing: string[];
};

type BuildWorkspaceShellDataArgs = {
  activeTab: ActiveTab;
  state: AppState;
  memberList: HouseholdMember[];
  memberNames: string[];
  bestRecipe?: RecipeMatch;
  budgetPlanCount: number;
  savingsPercent: number;
  savingsAmount: number;
  personalNotificationCount: number;
  unreadNotificationCount: number;
  primarySuggestion: string;
  saving: boolean;
  assistantSuggestions: string[];
  aiTask: AiTask;
  inviteCode: string;
  canManageHousehold: boolean;
  rotatingInvite: boolean;
  completedChores: number;
  openChores: number;
  actions: {
    goToTab: (tab: ActiveTab) => void;
    generateMealPlan: () => void;
    generateBudgetCoach: () => void;
    rotateInviteCode: () => void;
    handleAssistantPrompt: (prompt: string) => void;
  };
};

export type WorkspaceNavGroup = {
  label: string;
  items: WorkspaceNavigationItem[];
};

export const WORKSPACE_NAVIGATION: WorkspaceNavigationItem[] = [
  { value: "dashboard", label: "Today", detail: "Home" },
  { value: "inbox", label: "Family Inbox", detail: "Alerts" },
  { value: "ops", label: "Family Ops", detail: "Tasks" },
  { value: "family", label: "Family Room", detail: "Family" },
  { value: "meals", label: "Meal Planner", detail: "Meals" },
  { value: "budget", label: "Budget Lab", detail: "Money" },
  { value: "games", label: "Game Room", detail: "Play" },
  { value: "partner", label: "Partner Space", detail: "Private" },
  { value: "ai", label: "Ask AI", detail: "Questions" },
  { value: "help", label: "Help", detail: "Guide" },
];

export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    label: "Home",
    items: [
      { value: "dashboard", label: "Today", detail: "Home" },
      { value: "inbox", label: "Family Inbox", detail: "Alerts" },
    ],
  },
  {
    label: "Family",
    items: [
      { value: "ops", label: "Family Ops", detail: "Tasks" },
      { value: "family", label: "Family Room", detail: "Family" },
    ],
  },
  {
    label: "Lifestyle",
    items: [
      { value: "meals", label: "Meal Planner", detail: "Meals" },
      { value: "budget", label: "Budget Lab", detail: "Money" },
    ],
  },
  {
    label: "More",
    items: [
      { value: "games", label: "Game Room", detail: "Play" },
      { value: "partner", label: "Partner Space", detail: "Private" },
      { value: "ai", label: "Ask AI", detail: "Questions" },
      { value: "help", label: "Help", detail: "Guide" },
    ],
  },
];

export const WORKSPACE_TAB_META: Record<ActiveTab, WorkspaceTabMeta> = {
  dashboard: {
    eyebrow: "Today",
    headline: "Today",
    description: "What matters today.",
    spotlight: "Home",
  },
  games: {
    eyebrow: "Games",
    headline: "Game Room",
    description: "Play games.",
    spotlight: "Games",
  },
  help: {
    eyebrow: "Help",
    headline: "Help",
    description: "How to use the app.",
    spotlight: "Help",
  },
  inbox: {
    eyebrow: "Inbox",
    headline: "Family Inbox",
    description: "Alerts and updates.",
    spotlight: "Inbox",
  },
  ops: {
    eyebrow: "Tasks",
    headline: "Family Ops",
    description: "Chores and reminders.",
    spotlight: "Tasks",
  },
  meals: {
    eyebrow: "Meals",
    headline: "Meal Planner",
    description: "Dinner and pantry.",
    spotlight: "Meals",
  },
  budget: {
    eyebrow: "Budget",
    headline: "Budget Lab",
    description: "Money plan.",
    spotlight: "Budget",
  },
  family: {
    eyebrow: "Family",
    headline: "Family Room",
    description: "Members and settings.",
    spotlight: "Family",
  },
  partner: {
    eyebrow: "Partner",
    headline: "Partner Space",
    description: "Private chat and plans.",
    spotlight: "Partner",
  },
  ai: {
    eyebrow: "AI",
    headline: "Ask AI",
    description: "Ask a question.",
    spotlight: "AI",
  },
};

export function buildWorkspaceShellData({
  activeTab,
  state,
  memberList,
  memberNames,
  bestRecipe,
  budgetPlanCount,
  savingsPercent,
  savingsAmount,
  personalNotificationCount,
  unreadNotificationCount,
  primarySuggestion,
  assistantSuggestions,
  aiTask,
  inviteCode,
  canManageHousehold,
  rotatingInvite,
  completedChores,
  openChores,
  actions,
}: BuildWorkspaceShellDataArgs) {
  const activeMeta = WORKSPACE_TAB_META[activeTab];
  const activeNav = WORKSPACE_NAVIGATION.find((item) => item.value === activeTab) ?? WORKSPACE_NAVIGATION[0];
  const firstReminder = state.reminders[0];
  const firstRoutine = state.routines[0];
  const latestMeal = state.latestMealPlan?.meals[0];
  const todayKey = getTodayKey();
  const todaysEvents = state.memberProfiles.flatMap((profile) =>
    profile.calendarEvents
      .filter((event) => event.date === todayKey)
      .map((event) => ({
        ...event,
        memberName: memberList.find((member) => member.id === profile.memberId)?.name ?? "Family member",
      })),
  );
  const nextMove =
    state.pantry.length === 0
      ? "Add pantry staples to unlock pantry-first meal suggestions."
      : openChores > 0
        ? `There ${openChores === 1 ? "is" : "are"} ${openChores} open chore${openChores === 1 ? "" : "s"} ready to close out.`
        : state.reminders.length === 0
          ? "Capture the next reminder so the family queue stays current."
          : "Use AI Studio to turn the current household context into a polished weekly plan.";
  const ownerCount = memberList.filter((member) => member.role === "owner").length;
  const adminCount = memberList.filter((member) => member.role === "admin").length;
  const plannedMealsCount = state.latestMealPlan?.meals.length ?? 0;
  const assistantHistoryCount = state.assistantHistory.length;
  const topArcadeRun = [...state.gameRoom.arcadeRuns].sort((left, right) => right.score - left.score)[0];
  const activeUnoPlayers = state.gameRoom.uno?.players.length ?? 0;

  const activeHeroStats: WorkspaceHeroStat[] = (() => {
    switch (activeTab) {
      case "games":
        return [
          { label: "Arcade runs", value: state.gameRoom.arcadeRuns.length },
          { label: "Top score", value: topArcadeRun ? topArcadeRun.score : "Ready" },
          { label: "UNO seats", value: activeUnoPlayers },
          { label: "Table state", value: state.gameRoom.uno ? state.gameRoom.uno.status : "Open" },
        ];
      case "help":
        return [
          { label: "Quick guides", value: 4 },
          { label: "Prompt ideas", value: assistantSuggestions.length },
          { label: "Unread alerts", value: unreadNotificationCount },
          { label: "Members", value: memberList.length },
        ];
      case "ops":
        return [
          { label: "Open chores", value: openChores },
          { label: "Done today", value: completedChores },
          { label: "Reminders", value: state.reminders.length },
          { label: "Members", value: memberList.length },
        ];
      case "inbox":
        return [
          { label: "Unread", value: unreadNotificationCount },
          { label: "Recent alerts", value: personalNotificationCount },
          { label: "Messages", value: state.notifications.filter((notification) => notification.kind === "message" || notification.kind === "partner").length },
          { label: "Achievements", value: state.notifications.filter((notification) => notification.kind === "goal" || notification.kind === "achievement" || notification.kind === "reward").length },
        ];
      case "meals":
        return [
          { label: "Pantry items", value: state.pantry.length },
          { label: "Recipe match", value: bestRecipe ? `${bestRecipe.matches}/${bestRecipe.ingredients.length}` : "0/0" },
          { label: "Planned meals", value: plannedMealsCount },
          { label: "Shopping items", value: state.latestMealPlan?.shoppingList.length ?? 0 },
        ];
      case "budget":
        return [
          { label: "Income", value: `$${state.budget.income.toLocaleString()}` },
          { label: "Savings", value: `${savingsPercent}%` },
          { label: "Reserve", value: `$${savingsAmount.toLocaleString()}` },
          { label: "Family size", value: state.budget.familySize },
        ];
      case "family":
        return [
          { label: "Members", value: memberList.length },
          { label: "Owners", value: ownerCount },
          { label: "Admins", value: adminCount },
          { label: "Shared wins", value: state.familyAchievements.length },
        ];
      case "partner":
        return [
          { label: "Pair", value: state.partnerSpace?.memberIds.length === 2 ? "Ready" : "Set up" },
          { label: "Private notes", value: state.partnerSpace?.connectionNotes.length ?? 0 },
          { label: "Date plans", value: state.partnerSpace?.datePlans.length ?? 0 },
          { label: "Private rewards", value: state.partnerSpace?.privateRewards.length ?? 0 },
        ];
      case "ai":
        return [
          { label: "Suggestions", value: assistantSuggestions.length },
          { label: "Messages", value: assistantHistoryCount },
          { label: "Pantry", value: state.pantry.length },
          { label: "Reminders", value: state.reminders.length },
        ];
      case "dashboard":
      default:
        return [
          { label: "Dinner", value: latestMeal?.recipe ?? bestRecipe?.name ?? "Pick dinner" },
          { label: "Today events", value: todaysEvents.length },
          { label: "Open chores", value: openChores },
          { label: "Reminders", value: state.reminders.length },
        ];
    }
  })();

  const pageProfile: WorkspacePageProfile = (() => {
    switch (activeTab) {
      case "games":
        return {
          heroTone: "dark",
          heroClass: "family-card family-card-dark family-grid-lines",
          focusKicker: "Family play mode",
          focusTitle: "Switch from planning to play in one tap.",
          focusBody: topArcadeRun
            ? `${topArcadeRun.memberName} is leading the arcade board with ${topArcadeRun.score} points, and the UNO table is ${state.gameRoom.uno ? "already live" : "ready to start"}.`
            : "Launch a quick arcade round for instant fun, or start a pass-and-play UNO game for the whole family.",
          focusNote: "This page should feel playful and easy to start, not like another productivity screen.",
          featureClass: "family-card family-card-gold",
          featureKicker: "Arcade spotlight",
          featureTitle: topArcadeRun ? `${topArcadeRun.memberName} · ${topArcadeRun.score}` : "Quick all-ages challenge",
          featureBody: topArcadeRun
            ? `${topArcadeRun.starsCaught} stars caught and ${topArcadeRun.cloudsDodged} storm clouds dodged in the current top run.`
            : "The arcade game is built for quick turns, simple controls, and a score board everyone can chase.",
          featureMeta: state.gameRoom.arcadeRuns.length > 0 ? `${state.gameRoom.arcadeRuns.length} saved run${state.gameRoom.arcadeRuns.length === 1 ? "" : "s"} in this household.` : "Great for kids, adults, and quick couch competitions.",
          signalClass: "family-panel",
          signalKicker: "UNO table",
          signalTitle: state.gameRoom.uno ? `${activeUnoPlayers} seats at the table` : "No UNO round in progress",
          signalBody: state.gameRoom.uno
            ? `${state.gameRoom.uno.players[state.gameRoom.uno.currentPlayerIndex]?.name ?? "Someone"} is up next, and the table color is ${state.gameRoom.uno.activeColor}.`
            : "Start a new UNO table and the whole family can pass the device around and play together.",
          signalTags: state.gameRoom.uno?.players.map((player) => player.name).slice(0, 4) ?? [],
          railLabel: "Game night",
          railDescription: "Game Room is for breaks, laughs, and quick shared play without leaving the family app.",
          railCards: [
            {
              kicker: "Arcade leader",
              title: topArcadeRun ? `${topArcadeRun.memberName} · ${topArcadeRun.score}` : "No score yet",
              body: topArcadeRun ? `${topArcadeRun.playedAt.slice(0, 10)} · ${topArcadeRun.starsCaught} stars` : "Run the arcade game to set the first family score.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "UNO table",
              title: state.gameRoom.uno ? `${activeUnoPlayers} players` : "Ready to deal",
              body: state.gameRoom.uno ? state.gameRoom.uno.lastAction : "Start a pass-and-play round with family members from this household.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Family vibe",
              title: "Built for kids and adults",
              body: "One quick arcade challenge and one familiar card game make this page easy for everyone to enjoy.",
              className: "family-panel",
            },
          ],
          contextTitle: "What is shaping game night right now.",
          contextItems: [
            `Saved arcade runs: ${state.gameRoom.arcadeRuns.length}`,
            topArcadeRun ? `Top arcade player: ${topArcadeRun.memberName}` : "No arcade leader yet.",
            state.gameRoom.uno ? `UNO players seated: ${activeUnoPlayers}` : "No UNO table has started yet.",
            state.gameRoom.uno ? `Current UNO color: ${state.gameRoom.uno.activeColor}` : "UNO is waiting for a fresh deal.",
          ],
        };
      case "help":
        return {
          heroTone: "light",
          heroClass: "family-panel family-surface-accent",
          focusKicker: "Help desk",
          focusTitle: "Keep the how-to guidance in one page.",
          focusBody: "This page is the one place to learn the app, ask questions, and get guided answers from the assistant.",
          focusNote: "The rest of the app can stay simpler because the explanations live here.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Ask the AI",
          featureTitle: "Get a quick how-to answer.",
          featureBody: "Ask how invites, quests, rewards, chores, profiles, or private spaces work.",
          featureMeta: `${assistantSuggestions.length} help prompts are ready to start with.`,
          featureAction: {
            label: "Open AI Studio",
            onClick: () => actions.goToTab("ai"),
            tone: "primary",
          },
          signalClass: "family-panel",
          signalKicker: "Clean pages",
          signalTitle: "Explanations now live here.",
          signalBody: "Use this route when someone needs help learning the app or wants the AI to explain what to do next.",
          signalTags: ["Invite family", "Points", "Quests", "Profiles"],
          railLabel: "Help center",
          railDescription: "This route is for learning and support, not planning or operations.",
          railCards: [
            {
              kicker: "Best use",
              title: "How-to questions",
              body: "Ask where to invite people, how points work, or how to use a specific page.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "AI support",
              title: "Same family context",
              body: "The assistant can answer with the real state of this household in mind.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Why this page exists",
              title: "Keep the rest of the app cleaner",
              body: "Putting explanations here means the other pages can focus on the task itself.",
              className: "family-panel",
            },
          ],
          contextTitle: "What helps the assistant teach the app well.",
          contextItems: [
            `Current household members: ${memberList.length}`,
            `Unread inbox items: ${unreadNotificationCount}`,
            `Prompt starters available: ${assistantSuggestions.length}`,
            `Shared app context is still available to the assistant here.`,
          ],
        };
      case "ops":
        return {
          heroTone: "dark",
          heroClass: "family-card family-card-dark family-grid-lines",
          focusKicker: "Operations pulse",
          focusTitle: "Keep execution visible and easy to clear.",
          focusBody: `${openChores} open chore${openChores === 1 ? "" : "s"} and ${state.reminders.length} reminder${state.reminders.length === 1 ? "" : "s"} are shaping the family queue right now.`,
          focusNote: "This page should make assignment, completion, and follow-through obvious at a glance.",
          featureClass: "family-card family-card-gold",
          featureKicker: "Reminder queue",
          featureTitle: firstReminder ? firstReminder.title : "No reminder queued",
          featureBody: firstReminder
            ? `${firstReminder.when} for ${firstReminder.audience}. Keep the practical details visible so no one has to remember them alone.`
            : "Add a reminder for school items, pickups, or prep windows so the queue starts working for the household.",
          featureMeta: firstRoutine ? `Routine support: ${firstRoutine.name}` : "Pair reminders with one repeatable routine for steadier execution.",
          featureAction: {
            label: "Open AI Studio",
            onClick: () => actions.goToTab("ai"),
            tone: "primary",
          },
          signalClass: "family-panel",
          signalKicker: "Assignment rhythm",
          signalTitle: `${memberNames.length} people can share the load.`,
          signalBody:
            memberNames.length > 0
              ? `Current assignees in the workspace: ${memberNames.slice(0, 4).join(", ")}${memberNames.length > 4 ? "..." : ""}.`
              : "Add members so work can be distributed clearly across the household.",
          signalTags: memberNames.slice(0, 4),
          railLabel: "Operations context",
          railDescription: "This route is dedicated to chores, reminders, and shared follow-through.",
          railCards: [
            {
              kicker: "Completion board",
              title: `${completedChores}/${state.chores.length} chores done`,
              body: openChores > 0 ? `${openChores} still open.` : "Everything is cleared right now.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Upcoming reminder",
              title: firstReminder ? firstReminder.title : "Nothing queued",
              body: firstReminder ? `${firstReminder.when} · ${firstReminder.audience}` : "Use this page to capture the next family detail before it slips.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Routine support",
              title: firstRoutine ? firstRoutine.name : "No routine yet",
              body: firstRoutine ? firstRoutine.timeWindow : "Add one repeatable reset so the household has a rhythm to return to.",
              className: "family-panel",
            },
          ],
          contextTitle: "What is shaping household execution right now.",
          contextItems: [
            `Open chores to plan around: ${openChores}`,
            `Reminder count in view: ${state.reminders.length}`,
            `Members available to assign: ${memberList.length}`,
            firstRoutine ? `Current routine anchor: ${firstRoutine.name}` : "No routine anchor has been created yet.",
          ],
        };
      case "inbox":
        return {
          heroTone: "light",
          heroClass: "family-panel family-surface-accent",
          focusKicker: "Fresh updates",
          focusTitle: "Keep alerts, messages, and wins in one easy feed.",
          focusBody:
            unreadNotificationCount > 0
              ? `${unreadNotificationCount} unread alert${unreadNotificationCount === 1 ? "" : "s"} are waiting right now.`
              : "Everything is caught up right now, and new family updates will land here first.",
          focusNote: "This route should feel like the family's calm notification desk, not a noisy feed.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Unread right now",
          featureTitle: unreadNotificationCount > 0 ? `${unreadNotificationCount} alert${unreadNotificationCount === 1 ? "" : "s"} to check` : "All caught up",
          featureBody:
            unreadNotificationCount > 0
              ? "Use this page to open the newest updates and clear unread items without digging through the app."
              : "When new reminders, chats, or shared wins appear, they will show up here first.",
          featureMeta: `${personalNotificationCount} total inbox item${personalNotificationCount === 1 ? "" : "s"} are saved for this member.`,
          signalClass: "family-card family-card-gold",
          signalKicker: "What lands here",
          signalTitle: "Messages, reminders, and family wins.",
          signalBody:
            "Direct chats, partner nudges, reminder alerts, and shared accomplishments all collect here so the next action is easier to spot.",
          signalTags: ["Messages", "Reminders", "Goals"],
          railLabel: "Inbox context",
          railDescription: "This route is all about recent household updates and what still needs your attention.",
          railCards: [
            {
              kicker: "Unread",
              title: unreadNotificationCount > 0 ? `${unreadNotificationCount} still open` : "Zero unread",
              body: unreadNotificationCount > 0 ? "Open the newest items first so the feed stays calm." : "You are fully caught up right now.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Recent alerts",
              title: `${personalNotificationCount} saved`,
              body: "Recent household events stay here until you clear or read them.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Latest priority",
              title: unreadNotificationCount > 0 ? "Start with unread" : "Nothing urgent",
              body: unreadNotificationCount > 0 ? "Unread items should always stand out from the rest of the feed." : "The inbox can now act as a history view instead of an alert queue.",
              className: "family-panel",
            },
          ],
          contextTitle: "What is shaping the inbox right now.",
          contextItems: [
            `Unread alerts waiting: ${unreadNotificationCount}`,
            `Total alerts saved: ${personalNotificationCount}`,
            `Message alerts in state: ${state.notifications.filter((notification) => notification.kind === "message" || notification.kind === "partner").length}`,
            `Shared family win alerts in state: ${state.notifications.filter((notification) => notification.kind === "goal" || notification.kind === "achievement" || notification.kind === "reward").length}`,
          ],
        };
      case "meals":
        return {
          heroTone: "light",
          heroClass: "family-panel family-surface-warm",
          focusKicker: "Pantry-first planning",
          focusTitle: "Make dinner decisions from what is already in the house.",
          focusBody: bestRecipe
            ? `${bestRecipe.name} is your strongest pantry match right now with ${bestRecipe.matches} of ${bestRecipe.ingredients.length} ingredients already covered.`
            : "Once the pantry has a few staples, this page becomes the fastest path from ingredients to dinner.",
          focusNote: "The goal here is lower-friction, lower-waste meal planning with fewer last-minute decisions.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Current pantry edge",
          featureTitle: bestRecipe ? bestRecipe.name : "Feed the planner",
          featureBody: bestRecipe
            ? `Best current match. Missing: ${bestRecipe.missing.length > 0 ? bestRecipe.missing.join(", ") : "nothing extra needed"}.`
            : "Add pantry items and let the assistant turn them into a more intentional multi-day plan.",
          featureMeta: `${state.pantry.length} pantry item${state.pantry.length === 1 ? "" : "s"} tracked right now.`,
          featureAction: {
            label: aiTask === "meal-plan" ? "Generating..." : "Generate meal plan",
            onClick: actions.generateMealPlan,
            tone: "primary",
          },
          signalClass: "family-card family-card-gold",
          signalKicker: "Latest meal plan",
          signalTitle: latestMeal ? `${latestMeal.day}: ${latestMeal.recipe}` : "No AI meal plan yet",
          signalBody: latestMeal
            ? `Uses ${latestMeal.usesIngredients.join(", ")} and keeps prep grounded in what the pantry already supports.`
            : "Generate the first plan to turn this route into a true pantry-based planning desk.",
          signalTags: state.pantry.slice(0, 4),
          railLabel: "Meal planning context",
          railDescription: "Everything on this route is oriented around pantry coverage, recipe fit, and lower-waste planning.",
          railCards: [
            {
              kicker: "Pantry depth",
              title: `${state.pantry.length} items logged`,
              body: state.pantry.length > 0 ? `Recent staples: ${state.pantry.slice(0, 4).join(", ")}${state.pantry.length > 4 ? "..." : ""}.` : "Add a few ingredients to start building recipe matches.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Best match",
              title: bestRecipe ? bestRecipe.name : "Awaiting pantry data",
              body: bestRecipe ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients already line up.` : "The best-match panel will appear once pantry data is available.",
              className: "family-panel",
            },
            {
              kicker: "Shopping readiness",
              title: state.latestMealPlan ? `${state.latestMealPlan.shoppingList.length} items on the list` : "No shopping list yet",
              body: state.latestMealPlan ? state.latestMealPlan.shoppingList.join(", ") : "Generate a meal plan to surface missing ingredients automatically.",
              className: "family-card family-card-dark",
            },
          ],
          contextTitle: "What is shaping dinner decisions right now.",
          contextItems: [
            `Pantry count available to the planner: ${state.pantry.length}`,
            bestRecipe ? `Best pantry coverage: ${bestRecipe.name}` : "No recipe match is available yet.",
            latestMeal ? `Latest AI meal anchor: ${latestMeal.recipe}` : "No AI meal plan has been generated yet.",
            `Shopping list size: ${state.latestMealPlan?.shoppingList.length ?? 0}`,
          ],
        };
      case "budget":
        return {
          heroTone: "dark",
          heroClass: "family-card family-card-accent family-grid-lines",
          focusKicker: "Budget posture",
          focusTitle: "Translate monthly numbers into confident household decisions.",
          focusBody: `Current plan aims for ${state.budget.goal} using a ${state.budget.style} style across a ${state.budget.familySize}-person household.`,
          focusNote: "This route should feel more like a money briefing than a generic settings page.",
          featureClass: "family-card family-card-gold",
          featureKicker: "Savings reserve",
          featureTitle: `${savingsPercent}% is currently protected.`,
          featureBody: `$${savingsAmount.toLocaleString()} is being reserved each month based on the current budget plan.`,
          featureMeta: `Income baseline: $${state.budget.income.toLocaleString()} take-home.`,
          featureAction: {
            label: aiTask === "budget-coach" ? "Generating..." : "Get AI budget coaching",
            onClick: actions.generateBudgetCoach,
            tone: "primary",
          },
          signalClass: "family-panel",
          signalKicker: "Planning posture",
          signalTitle: `${state.budget.goal} with a ${state.budget.style} plan.`,
          signalBody: "Use this route to pressure-test allocations, then ask the coach for a practical next step instead of just another percentage table.",
          signalTags: [`${state.budget.familySize} people`, `${budgetPlanCount} categories`],
          railLabel: "Budget planning context",
          railDescription: "This route is tuned for monthly decisions, tradeoffs, and coaching rather than household operations.",
          railCards: [
            {
              kicker: "Income baseline",
              title: `$${state.budget.income.toLocaleString()}`,
              body: "Monthly take-home income currently guiding the plan.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Goal",
              title: state.budget.goal,
              body: `Current planning style: ${state.budget.style}.`,
              className: "family-card family-card-gold",
            },
            {
              kicker: "Coach status",
              title: state.latestBudgetCoach ? "Guidance ready" : "Awaiting AI review",
              body: state.latestBudgetCoach ? state.latestBudgetCoach.summary : "Run the coach to get wins, watchouts, and next steps from the current budget.",
              className: "family-panel",
            },
          ],
          contextTitle: "What is shaping financial guidance right now.",
          contextItems: [
            `Income in plan: $${state.budget.income.toLocaleString()}`,
            `Primary goal: ${state.budget.goal}`,
            `Planning style: ${state.budget.style}`,
            `Savings reserve: $${savingsAmount.toLocaleString()} (${savingsPercent}%)`,
          ],
        };
      case "family":
        return {
          heroTone: "light",
          heroClass: "family-panel family-surface-gold",
          focusKicker: "Access and identity",
          focusTitle: "Open profiles, share wins, and keep the household organized.",
          focusBody: `${memberList.length} connected member${memberList.length === 1 ? "" : "s"}, ${state.familyAchievements.length} shared win${state.familyAchievements.length === 1 ? "" : "s"}, and one invite path keep this family space connected.`,
          focusNote: "This route is about profiles, access, invites, and family celebration moments.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Access posture",
          featureTitle: `${memberList.length} people are connected.`,
          featureBody: `${ownerCount} owner${ownerCount === 1 ? "" : "s"} and ${adminCount} admin${adminCount === 1 ? "" : "s"} currently manage access inside this household.`,
          featureMeta: `Invite code: ${inviteCode}`,
          featureAction: canManageHousehold
            ? {
                label: rotatingInvite ? "Refreshing..." : "Rotate invite code",
                onClick: actions.rotateInviteCode,
                tone: "secondary",
              }
            : undefined,
          signalClass: "family-panel",
          signalKicker: "Shared spotlight",
          signalTitle: state.familyAchievements[0]?.title ?? "No shared win yet",
          signalBody: state.familyAchievements[0]
            ? `${state.familyAchievements[0].memberName}: ${state.familyAchievements[0].detail}`
            : "Open a member profile and share a finished goal or fitness win so the whole family can see it here.",
          signalTags: memberList.slice(0, 4).map((member) => member.name),
          railLabel: "Family structure",
          railDescription: "This route is the home for members, roles, invites, and routine-building.",
          railCards: [
            {
              kicker: "Role spread",
              title: `${ownerCount} owner · ${adminCount} admin`,
              body: `${memberList.length - ownerCount - adminCount} standard member${memberList.length - ownerCount - adminCount === 1 ? "" : "s"} currently linked.`,
              className: "family-card family-card-gold",
            },
            {
              kicker: "Invite path",
              title: inviteCode,
              body: canManageHousehold ? "Owners and admins can rotate this from the Family Room page." : "Only owners and admins can rotate the invite code.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Routine count",
              title: `${state.routines.length} routine${state.routines.length === 1 ? "" : "s"}`,
              body: firstRoutine ? `Latest: ${firstRoutine.name}.` : "No routines have been built yet.",
              className: "family-panel",
            },
            {
              kicker: "Shared wins",
              title: `${state.familyAchievements.length} celebration${state.familyAchievements.length === 1 ? "" : "s"}`,
              body: state.familyAchievements[0]
                ? `Latest: ${state.familyAchievements[0].title}`
                : "Profiles can now send family accomplishments here.",
              className: "family-card family-card-dark",
            },
          ],
          contextTitle: "What is shaping family access right now.",
          contextItems: [
            `Connected members: ${memberList.length}`,
            `Owners: ${ownerCount}, admins: ${adminCount}`,
            `Invite code currently active: ${inviteCode}`,
            `Routine count: ${state.routines.length}`,
            `Shared wins: ${state.familyAchievements.length}`,
          ],
        };
      case "partner":
        return {
          heroTone: "dark",
          heroClass: "family-card family-card-dark family-grid-lines",
          focusKicker: "Private connection",
          focusTitle: "Keep the grown-up side of family life warm and intentional.",
          focusBody:
            state.partnerSpace?.memberIds.length === 2
              ? `${state.partnerSpace.messages.length} private message${state.partnerSpace.messages.length === 1 ? "" : "s"}, ${state.partnerSpace.datePlans.length} date plan${state.partnerSpace.datePlans.length === 1 ? "" : "s"}, and ${state.partnerSpace.privateRewards.length} private reward${state.partnerSpace.privateRewards.length === 1 ? "" : "s"} are saved here.`
              : "Choose the partner pair first, then this page becomes a private planning and connection space.",
          focusNote: "This route is meant to feel private, playful, and more personal than the family-wide pages.",
          featureClass: "family-card family-card-gold",
          featureKicker: "Date night energy",
          featureTitle: state.partnerSpace?.datePlans[0]?.title ?? "No date night on deck yet",
          featureBody: state.partnerSpace?.datePlans[0]
            ? `${state.partnerSpace.datePlans[0].when || "Any time"} at ${state.partnerSpace.datePlans[0].location || "a cozy spot you choose"}.`
            : "Save a simple date plan so the page starts nudging you toward real time together.",
          featureMeta: state.partnerSpace?.privateRewards[0]?.title
            ? `Private reward spotlight: ${state.partnerSpace.privateRewards[0].title}`
            : "Private rewards let the pair spend points on each other in a fun way.",
          signalClass: "family-panel",
          signalKicker: "Connection notes",
          signalTitle: state.partnerSpace?.connectionNotes[0]?.title ?? "No shared note yet",
          signalBody: state.partnerSpace?.connectionNotes[0]?.content ?? "Use this page for kind notes, date planning, and private check-ins that stay out of the main family flow.",
          signalTags: state.partnerSpace?.memberIds.map((memberId) => memberList.find((member) => member.id === memberId)?.name ?? "Partner") ?? [],
          railLabel: "Partner setup",
          railDescription: "Only the chosen pair should use the private messaging, date-night, and reward tools on this page.",
          railCards: [
            {
              kicker: "Private messages",
              title: `${state.partnerSpace?.messages.length ?? 0} saved`,
              body: "A lightweight private thread for the chosen pair.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Date plans",
              title: `${state.partnerSpace?.datePlans.length ?? 0} ideas`,
              body: "Keep simple plans and booked nights in one private place.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Connection notes",
              title: `${state.partnerSpace?.connectionNotes.length ?? 0} notes`,
              body: "Quick appreciations and warm notes help this page feel more personal.",
              className: "family-panel",
            },
          ],
          contextTitle: "What is shaping the private partner space right now.",
          contextItems: [
            `Partner pair configured: ${state.partnerSpace?.memberIds.length === 2 ? "yes" : "not yet"}`,
            `Private messages: ${state.partnerSpace?.messages.length ?? 0}`,
            `Date plans: ${state.partnerSpace?.datePlans.length ?? 0}`,
            `Private rewards: ${state.partnerSpace?.privateRewards.length ?? 0}`,
          ],
        };
      case "ai":
        return {
          heroTone: "dark",
          heroClass: "family-card family-card-dark family-grid-lines",
          focusKicker: "Assistant strategy",
          focusTitle: "Use the assistant to synthesize, not just answer.",
          focusBody: primarySuggestion,
          focusNote: "This route should feel like a private planning studio fed by real household context.",
          featureClass: "family-card family-card-gold",
          featureKicker: "Prompt seed",
          featureTitle: primarySuggestion,
          featureBody: "The strongest prompts here turn pantry, chores, reminders, and budget context into one practical plan.",
          featureMeta: `${assistantSuggestions.length} quick prompt${assistantSuggestions.length === 1 ? "" : "s"} ready.`,
          featureAction: {
            label: aiTask === "assistant" ? "Thinking..." : "Run this prompt",
            onClick: () => actions.handleAssistantPrompt(primarySuggestion),
            tone: "primary",
          },
          signalClass: "family-panel",
          signalKicker: "Conversation context",
          signalTitle: assistantHistoryCount > 0 ? `${assistantHistoryCount} messages in the thread.` : "No assistant history yet",
          signalBody:
            assistantHistoryCount > 0
              ? "The assistant already has household-specific conversation context to build on."
              : "Start the first conversation and this page becomes the household's private planning studio.",
          signalTags: assistantSuggestions.slice(0, 3),
          railLabel: "Assistant context",
          railDescription: "This route is for synthesis: weekly planning, pantry help, money coaching, and shared family resets.",
          railCards: [
            {
              kicker: "Pantry context",
              title: `${state.pantry.length} pantry items`,
              body: bestRecipe ? `Best current meal match: ${bestRecipe.name}.` : "Add pantry data to strengthen meal answers.",
              className: "family-card family-card-dark",
            },
            {
              kicker: "Budget context",
              title: `${savingsPercent}% reserve`,
              body: `$${savingsAmount.toLocaleString()} currently protected in the budget plan.`,
              className: "family-card family-card-gold",
            },
            {
              kicker: "Ops context",
              title: `${openChores} open chores`,
              body: `${state.reminders.length} reminders and ${state.routines.length} routines are also available to the assistant.`,
              className: "family-panel",
            },
          ],
          contextTitle: "What the assistant can ground itself in right now.",
          contextItems: [
            `Pantry items available: ${state.pantry.length}`,
            `Open chores to plan around: ${openChores}`,
            `Reminders currently queued: ${state.reminders.length}`,
            `Conversation history length: ${assistantHistoryCount}`,
          ],
        };
      case "dashboard":
      default:
        return {
          heroTone: "light",
          heroClass: "family-panel family-surface-gold",
          focusKicker: "Today at a glance",
          focusTitle: "See chores, plans, reminders, and dinner for today.",
          focusBody: nextMove,
          focusNote: "The first page should answer what happens today without extra clutter.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Dinner tonight",
          featureTitle: latestMeal?.recipe ?? bestRecipe?.name ?? "Pick a dinner plan",
          featureBody: latestMeal
            ? latestMeal.whyItFits
            : bestRecipe
              ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients already line up for tonight.`
              : "Add pantry staples or generate a meal plan so dinner is one easy call.",
          featureMeta: latestMeal?.day ?? "Meal Planner can turn pantry items into a dinner plan fast.",
          signalClass: "family-panel",
          signalKicker: "Today calendar",
          signalTitle: todaysEvents[0] ? `${todaysEvents[0].memberName}: ${todaysEvents[0].title}` : "No appointments saved for today",
          signalBody: todaysEvents[0]
            ? `${todaysEvents[0].time ? `${todaysEvents[0].time} / ` : ""}${todaysEvents[0].detail || "Check the member profile for the full plan."}`
            : "Add events to member profiles and they will show up here when they land today.",
          signalTags: todaysEvents.slice(0, 3).map((event) => event.memberName),
          railLabel: "Today context",
          railDescription: "This page is trimmed down to what matters right now: dinner, today's events, reminders, and open chores.",
          railCards: [
            {
              kicker: "Upcoming reminder",
              title: firstReminder ? firstReminder.title : "No reminder queued",
              body: firstReminder ? `${firstReminder.when} · ${firstReminder.audience}` : "Capture the next important detail before it disappears.",
              className: "family-panel",
            },
            {
              kicker: "Tonight dinner",
              title: latestMeal?.recipe ?? bestRecipe?.name ?? "Not picked yet",
              body: latestMeal ? latestMeal.whyItFits : "Meal Planner helps you land on dinner without a long debate.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Today schedule",
              title: todaysEvents.length > 0 ? `${todaysEvents.length} event${todaysEvents.length === 1 ? "" : "s"}` : "Nothing saved yet",
              body: todaysEvents.length > 0 ? `First up: ${todaysEvents[0]?.memberName} / ${todaysEvents[0]?.title}` : "Appointments from member profiles show up here when they happen today.",
              className: "family-card family-card-dark",
            },
          ],
          contextTitle: "What is shaping the next recommendation right now.",
          contextItems: [
            `Dinner path: ${latestMeal?.recipe ?? bestRecipe?.name ?? "not chosen yet"}`,
            `Appointments today: ${todaysEvents.length}`,
            `Open chores to plan around: ${openChores}`,
            `Reminders currently queued: ${state.reminders.length}`,
            firstRoutine ? `Current household routine: ${firstRoutine.name}` : "No routine is shaping today yet.",
          ],
        };
    }
  })();

  return {
    navigation: WORKSPACE_NAVIGATION.map((item) =>
      item.value === "inbox"
        ? {
            ...item,
            badge: unreadNotificationCount > 0 ? `${Math.min(unreadNotificationCount, 99)}${unreadNotificationCount > 99 ? "+" : ""}` : null,
          }
        : item,
    ),
    activeMeta,
    activeNav,
    activeHeroStats,
    pageProfile,
  };
}
