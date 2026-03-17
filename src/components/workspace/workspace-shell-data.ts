import type { AppState, Recipe } from "@/lib/familyflow";
import type { ActiveTab } from "@/lib/workspace-tabs";
import type { HouseholdMember } from "@/lib/workspace";

type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

export type WorkspaceActionTone = "primary" | "secondary" | "ghost" | "soft";

export type WorkspaceNavigationItem = {
  value: ActiveTab;
  label: string;
  detail: string;
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

export const WORKSPACE_NAVIGATION: WorkspaceNavigationItem[] = [
  { value: "dashboard", label: "Dashboard", detail: "Command deck" },
  { value: "ops", label: "Family Ops", detail: "Chores and reminders" },
  { value: "meals", label: "Meal Planner", detail: "Pantry and recipes" },
  { value: "budget", label: "Budget Lab", detail: "Money plan" },
  { value: "family", label: "Family Room", detail: "Members and access" },
  { value: "ai", label: "AI Studio", detail: "Assistant" },
];

export const WORKSPACE_TAB_META: Record<ActiveTab, WorkspaceTabMeta> = {
  dashboard: {
    eyebrow: "Ready for today?",
    headline: "See what your family needs next.",
    description:
      "Meals, money, reminders, and progress all show up in one easy spot.",
    spotlight: "Start here when you want a quick check.",
  },
  ops: {
    eyebrow: "Let's get things done",
    headline: "Finish chores and keep reminders easy to see.",
    description:
      "Add chores, assign jobs, and keep family reminders in one place.",
    spotlight: "Open this page when it is time to work together.",
  },
  meals: {
    eyebrow: "What's for dinner?",
    headline: "Pick meals from what is already at home.",
    description:
      "Use the pantry, recipe matches, and AI help to make dinner easier.",
    spotlight: "Open this page when you want meal ideas fast.",
  },
  budget: {
    eyebrow: "Money made simple",
    headline: "See a clear plan for your family money.",
    description:
      "Budget Lab turns your numbers into a simple monthly plan and AI help.",
    spotlight: "Open this page to check or change the budget.",
  },
  family: {
    eyebrow: "Family setup",
    headline: "Invite family and keep everyone organized.",
    description:
      "Members, invite links, the family name, and routines all live here.",
    spotlight: "Come here to invite family or update settings.",
  },
  ai: {
    eyebrow: "Need help?",
    headline: "Ask FamilyFlow to help with meals, chores, and plans.",
    description:
      "AI Studio uses your real family data, so the answers feel useful and specific.",
    spotlight: "Open this page when you want ideas or a quick plan.",
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
  primarySuggestion,
  saving,
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

  const activeHeroStats: WorkspaceHeroStat[] = (() => {
    switch (activeTab) {
      case "ops":
        return [
          { label: "Open chores", value: openChores },
          { label: "Done today", value: completedChores },
          { label: "Reminders", value: state.reminders.length },
          { label: "Members", value: memberList.length },
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
          { label: "Pantry items", value: state.pantry.length },
          { label: "Open chores", value: openChores },
          { label: "Reminders", value: state.reminders.length },
          { label: "Members", value: memberList.length },
        ];
    }
  })();

  const pageProfile: WorkspacePageProfile = (() => {
    switch (activeTab) {
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
          focusKicker: "Household tempo",
          focusTitle: "See what matters next without hunting for it.",
          focusBody: nextMove,
          focusNote: activeMeta.spotlight,
          featureClass: "family-card family-card-dark",
          featureKicker: "Budget pulse",
          featureTitle: "Reserve is holding steady.",
          featureBody: `${savingsPercent}% of income, or about $${savingsAmount.toLocaleString()} monthly, is being reserved for savings.`,
          featureMeta: `Current goal: ${state.budget.goal} with a ${state.budget.style} style.`,
          featureAction: {
            label: "Open Budget Lab",
            onClick: () => actions.goToTab("budget"),
            tone: "secondary",
          },
          signalClass: "family-panel",
          signalKicker: "Tonight's dinner signal",
          signalTitle: bestRecipe ? bestRecipe.name : "Set the pantry stage",
          signalBody: bestRecipe
            ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} pantry ingredients already line up for the current strongest dinner match.`
            : "Add pantry items so dinner suggestions can start from what the house actually has.",
          signalTags: bestRecipe ? bestRecipe.ingredients.slice(0, 4) : [],
          railLabel: "Command deck context",
          railDescription: "The dashboard should answer what matters most right now before the family opens a deeper workspace page.",
          railCards: [
            {
              kicker: "Upcoming reminder",
              title: firstReminder ? firstReminder.title : "No reminder queued",
              body: firstReminder ? `${firstReminder.when} · ${firstReminder.audience}` : "Capture the next important detail before it disappears.",
              className: "family-panel",
            },
            {
              kicker: "Routine signal",
              title: firstRoutine ? firstRoutine.name : "No routine built yet",
              body: firstRoutine ? firstRoutine.timeWindow : "Create one repeatable flow so the household has a rhythm to return to.",
              className: "family-card family-card-gold",
            },
            {
              kicker: "Workspace status",
              title: saving ? "Syncing now" : "All changes saved",
              body: saving ? "The latest household changes are being persisted now." : "Everything visible here is already persisted for the household.",
              className: "family-card family-card-dark",
            },
          ],
          contextTitle: "What is shaping the next recommendation right now.",
          contextItems: [
            `Pantry items available: ${state.pantry.length}`,
            `Open chores to plan around: ${openChores}`,
            `Reminders currently queued: ${state.reminders.length}`,
            `Latest prompt seed: ${primarySuggestion}`,
          ],
        };
    }
  })();

  return {
    navigation: WORKSPACE_NAVIGATION,
    activeMeta,
    activeNav,
    activeHeroStats,
    pageProfile,
  };
}
