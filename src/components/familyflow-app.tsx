"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import {
  createId,
  getBudgetPlan,
  normalizeIngredient,
  RECIPES,
  type AppState,
  type BudgetCoach,
  type BudgetGoal,
  type BudgetStyle,
  type ChatMessage,
  type MealPlan,
} from "@/lib/familyflow";
import { getWorkspacePath, type ActiveTab } from "@/lib/workspace-tabs";
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
};

export function FamilyFlowApp({
  activeTab,
  currentUserId,
  initialState,
  householdName: initialHouseholdName,
  inviteCode: initialInviteCode,
  role,
  userName,
  members,
}: Props) {
  const router = useRouter();
  const initialMemberNames = Array.from(new Set(members.map((member) => member.name.trim()).filter(Boolean)));
  const [state, setState] = useState<AppState>(initialState);
  const [householdName, setHouseholdName] = useState(initialHouseholdName);
  const [householdNameInput, setHouseholdNameInput] = useState(initialHouseholdName);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [memberList, setMemberList] = useState(members);
  const [ingredientInput, setIngredientInput] = useState("");
  const [choreTitle, setChoreTitle] = useState("");
  const [choreAssignee, setChoreAssignee] = useState(initialMemberNames[0] ?? userName);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");
  const [reminderAudience, setReminderAudience] = useState("Family");
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
  const completedChores = state.chores.filter((chore) => chore.done).length;

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

  async function persistState(nextState: AppState) {
    setState(nextState);
    setSaving(true);
    setSaveError(null);

    const response = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: nextState }),
    });

    setSaving(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setSaveError(body.error ?? "Workspace changes could not be saved.");
    }
  }

  async function updateState(updater: (current: AppState) => AppState) {
    const nextState = updater(state);
    await persistState(nextState);
  }

  function goToTab(tab: ActiveTab) {
    router.push(getWorkspacePath(tab));
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
    setState((current) => ({ ...current, assistantHistory: nextHistory }));

    try {
      const data = await callAi<{ reply: string; suggestions: string[] }>({ kind: "assistant", prompt: prompt.trim(), history: nextHistory });
      setState((current) => ({ ...current, assistantHistory: [...nextHistory, { role: "assistant", content: data.reply }] }));
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
      setState((current) => ({ ...current, latestMealPlan: data }));
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
      setState((current) => ({ ...current, latestBudgetCoach: data }));
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

    setMemberList(body.members);
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

    setMemberList(body.members);
  }

  async function addPantryItems(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const additions = ingredientInput.split(",").map(normalizeIngredient).filter(Boolean);
    if (!additions.length) return;
    await updateState((current) => ({ ...current, pantry: Array.from(new Set([...current.pantry, ...additions])) }));
    setIngredientInput("");
  }

  async function updateBudget<K extends keyof AppState["budget"]>(key: K, value: AppState["budget"][K]) {
    await updateState((current) => ({ ...current, budget: { ...current.budget, [key]: value } }));
  }

  async function addChore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choreTitle.trim()) return;
    await updateState((current) => ({
      ...current,
      chores: [...current.chores, { id: createId("chore"), title: choreTitle.trim(), assignee: choreAssignee, frequency: "Custom", done: false }],
    }));
    setChoreTitle("");
  }

  async function toggleChore(id: string) {
    await updateState((current) => ({ ...current, chores: current.chores.map((chore) => (chore.id === id ? { ...chore, done: !chore.done } : chore)) }));
  }

  async function addReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderWhen.trim()) return;
    await updateState((current) => ({
      ...current,
      reminders: [{ id: createId("reminder"), title: reminderTitle.trim(), when: reminderWhen.trim(), audience: reminderAudience }, ...current.reminders],
    }));
    setReminderTitle("");
    setReminderWhen("");
    setReminderAudience("Family");
  }

  async function removeReminder(id: string) {
    await updateState((current) => ({ ...current, reminders: current.reminders.filter((reminder) => reminder.id !== id) }));
  }

  async function addRoutine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = routineItems.split(",").map((item) => item.trim()).filter(Boolean);
    if (!routineName.trim() || !routineTimeWindow.trim() || !items.length) return;
    await updateState((current) => ({
      ...current,
      routines: [...current.routines, { id: createId("routine"), name: routineName.trim(), timeWindow: routineTimeWindow.trim(), items }],
    }));
    setRoutineName("");
    setRoutineTimeWindow("");
    setRoutineItems("");
  }

  const openChores = state.chores.length - completedChores;
  const savingsPercent = savingsRow?.percent ?? 0;
  const savingsAmount = savingsRow?.amount ?? 0;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
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
  const primarySuggestion = assistantSuggestions[0] ?? "Ask the assistant for a weekly family planning reset.";
  const ownerCount = memberList.filter((member) => member.role === "owner").length;
  const adminCount = memberList.filter((member) => member.role === "admin").length;
  const plannedMealsCount = state.latestMealPlan?.meals.length ?? 0;
  const assistantHistoryCount = state.assistantHistory.length;
  const navigation: Array<{ value: ActiveTab; label: string; detail: string }> = [
    { value: "dashboard", label: "Dashboard", detail: "Command deck" },
    { value: "ops", label: "Family Ops", detail: "Chores and reminders" },
    { value: "meals", label: "Meal Planner", detail: "Pantry and recipes" },
    { value: "budget", label: "Budget Lab", detail: "Money plan" },
    { value: "family", label: "Family Room", detail: "Members and access" },
    { value: "ai", label: "AI Studio", detail: "Assistant" },
  ];
  const tabMeta: Record<ActiveTab, { eyebrow: string; headline: string; description: string; spotlight: string }> = {
    dashboard: {
      eyebrow: "Household command deck",
      headline: "Everything your family needs, arranged like a concierge desk.",
      description:
        "Meals, money, reminders, access, and shared progress surface from one calmer control room instead of six scattered tools.",
      spotlight: "Best when you want the strongest next move without hunting for it.",
    },
    ops: {
      eyebrow: "Daily execution",
      headline: "Run home logistics with clarity, not clutter.",
      description:
        "Compose chores, capture reminders, and keep the shared queue moving with interfaces that make status obvious at a glance.",
      spotlight: "Use this view when you need to assign work quickly and keep the household aligned.",
    },
    meals: {
      eyebrow: "Pantry-first planning",
      headline: "Turn what you already have into dinner decisions that feel intentional.",
      description:
        "The meal planner combines pantry inventory, recipe matching, and AI-generated plans so cooking choices are easier and lower waste.",
      spotlight: "Strongest when your pantry is current and you want a multi-day meal path.",
    },
    budget: {
      eyebrow: "Money planning",
      headline: "Make the monthly plan feel readable, grounded, and action-ready.",
      description:
        "Budget Lab translates income, family size, and planning style into practical allocations plus coaching the household can use.",
      spotlight: "Ideal for setting the monthly plan or pressure-testing the current one.",
    },
    family: {
      eyebrow: "Access and identity",
      headline: "Keep the household workspace polished behind the scenes too.",
      description:
        "Roles, invites, household naming, and repeatable routines live together here so the family system stays organized as it grows.",
      spotlight: "Come here to manage access, rename the household, or shape repeatable routines.",
    },
    ai: {
      eyebrow: "Private assistant",
      headline: "Ask one assistant that already understands the household context.",
      description:
        "AI Studio uses the shared workspace as context, so weekly plans, meal help, and budget coaching stay grounded in real family data.",
      spotlight: "Best when you want the assistant to synthesize everything into practical next steps.",
    },
  };
  const activeMeta = tabMeta[activeTab];
  const activeNav = navigation.find((item) => item.value === activeTab) ?? navigation[0];
  const activeHeroStats = (() => {
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
          { label: "Routines", value: state.routines.length },
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

  function getActionButtonClass(tone: "primary" | "secondary" | "ghost" | "soft") {
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

  const pageProfile = (() => {
    switch (activeTab) {
      case "ops":
        return {
          heroTone: "dark" as const,
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
            onClick: () => goToTab("ai"),
            tone: "primary" as const,
          },
          signalClass: "family-panel",
          signalKicker: "Assignment rhythm",
          signalTitle: `${memberNames.length} people can share the load.`,
          signalBody: memberNames.length > 0
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
          heroTone: "light" as const,
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
            onClick: () => void generateMealPlan(),
            tone: "primary" as const,
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
          heroTone: "dark" as const,
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
            onClick: () => void generateBudgetCoach(),
            tone: "primary" as const,
          },
          signalClass: "family-panel",
          signalKicker: "Planning posture",
          signalTitle: `${state.budget.goal} with a ${state.budget.style} plan.`,
          signalBody: "Use this route to pressure-test allocations, then ask the coach for a practical next step instead of just another percentage table.",
          signalTags: [`${state.budget.familySize} people`, `${budgetPlan.length} categories`],
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
          heroTone: "light" as const,
          heroClass: "family-panel family-surface-gold",
          focusKicker: "Access and identity",
          focusTitle: "Make the shared workspace feel organized behind the scenes too.",
          focusBody: `${memberList.length} connected member${memberList.length === 1 ? "" : "s"}, ${state.routines.length} routine${state.routines.length === 1 ? "" : "s"}, and one invite path keep this household workspace structured.`,
          focusNote: "This route is about ownership, access, and repeatable family systems rather than day-to-day execution.",
          featureClass: "family-card family-card-dark",
          featureKicker: "Access posture",
          featureTitle: `${memberList.length} people are connected.`,
          featureBody: `${ownerCount} owner${ownerCount === 1 ? "" : "s"} and ${adminCount} admin${adminCount === 1 ? "" : "s"} currently manage access inside this household.`,
          featureMeta: `Invite code: ${inviteCode}`,
          featureAction: canManageHousehold
            ? {
                label: rotatingInvite ? "Refreshing..." : "Rotate invite code",
                onClick: () => void rotateInviteCode(),
                tone: "secondary" as const,
              }
            : undefined,
          signalClass: "family-panel",
          signalKicker: "Routine rhythm",
          signalTitle: firstRoutine ? firstRoutine.name : "No routine built yet",
          signalBody: firstRoutine
            ? `${firstRoutine.timeWindow}. ${firstRoutine.items.join(", ")}.`
            : "Add the first routine here so the family has one repeatable flow it can keep returning to.",
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
          ],
          contextTitle: "What is shaping family access right now.",
          contextItems: [
            `Connected members: ${memberList.length}`,
            `Owners: ${ownerCount}, admins: ${adminCount}`,
            `Invite code currently active: ${inviteCode}`,
            `Routine count: ${state.routines.length}`,
          ],
        };
      case "ai":
        return {
          heroTone: "dark" as const,
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
            onClick: () => void handleAssistantPrompt(primarySuggestion),
            tone: "primary" as const,
          },
          signalClass: "family-panel",
          signalKicker: "Conversation context",
          signalTitle: assistantHistoryCount > 0 ? `${assistantHistoryCount} messages in the thread.` : "No assistant history yet",
          signalBody: assistantHistoryCount > 0
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
          heroTone: "light" as const,
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
            onClick: () => goToTab("budget"),
            tone: "secondary" as const,
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

  return (
    <main className="family-stage overflow-hidden text-[var(--foreground)]">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {(aiError || saveError) && (
          <div className="family-card mb-5 rounded-[30px] border border-rose-200 bg-rose-50/95 p-4 text-sm leading-7 text-rose-900">
            {aiError ?? saveError}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[285px_minmax(0,1fr)_320px]">
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
                    Signed in as {userName}. {memberList.length} linked member{memberList.length === 1 ? "" : "s"} sharing the same planning space.
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
              <p className="px-3 pt-2 family-kicker family-eyebrow">Navigate the workspace</p>
              <nav className="mt-3 space-y-3" aria-label="Primary">
                {navigation.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-current={activeTab === item.value ? "page" : undefined}
                    onClick={() => goToTab(item.value)}
                    className={`family-tab ${activeTab === item.value ? "family-tab-active" : ""}`}
                  >
                    <span className="family-kicker">{item.detail}</span>
                    <span className="mt-2 block font-serif text-2xl leading-tight">{item.label}</span>
                  </button>
                ))}
              </nav>
            </section>

            <section className="family-card family-card-dark family-animate-rise rounded-[34px] p-5">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Quick concierge actions</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight">Run the next smart move.</h2>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={generateMealPlan}
                  disabled={aiTask !== null}
                  className="family-btn family-btn-primary w-full justify-between"
                >
                  <span>{aiTask === "meal-plan" ? "Generating plan..." : "Build meal plan"}</span>
                  <span className="family-kicker text-black/60">Meals</span>
                </button>
                <button
                  type="button"
                  onClick={generateBudgetCoach}
                  disabled={aiTask !== null}
                  className="family-btn family-btn-secondary w-full justify-between"
                >
                  <span>{aiTask === "budget-coach" ? "Analyzing..." : "Review money plan"}</span>
                  <span className="family-kicker text-white/70">Budget</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToTab("ai")}
                  className="family-btn family-btn-ghost w-full justify-between"
                >
                  <span>Open AI Studio</span>
                  <span className="family-kicker text-[rgba(241,214,136,0.76)]">Assistant</span>
                </button>
              </div>
            </section>
          </aside>

          <div className="space-y-5">
            <section className="family-panel family-animate-rise rounded-[40px] p-4 md:p-5">
              <div className="grid gap-5 2xl:grid-cols-[1.06fr_0.94fr]">
                <article className={`${pageProfile.heroClass} rounded-[34px] p-7 md:p-8`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`family-badge ${pageProfile.heroTone === "dark" ? "family-badge-gold" : "family-badge-warm"}`}>{activeMeta.eyebrow}</span>
                    <span className={`family-badge ${pageProfile.heroTone === "dark" ? "family-badge-warm" : "family-badge-accent"}`}>
                      {activeNav.label}
                    </span>
                  </div>
                  <h2 className={`mt-6 max-w-3xl font-serif text-5xl leading-[0.94] md:text-6xl ${pageProfile.heroTone === "dark" ? "text-white" : "text-[var(--foreground)]"}`}>{activeMeta.headline}</h2>
                  <p className={`mt-5 max-w-2xl text-base leading-8 md:text-lg ${pageProfile.heroTone === "dark" ? "text-stone-200" : "text-[var(--muted)]"}`}>{activeMeta.description}</p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {activeHeroStats.slice(0, 3).map((stat) => (
                      <div key={stat.label} className={pageProfile.heroTone === "dark" ? "family-dark-note" : "family-side-stat"}>
                        <p className={`family-kicker ${pageProfile.heroTone === "dark" ? "text-[rgba(241,214,136,0.76)]" : ""}`}>{stat.label}</p>
                        <p className={`mt-3 font-serif text-4xl ${pageProfile.heroTone === "dark" ? "text-white" : "text-white"}`}>{stat.value}</p>
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
                      <p className={`family-kicker ${pageProfile.featureClass.includes("dark") || pageProfile.featureClass.includes("accent") ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{pageProfile.featureKicker}</p>
                      <p className={`mt-3 font-serif text-4xl leading-tight ${pageProfile.featureClass.includes("dark") || pageProfile.featureClass.includes("accent") ? "text-white" : "text-[var(--foreground)]"}`}>{pageProfile.featureTitle}</p>
                      <p className={`mt-3 text-sm leading-7 ${pageProfile.featureClass.includes("dark") || pageProfile.featureClass.includes("accent") ? "text-white/82" : "text-[var(--muted)]"}`}>{pageProfile.featureBody}</p>
                      <p className={`mt-4 text-sm ${pageProfile.featureClass.includes("dark") || pageProfile.featureClass.includes("accent") ? "text-white/70" : "text-[var(--accent-strong)]"}`}>{pageProfile.featureMeta}</p>
                      {pageProfile.featureAction && (
                        <button
                          type="button"
                          onClick={pageProfile.featureAction.onClick}
                          disabled={aiTask !== null && ["meals", "budget", "ai"].includes(activeTab)}
                          className={`${getActionButtonClass(pageProfile.featureAction.tone)} mt-5`}
                        >
                          {pageProfile.featureAction.label}
                        </button>
                      )}
                    </article>
                    <article className={`${pageProfile.signalClass} rounded-[30px] p-5`}>
                      <p className="family-kicker family-eyebrow">{pageProfile.signalKicker}</p>
                      <h3 className="mt-3 font-serif text-3xl leading-tight">{pageProfile.signalTitle}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{pageProfile.signalBody}</p>
                      {pageProfile.signalTags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {pageProfile.signalTags.map((tag) => (
                            <span key={tag} className="family-badge family-badge-warm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-5">

            {activeTab === "dashboard" && (
              <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
                <article className="family-card family-card-dark family-animate-rise rounded-[34px] p-7">
                  <p className="family-kicker text-[rgba(241,214,136,0.76)]">Tonight&apos;s dinner signal</p>
                  <h3 className="mt-4 font-serif text-4xl leading-tight">
                    {bestRecipe ? bestRecipe.name : "Set the pantry stage"}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-stone-200">
                    {bestRecipe
                      ? `${bestRecipe.name} matches ${bestRecipe.matches}/${bestRecipe.ingredients.length} pantry ingredients right now, making it the strongest dinner candidate in the house.`
                      : "Add pantry items so the meal planner can stop guessing and start suggesting dinner from what you actually have."}
                  </p>
                  {bestRecipe && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {bestRecipe.ingredients.map((ingredient) => (
                        <span key={ingredient} className="family-badge bg-white/10 text-stone-100">
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => goToTab("meals")} className="family-btn family-btn-primary">
                      Open meal planner
                    </button>
                    <button type="button" onClick={() => goToTab("ai")} className="family-btn family-btn-ghost">
                      Ask assistant
                    </button>
                  </div>
                </article>

                <div className="grid gap-5">
                  <article className="family-card family-card-gold family-animate-rise rounded-[30px] p-6">
                    <p className="family-kicker family-eyebrow">Budget pulse</p>
                    <h3 className="mt-3 font-serif text-4xl leading-tight">Reserve is holding steady.</h3>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      {savingsPercent}% of income, or about ${savingsAmount.toLocaleString()} monthly, is being reserved for savings.
                    </p>
                    <button type="button" onClick={() => goToTab("budget")} className="family-btn family-btn-secondary mt-5">
                      Open Budget Lab
                    </button>
                  </article>

                  <article className="family-card family-animate-rise rounded-[30px] p-6">
                    <p className="family-kicker family-eyebrow">Member snapshot</p>
                    <h3 className="mt-3 font-serif text-4xl leading-tight">{memberList.length} people in the loop.</h3>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      Roles decide who can manage invites, settings, and access while everyone else stays focused on family work.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {memberList.slice(0, 4).map((member) => (
                        <span key={member.id} className="family-badge family-badge-accent">
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>

                <article className="family-card family-animate-rise rounded-[32px] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">Chore board</p>
                      <h3 className="mt-3 font-serif text-4xl leading-tight">
                        {completedChores}/{state.chores.length} done
                      </h3>
                    </div>
                    <span className="family-badge family-badge-gold">{openChores} open</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {state.chores.length > 0 ? (
                      state.chores.slice(0, 3).map((chore) => (
                        <button
                          key={chore.id}
                          type="button"
                          onClick={() => void toggleChore(chore.id)}
                          className={`family-list-card w-full text-left ${chore.done ? "family-list-card-done" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-serif text-2xl">{chore.title}</h4>
                              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                                {chore.assignee} · {chore.frequency}
                              </p>
                            </div>
                            <span className={`family-badge ${chore.done ? "family-badge-accent" : "family-badge-gold"}`}>
                              {chore.done ? "Done" : "Open"}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="family-empty rounded-[26px] p-5 text-sm leading-7 text-[var(--muted)]">
                        Add the first chore to start building a visible shared completion board.
                      </div>
                    )}
                  </div>
                </article>

                <article className="family-card family-card-soft family-animate-rise rounded-[32px] p-6">
                  <p className="family-kicker family-eyebrow">Queue and rhythm</p>
                  <div className="mt-5 space-y-4">
                    <div className="family-sidebar-note">
                      <p className="family-kicker family-eyebrow">Upcoming reminder</p>
                      <h4 className="mt-3 font-serif text-2xl">{firstReminder ? firstReminder.title : "No reminder queued"}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {firstReminder
                          ? `${firstReminder.when} · ${firstReminder.audience}`
                          : "Capture school items, pickup timing, or household resets so they do not disappear into memory."}
                      </p>
                    </div>
                    <div className="family-sidebar-note">
                      <p className="family-kicker family-eyebrow">Latest routine</p>
                      <h4 className="mt-3 font-serif text-2xl">{firstRoutine ? firstRoutine.name : "No shared routine yet"}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {firstRoutine
                          ? `${firstRoutine.timeWindow} · ${firstRoutine.items.join(", ")}`
                          : "Add a repeatable routine so the household has a steady rhythm for resets and prep."}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            )}

            {activeTab === "ops" && (
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-6 md:p-7">
                  <p className="family-kicker family-eyebrow">Chore composer</p>
                  <h3 className="mt-4 font-serif text-4xl leading-tight">Plan the work at home.</h3>
                  <form className="mt-6 space-y-4" onSubmit={(event) => void addChore(event)}>
                    <label className="block text-sm font-medium text-stone-700">
                      New chore
                      <input value={choreTitle} onChange={(event) => setChoreTitle(event.target.value)} placeholder="Take out recycling" className="family-input mt-2" />
                    </label>
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
                    <button type="submit" className="family-btn family-btn-primary">Add chore</button>
                  </form>
                </article>
                <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">Today&apos;s chores</p>
                      <h3 className="mt-4 font-serif text-4xl leading-tight">Shared completion board.</h3>
                    </div>
                    <span className="family-badge family-badge-gold">{state.chores.length - completedChores} open</span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {state.chores.length > 0 ? (
                      state.chores.map((chore) => (
                        <button key={chore.id} type="button" onClick={() => void toggleChore(chore.id)} className={`w-full rounded-[24px] border p-5 text-left transition ${chore.done ? "border-[rgba(228,192,92,0.34)] bg-[rgba(250,241,210,0.86)]" : "border-[var(--line-soft)] bg-white/80 hover:border-[rgba(228,192,92,0.28)]"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-serif text-2xl">{chore.title}</h4>
                              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{chore.assignee} &middot; {chore.frequency}</p>
                            </div>
                            <span className={`family-badge ${chore.done ? "family-badge-accent" : "family-badge-gold"}`}>{chore.done ? "Done" : "Open"}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                        Add the first chore to start building a shared completion board.
                      </div>
                    )}
                  </div>
                </article>
                <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7 xl:col-span-2">
                  <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                    <div>
                      <p className="family-kicker family-eyebrow">Reminder composer</p>
                      <h3 className="mt-4 font-serif text-4xl leading-tight">Add family reminders.</h3>
                      <form className="mt-6 space-y-4" onSubmit={(event) => void addReminder(event)}>
                        <label className="block text-sm font-medium text-stone-700">
                          Reminder
                          <input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="Dentist forms in backpack" className="family-input mt-2" />
                        </label>
                        <label className="block text-sm font-medium text-stone-700">
                          When
                          <input value={reminderWhen} onChange={(event) => setReminderWhen(event.target.value)} placeholder="Fri 7:45 AM" className="family-input mt-2" />
                        </label>
                        <label className="block text-sm font-medium text-stone-700">
                          Audience
                          <select value={reminderAudience} onChange={(event) => setReminderAudience(event.target.value)} className="family-select mt-2">
                            <option value="Family">Family</option>
                            {memberNames.map((member) => (
                              <option key={member} value={member}>
                                {member}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="family-btn family-btn-primary">Add reminder</button>
                      </form>
                    </div>
                    <div>
                      <p className="family-kicker family-eyebrow">Upcoming reminders</p>
                      <h3 className="mt-4 font-serif text-4xl leading-tight">Shared family queue.</h3>
                      <div className="mt-6 space-y-4">
                        {state.reminders.length > 0 ? (
                          state.reminders.map((reminder) => (
                            <div key={reminder.id} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-serif text-2xl">{reminder.title}</h4>
                                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reminder.when} &middot; {reminder.audience}</p>
                                </div>
                                <button type="button" onClick={() => void removeReminder(reminder.id)} className="family-btn family-btn-secondary px-3 py-2 text-xs uppercase tracking-[0.2em]">
                                  Clear
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                            No reminders yet. Add one for school items, pickup timing, or a weekly household reset.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )}

            {activeTab === "meals" && (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <article className="family-panel family-surface-warm family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">Pantry inventory</p><h3 className="mt-4 font-serif text-4xl leading-tight">Cook from what you already have.</h3><form className="mt-6 space-y-4" onSubmit={(event) => void addPantryItems(event)}><label className="block text-sm font-medium text-stone-700">Add ingredients<input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Tomatoes, rice, tortillas" className="family-input mt-2" /></label><button type="submit" className="family-btn family-btn-primary">Add pantry items</button></form><div className="mt-6 flex flex-wrap gap-2">{state.pantry.length > 0 ? state.pantry.map((ingredient) => <span key={ingredient} className="family-badge family-badge-gold">{ingredient}</span>) : <div className="family-empty w-full rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">Add a few pantry staples and the planner will start suggesting lower-waste meals.</div>}</div></article>
                  <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="family-kicker family-eyebrow">Recipe suggestions</p><h3 className="mt-4 font-serif text-4xl leading-tight">Pantry-aware meal matches.</h3></div><button type="button" onClick={generateMealPlan} disabled={aiTask !== null} className="family-btn family-btn-secondary">{aiTask === "meal-plan" ? "Generating..." : "Generate AI meal plan"}</button></div><div className="mt-6 space-y-4">{recipeMatches.map((recipe) => <article key={recipe.name} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="font-serif text-2xl">{recipe.name}</h4><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{recipe.description}</p></div><span className={`family-badge ${recipe.matches > 0 ? "family-badge-accent" : "family-badge-warm"}`}>{recipe.matches}/{recipe.ingredients.length} ready</span></div><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{recipe.missing.length > 0 ? `Still needed: ${recipe.missing.join(", ")}.` : "You already have everything needed for this recipe."}</p></article>)}</div></article>
                </div>
                <article className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">AI meal planner</p>{state.latestMealPlan ? <div className="mt-4 space-y-6"><div><h3 className="font-serif text-4xl leading-tight">{state.latestMealPlan.headline}</h3><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestMealPlan.summary}</p></div><div className="grid gap-4 lg:grid-cols-2">{state.latestMealPlan.meals.map((meal) => <div key={`${meal.day}-${meal.recipe}`} className="rounded-[24px] border border-[var(--line-soft)] bg-white/76 p-5"><p className="family-kicker family-eyebrow">{meal.day}</p><h4 className="mt-3 font-serif text-2xl">{meal.recipe}</h4><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{meal.whyItFits}</p><p className="mt-4 text-sm leading-6 text-stone-700">Uses: {meal.usesIngredients.join(", ")}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Missing: {meal.missingIngredients.length > 0 ? meal.missingIngredients.join(", ") : "Nothing extra needed"}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Prep note: {meal.prepNote}</p></div>)}</div><div className="rounded-[24px] border border-[var(--line-soft)] bg-white/76 p-5"><p className="family-kicker family-eyebrow">Shopping list</p><div className="mt-4 flex flex-wrap gap-2">{state.latestMealPlan.shoppingList.map((item) => <span key={item} className="family-badge family-badge-warm">{item}</span>)}</div></div></div> : <div className="family-empty mt-4 rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">Generate a meal plan and the assistant will turn your pantry into a practical multi-day cooking plan.</div>}</article>
              </div>
            )}

            {activeTab === "budget" && (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                  <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">Planner inputs</p><h3 className="mt-4 font-serif text-4xl leading-tight">Build a family spending plan.</h3><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-stone-700">Monthly take-home income<input type="number" min="0" step="100" value={state.budget.income} onChange={(event) => void updateBudget("income", Number(event.target.value) || 0)} className="family-input mt-2" /></label><label className="block text-sm font-medium text-stone-700">Family size<input type="number" min="1" max="10" value={state.budget.familySize} onChange={(event) => void updateBudget("familySize", Number(event.target.value) || 1)} className="family-input mt-2" /></label><label className="block text-sm font-medium text-stone-700">Primary goal<select value={state.budget.goal} onChange={(event) => void updateBudget("goal", event.target.value as BudgetGoal)} className="family-select mt-2"><option value="stability">Monthly stability</option><option value="savings">Increase savings</option><option value="debt">Pay down debt</option></select></label><label className="block text-sm font-medium text-stone-700">Planning style<select value={state.budget.style} onChange={(event) => void updateBudget("style", event.target.value as BudgetStyle)} className="family-select mt-2"><option value="balanced">Balanced</option><option value="lean">Lean</option><option value="comfort">Comfort-first</option></select></label></div></article>
                  <article className="family-panel family-surface-gold family-animate-rise rounded-[28px] p-6 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="family-kicker family-eyebrow">Suggested allocation</p><h3 className="mt-4 font-serif text-4xl leading-tight">AI-style budget plan.</h3></div><button type="button" onClick={generateBudgetCoach} disabled={aiTask !== null} className="family-btn family-btn-secondary">{aiTask === "budget-coach" ? "Generating..." : "Get AI budget coaching"}</button></div><div className="mt-6 grid gap-4 md:grid-cols-2">{budgetPlan.map((row) => <div key={row.label} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5"><p className="family-kicker family-eyebrow">{row.label}</p><p className="mt-3 text-4xl font-semibold text-stone-900">{row.percent}%</p><p className="mt-2 text-sm leading-7 text-[var(--muted)]">${row.amount.toLocaleString()} per month</p></div>)}</div></article>
                </div>
                <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">AI budget coach</p>{state.latestBudgetCoach ? <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-5"><div><h3 className="font-serif text-4xl leading-tight">Budget guidance for this household.</h3><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestBudgetCoach.summary}</p></div><div className="family-card family-card-dark rounded-[24px] p-5"><p className="family-kicker text-[rgba(241,214,136,0.76)]">Wins</p><ul className="mt-4 space-y-2 text-sm leading-7 text-stone-100">{state.latestBudgetCoach.wins.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="space-y-5"><div className="family-card family-card-gold rounded-[24px] p-5"><p className="family-kicker family-eyebrow">Watchouts</p><ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--foreground)]">{state.latestBudgetCoach.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5"><p className="family-kicker family-eyebrow">Next steps</p><ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--muted)]">{state.latestBudgetCoach.nextSteps.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div> : <div className="family-empty mt-4 rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">Generate budget coaching and the assistant will review the current household plan and suggest next actions.</div>}</article>
              </div>
            )}

            {activeTab === "family" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1.1fr]">
                <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7">
                  <p className="family-kicker family-eyebrow">Household members</p>
                  <h3 className="mt-4 font-serif text-4xl leading-tight">Who has access.</h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                    Owners can update roles. Admins can manage member access for standard members. Members can view the workspace only.
                  </p>
                  <div className="mt-5 space-y-3">
                    {memberList.map((member) => {
                      const isCurrentUser = member.id === currentUserId;
                      const canChangeRole = canManageRoles && !isCurrentUser && member.role !== "owner";
                      const canRemoveMember = canRemoveMembers && !isCurrentUser && (role === "owner" ? member.role !== "owner" : member.role === "member");
                      const memberBusy = memberActionId === member.id;

                      return (
                        <div key={member.id} className="rounded-[22px] border border-[var(--line-soft)] bg-white/74 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{member.name}{isCurrentUser ? " (you)" : ""}</p>
                              <p className="mt-1 text-sm text-[var(--muted)]">{member.email}</p>
                            </div>
                            <span className={`family-badge ${member.role === "owner" ? "family-badge-warm" : member.role === "admin" ? "family-badge-accent" : "family-badge-gold"}`}>
                              {member.role}
                            </span>
                          </div>
                          {(canChangeRole || canRemoveMember) && (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              {canChangeRole && (
                                <label className="text-sm font-medium text-stone-700">
                                  Role
                                  <select
                                    value={member.role}
                                    onChange={(event) => void updateMember(member.id, event.target.value as Exclude<HouseholdRole, "owner">)}
                                    disabled={memberBusy}
                                    className="family-select ml-2 inline-flex w-auto min-w-[8rem]"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                  </select>
                                </label>
                              )}
                              {canRemoveMember && (
                                <button
                                  type="button"
                                  onClick={() => void removeMember(member.id)}
                                  disabled={memberBusy}
                                  className="family-btn family-btn-secondary"
                                >
                                  {memberBusy ? "Updating..." : "Remove member"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="family-panel family-surface-warm family-animate-rise rounded-[28px] p-6 md:p-7">
                  <p className="family-kicker family-eyebrow">Household settings</p>
                  <h3 className="mt-4 font-serif text-4xl leading-tight">Invite and identity controls.</h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                    Share the invite code with family members so they join this same workspace. Owners and admins can update these settings.
                  </p>
                  <form className="mt-5 space-y-4" onSubmit={(event) => void saveHouseholdDetails(event)}>
                    <label className="block text-sm font-medium text-stone-700">
                      Household name
                      <input
                        value={householdNameInput}
                        onChange={(event) => setHouseholdNameInput(event.target.value)}
                        disabled={!canManageHousehold || savingHouseholdName}
                        className="family-input mt-2 disabled:cursor-not-allowed disabled:bg-stone-100"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!canManageHousehold || savingHouseholdName}
                      className="family-btn family-btn-primary"
                    >
                      {savingHouseholdName ? "Saving..." : "Save household name"}
                    </button>
                  </form>
                  <div className="mt-5 rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5 text-center">
                    <p className="family-kicker family-eyebrow">Invite code</p>
                    <p className="mt-4 font-serif text-4xl tracking-[0.3em] text-stone-900">{inviteCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void rotateInviteCode()}
                    disabled={!canManageHousehold || rotatingInvite}
                    className="family-btn family-btn-secondary mt-5"
                  >
                    {rotatingInvite ? "Refreshing..." : "Generate new invite code"}
                  </button>
                </article>
                <article className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">Routine builder</p><h3 className="mt-4 font-serif text-4xl leading-tight">Add a shared routine.</h3><form className="mt-5 space-y-4" onSubmit={(event) => void addRoutine(event)}><label className="block text-sm font-medium text-stone-700">Routine name<input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Saturday reset" className="family-input mt-2" /></label><label className="block text-sm font-medium text-stone-700">Time window<input value={routineTimeWindow} onChange={(event) => setRoutineTimeWindow(event.target.value)} placeholder="9:00 AM - 10:30 AM" className="family-input mt-2" /></label><label className="block text-sm font-medium text-stone-700">Checklist items<input value={routineItems} onChange={(event) => setRoutineItems(event.target.value)} placeholder="Laundry, wipe counters, prep snacks" className="family-input mt-2" /></label><button type="submit" className="family-btn family-btn-primary">Add routine</button></form><div className="mt-5 space-y-3">{state.routines.length > 0 ? state.routines.map((routine) => <div key={routine.id} className="rounded-[22px] border border-[var(--line-soft)] bg-white/74 p-4"><h4 className="font-serif text-2xl">{routine.name}</h4><p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">{routine.timeWindow}</p><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{routine.items.join(", ")}</p></div>) : <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">Add your first routine to give the household a consistent repeatable rhythm.</div>}</div></article>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">AI Studio</p><h3 className="mt-4 font-serif text-4xl leading-tight">Talk to the family assistant.</h3><div className="mt-6 space-y-4"><div className="family-scroll max-h-[420px] space-y-3 overflow-y-auto rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.55)] p-4">{state.assistantHistory.length > 0 ? state.assistantHistory.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-[20px] px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "family-chat-assistant" : "family-chat-user"}`}><p className="family-kicker opacity-70">{message.role === "assistant" ? "FamilyFlow AI" : "You"}</p><p className="mt-2">{message.content}</p></div>) : <div className="family-empty rounded-[22px] p-5 text-sm leading-7 text-[var(--muted)]">Start the conversation with a weekly planning question, a school-night reset, or a pantry-to-dinner request.</div>}</div><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleAssistantPrompt(chatInput); }}><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} rows={4} placeholder="Ask for a weekly plan, meal help, school-night reset, or reminder strategy." className="family-textarea mt-2" /><button type="submit" disabled={aiTask !== null} className="family-btn family-btn-primary">{aiTask === "assistant" ? "Thinking..." : "Send to assistant"}</button></form></div></article>
                <article className="space-y-5"><div className="family-panel family-surface-warm family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">Quick prompts</p><h3 className="mt-4 font-serif text-4xl leading-tight">Start with a useful question.</h3><div className="mt-5 grid gap-3">{assistantSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => handleAssistantPrompt(suggestion)} disabled={aiTask !== null} className="family-btn family-btn-soft justify-start rounded-[20px] px-4 py-4 text-left text-sm font-medium">{suggestion}</button>)}</div></div><div className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-6 md:p-7"><p className="family-kicker family-eyebrow">Shared context</p><h3 className="mt-4 font-serif text-4xl leading-tight">What the assistant sees.</h3><ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]"><li>Current pantry and budget settings</li><li>Shared chores, reminders, and routines</li><li>Household workspace data from the database</li><li>Recent conversation history from this family workspace</li></ul></div></article>
              </div>
            )}

            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <section className="family-panel family-animate-rise rounded-[34px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="family-kicker family-eyebrow">{pageProfile.railLabel}</p>
                  <h2 className="mt-3 font-serif text-4xl leading-tight">{activeNav.label}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{pageProfile.railDescription}</p>
                </div>
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="family-btn family-btn-secondary">
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
                    <p className={`family-kicker ${card.className.includes("dark") || card.className.includes("accent") ? "text-[rgba(241,214,136,0.76)]" : "family-eyebrow"}`}>{card.kicker}</p>
                    <h3 className={`mt-3 font-serif text-2xl ${card.className.includes("dark") || card.className.includes("accent") ? "text-white" : "text-[var(--foreground)]"}`}>{card.title}</h3>
                    <p className={`mt-2 text-sm leading-7 ${card.className.includes("dark") || card.className.includes("accent") ? "text-stone-200" : "text-[var(--muted)]"}`}>{card.body}</p>
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
        </div>
      </div>
    </main>
  );
}
