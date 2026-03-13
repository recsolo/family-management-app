"use client";

import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";

import {
  createId,
  FAMILY_MEMBERS,
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
import type { HouseholdMember } from "@/lib/workspace";

type ActiveTab = "dashboard" | "ops" | "meals" | "budget" | "family" | "ai";
type AiTask = "assistant" | "meal-plan" | "budget-coach" | null;

type Props = {
  initialState: AppState;
  householdName: string;
  inviteCode: string;
  userName: string;
  members: HouseholdMember[];
};

export function FamilyFlowApp({ initialState, householdName, inviteCode: initialInviteCode, userName, members }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [state, setState] = useState<AppState>(initialState);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [ingredientInput, setIngredientInput] = useState("");
  const [choreTitle, setChoreTitle] = useState("");
  const [choreAssignee, setChoreAssignee] = useState(FAMILY_MEMBERS[0]);
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
  const [assistantSuggestions, setAssistantSuggestions] = useState<string[]>([
    "Plan a calm weeknight for our family.",
    "Turn our chores into a simple Saturday reset.",
    "What should we prep tonight to make tomorrow easier?",
  ]);

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
      setActiveTab("meals");
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
      setActiveTab("budget");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The budget coach could not respond.");
    } finally {
      setAiTask(null);
    }
  }

  async function rotateInviteCode() {
    setRotatingInvite(true);
    const response = await fetch("/api/workspace", { method: "PATCH" });
    const body = (await response.json()) as { inviteCode?: string; error?: string };
    setRotatingInvite(false);
    if (!response.ok || !body.inviteCode) {
      setSaveError(body.error ?? "Invite code could not be regenerated.");
      return;
    }
    setInviteCode(body.inviteCode);
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_26%),linear-gradient(135deg,_#f7f0e3_0%,_#ead7b6_45%,_#dbe9e4_100%)] text-stone-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col justify-between gap-8 bg-[linear-gradient(180deg,rgba(12,58,50,0.95),rgba(34,45,71,0.95))] p-8 text-stone-50">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-300">Stage 4 build</p>
              <h1 className="font-serif text-4xl">FamilyFlow AI</h1>
              <p className="max-w-xs text-sm leading-6 text-stone-300">Persistent family workspaces with shared planning, AI help, and invite-based access.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-stone-300">Household</p>
              <h2 className="mt-2 font-serif text-2xl">{householdName}</h2>
              <p className="mt-2 text-sm text-stone-200">Signed in as {userName}</p>
              <p className="mt-2 text-sm text-stone-200">Invite code: <span className="font-semibold tracking-[0.25em]">{inviteCode}</span></p>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="mt-4 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25">Sign out</button>
            </div>
            <nav className="grid gap-3" aria-label="Primary">
              {[["dashboard", "Dashboard"],["ops", "Family Ops"],["meals", "Meal Planner"],["budget", "Budget Lab"],["family", "Snapshot"],["ai", "AI Studio"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setActiveTab(value as ActiveTab)} className={`rounded-full border px-4 py-3 text-left text-sm font-semibold transition ${activeTab === value ? "border-white/20 bg-white/15" : "border-white/10 bg-white/10 hover:bg-white/15"}`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <section className="rounded-[28px] border border-white/10 bg-white/10 p-5">
            <h2 className="font-serif text-2xl">Workspace status</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
              <li>{saving ? "Saving changes to the household workspace..." : "Workspace changes are saved to the database."}</li>
              <li>AI actions use the shared household data as context.</li>
              <li>Invite code lets more family members join this workspace.</li>
            </ul>
          </section>
        </aside>

        <section className="p-5 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {(aiError || saveError) && <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">{aiError ?? saveError}</div>}

            <header className="flex flex-col gap-4 rounded-[32px] border border-stone-900/10 bg-white/80 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)] backdrop-blur md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Authenticated household workspace</p>
                <h2 className="max-w-2xl font-serif text-4xl leading-tight">One shared place for meals, money, chores, reminders, routines, and AI planning.</h2>
                <p className="max-w-2xl text-sm leading-6 text-stone-600">Stage 4 adds authentication, database-backed persistence, invite-based households, and shared member visibility.</p>
              </div>
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Stage 4 active</div>
            </header>

            {activeTab === "dashboard" && (
              <div className="grid gap-5 xl:grid-cols-4">
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Dinner signal</p><h3 className="mt-3 font-serif text-2xl">Best next meal</h3><p className="mt-3 text-sm leading-6 text-stone-600">{bestRecipe ? `${bestRecipe.name} matches ${bestRecipe.matches}/${bestRecipe.ingredients.length} pantry ingredients right now.` : "Add pantry items to unlock recipe suggestions."}</p></article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Budget pulse</p><h3 className="mt-3 font-serif text-2xl">Savings target</h3><p className="mt-3 text-sm leading-6 text-stone-600">{savingsRow?.percent}% of income, or about ${savingsRow?.amount.toLocaleString()} monthly, is being reserved for savings.</p></article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Family members</p><h3 className="mt-3 font-serif text-2xl">{members.length} linked</h3><p className="mt-3 text-sm leading-6 text-stone-600">Everyone in the household can work from the same shared workspace.</p></article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Chore board</p><h3 className="mt-3 font-serif text-2xl">{completedChores}/{state.chores.length} done</h3><p className="mt-3 text-sm leading-6 text-stone-600">Shared tasks, reminders, and routines are now database-backed.</p></article>
              </div>
            )}

            {activeTab === "ops" && (
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Chore board</p>
                  <h3 className="mt-3 font-serif text-3xl">Plan the work at home</h3>
                  <form className="mt-6 space-y-4" onSubmit={(event) => void addChore(event)}>
                    <label className="block text-sm font-medium text-stone-700">New chore<input value={choreTitle} onChange={(event) => setChoreTitle(event.target.value)} placeholder="Take out recycling" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label>
                    <label className="block text-sm font-medium text-stone-700">Assign to<select value={choreAssignee} onChange={(event) => setChoreAssignee(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3">{FAMILY_MEMBERS.map((member) => <option key={member} value={member}>{member}</option>)}</select></label>
                    <button type="submit" className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">Add chore</button>
                  </form>
                </article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Today&apos;s chores</p>
                  <h3 className="mt-3 font-serif text-3xl">Shared completion board</h3>
                  <div className="mt-6 space-y-4">{state.chores.map((chore) => <button key={chore.id} type="button" onClick={() => void toggleChore(chore.id)} className={`w-full rounded-[24px] border p-5 text-left transition ${chore.done ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50 hover:border-emerald-300"}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-serif text-2xl">{chore.title}</h4><p className="mt-2 text-sm leading-6 text-stone-600">{chore.assignee} &middot; {chore.frequency}</p></div><div className={`rounded-full px-3 py-1 text-sm font-semibold ${chore.done ? "bg-emerald-200 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{chore.done ? "Done" : "Open"}</div></div></button>)}</div>
                </article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)] xl:col-span-2">
                  <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Reminder composer</p>
                      <h3 className="mt-3 font-serif text-3xl">Add family reminders</h3>
                      <form className="mt-6 space-y-4" onSubmit={(event) => void addReminder(event)}>
                        <label className="block text-sm font-medium text-stone-700">Reminder<input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="Dentist forms in backpack" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label>
                        <label className="block text-sm font-medium text-stone-700">When<input value={reminderWhen} onChange={(event) => setReminderWhen(event.target.value)} placeholder="Fri 7:45 AM" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label>
                        <label className="block text-sm font-medium text-stone-700">Audience<select value={reminderAudience} onChange={(event) => setReminderAudience(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3"><option value="Family">Family</option>{FAMILY_MEMBERS.map((member) => <option key={member} value={member}>{member}</option>)}</select></label>
                        <button type="submit" className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">Add reminder</button>
                      </form>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Upcoming reminders</p>
                      <h3 className="mt-3 font-serif text-3xl">Shared family queue</h3>
                      <div className="mt-6 space-y-4">{state.reminders.map((reminder) => <div key={reminder.id} className="rounded-[24px] border border-stone-200 bg-stone-50 p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="font-serif text-2xl">{reminder.title}</h4><p className="mt-2 text-sm leading-6 text-stone-600">{reminder.when} &middot; {reminder.audience}</p></div><button type="button" onClick={() => void removeReminder(reminder.id)} className="rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-stone-700">Clear</button></div></div>)}</div>
                    </div>
                  </div>
                </article>
              </div>
            )}

            {activeTab === "meals" && (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Pantry inventory</p><h3 className="mt-3 font-serif text-3xl">Cook from what you already have</h3><form className="mt-6 space-y-4" onSubmit={(event) => void addPantryItems(event)}><label className="block text-sm font-medium text-stone-700">Add ingredients<input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Tomatoes, rice, tortillas" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><button type="submit" className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">Add pantry items</button></form><div className="mt-6 flex flex-wrap gap-2">{state.pantry.map((ingredient) => <span key={ingredient} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">{ingredient}</span>)}</div></article>
                  <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Recipe suggestions</p><h3 className="mt-3 font-serif text-3xl">Pantry-aware meal matches</h3></div><button type="button" onClick={generateMealPlan} disabled={aiTask !== null} className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">{aiTask === "meal-plan" ? "Generating..." : "Generate AI meal plan"}</button></div><div className="mt-6 space-y-4">{recipeMatches.map((recipe) => <article key={recipe.name} className="rounded-[24px] border border-stone-200 bg-stone-50 p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="font-serif text-2xl">{recipe.name}</h4><p className="mt-2 text-sm leading-6 text-stone-600">{recipe.description}</p></div><div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{recipe.matches}/{recipe.ingredients.length} ready</div></div><p className="mt-4 text-sm leading-6 text-stone-600">{recipe.missing.length > 0 ? `Still needed: ${recipe.missing.join(", ")}.` : "You already have everything needed for this recipe."}</p></article>)}</div></article>
                </div>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">AI meal planner</p>{state.latestMealPlan ? <div className="mt-3 space-y-5"><div><h3 className="font-serif text-3xl">{state.latestMealPlan.headline}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{state.latestMealPlan.summary}</p></div><div className="grid gap-4 lg:grid-cols-2">{state.latestMealPlan.meals.map((meal) => <div key={`${meal.day}-${meal.recipe}`} className="rounded-[24px] border border-stone-200 bg-stone-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">{meal.day}</p><h4 className="mt-2 font-serif text-2xl">{meal.recipe}</h4><p className="mt-2 text-sm leading-6 text-stone-600">{meal.whyItFits}</p><p className="mt-3 text-sm leading-6 text-stone-700">Uses: {meal.usesIngredients.join(", ")}</p><p className="mt-1 text-sm leading-6 text-stone-600">Missing: {meal.missingIngredients.length > 0 ? meal.missingIngredients.join(", ") : "Nothing extra needed"}</p></div>)}</div></div> : <div className="mt-3 rounded-[24px] bg-stone-50 p-5 text-sm leading-6 text-stone-600">Generate a meal plan and the assistant will turn your pantry into a practical multi-day cooking plan.</div>}</article>
              </div>
            )}

            {activeTab === "budget" && (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                  <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Planner inputs</p><h3 className="mt-3 font-serif text-3xl">Build a family spending plan</h3><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-stone-700">Monthly take-home income<input type="number" min="0" step="100" value={state.budget.income} onChange={(event) => void updateBudget("income", Number(event.target.value) || 0)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><label className="block text-sm font-medium text-stone-700">Family size<input type="number" min="1" max="10" value={state.budget.familySize} onChange={(event) => void updateBudget("familySize", Number(event.target.value) || 1)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><label className="block text-sm font-medium text-stone-700">Primary goal<select value={state.budget.goal} onChange={(event) => void updateBudget("goal", event.target.value as BudgetGoal)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3"><option value="stability">Monthly stability</option><option value="savings">Increase savings</option><option value="debt">Pay down debt</option></select></label><label className="block text-sm font-medium text-stone-700">Planning style<select value={state.budget.style} onChange={(event) => void updateBudget("style", event.target.value as BudgetStyle)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3"><option value="balanced">Balanced</option><option value="lean">Lean</option><option value="comfort">Comfort-first</option></select></label></div></article>
                  <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Suggested allocation</p><h3 className="mt-3 font-serif text-3xl">AI-style budget plan</h3></div><button type="button" onClick={generateBudgetCoach} disabled={aiTask !== null} className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">{aiTask === "budget-coach" ? "Generating..." : "Get AI budget coaching"}</button></div><div className="mt-6 grid gap-4 md:grid-cols-2">{budgetPlan.map((row) => <div key={row.label} className="rounded-[24px] border border-stone-200 bg-stone-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">{row.label}</p><p className="mt-3 text-3xl font-semibold text-stone-900">{row.percent}%</p><p className="mt-2 text-sm leading-6 text-stone-600">${row.amount.toLocaleString()} per month</p></div>)}</div></article>
                </div>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">AI budget coach</p>{state.latestBudgetCoach ? <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-5"><div><h3 className="font-serif text-3xl">Budget guidance for this household</h3><p className="mt-2 text-sm leading-6 text-stone-600">{state.latestBudgetCoach.summary}</p></div><div className="rounded-[24px] bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-800">Wins</p><ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950">{state.latestBudgetCoach.wins.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="space-y-5"><div className="rounded-[24px] bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-800">Watchouts</p><ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">{state.latestBudgetCoach.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-[24px] bg-stone-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-stone-700">Next steps</p><ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">{state.latestBudgetCoach.nextSteps.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div> : <div className="mt-3 rounded-[24px] bg-stone-50 p-5 text-sm leading-6 text-stone-600">Generate budget coaching and the assistant will review the current household plan and suggest next actions.</div>}</article>
              </div>
            )}

            {activeTab === "family" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1.1fr]">
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Household members</p><h3 className="mt-3 font-serif text-3xl">Who has access</h3><div className="mt-5 space-y-3">{members.map((member) => <div key={member.id} className="rounded-[20px] border border-stone-200 bg-stone-50 p-4"><p className="font-semibold text-stone-900">{member.name}</p><p className="text-sm text-stone-600">{member.email}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">{member.role}</p></div>)}</div></article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Invite management</p><h3 className="mt-3 font-serif text-3xl">Bring the family in</h3><p className="mt-4 text-sm leading-6 text-stone-600">Share the invite code with other family members so they can join this same workspace.</p><div className="mt-5 rounded-[24px] bg-stone-50 p-5 text-center"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Invite code</p><p className="mt-3 text-3xl font-semibold tracking-[0.3em] text-stone-900">{inviteCode}</p></div><button type="button" onClick={() => void rotateInviteCode()} disabled={rotatingInvite} className="mt-5 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">{rotatingInvite ? "Refreshing..." : "Generate new invite code"}</button></article>
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Routine builder</p><h3 className="mt-3 font-serif text-3xl">Add a shared routine</h3><form className="mt-5 space-y-4" onSubmit={(event) => void addRoutine(event)}><label className="block text-sm font-medium text-stone-700">Routine name<input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Saturday reset" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><label className="block text-sm font-medium text-stone-700">Time window<input value={routineTimeWindow} onChange={(event) => setRoutineTimeWindow(event.target.value)} placeholder="9:00 AM - 10:30 AM" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><label className="block text-sm font-medium text-stone-700">Checklist items<input value={routineItems} onChange={(event) => setRoutineItems(event.target.value)} placeholder="Laundry, wipe counters, prep snacks" className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></label><button type="submit" className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">Add routine</button></form><div className="mt-5 space-y-3">{state.routines.map((routine) => <div key={routine.id} className="rounded-[20px] border border-stone-200 bg-stone-50 p-4"><h4 className="font-serif text-2xl">{routine.name}</h4><p className="mt-1 text-sm font-semibold text-emerald-700">{routine.timeWindow}</p><p className="mt-2 text-sm leading-6 text-stone-600">{routine.items.join(", ")}</p></div>)}</div></article>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">AI Studio</p><h3 className="mt-3 font-serif text-3xl">Talk to the family assistant</h3><div className="mt-6 space-y-4"><div className="max-h-[420px] space-y-3 overflow-y-auto rounded-[24px] bg-stone-50 p-4">{state.assistantHistory.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${message.role === "assistant" ? "bg-white text-stone-700" : "bg-emerald-700 text-white"}`}><p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">{message.role === "assistant" ? "FamilyFlow AI" : "You"}</p><p className="mt-1">{message.content}</p></div>)}</div><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleAssistantPrompt(chatInput); }}><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} rows={4} placeholder="Ask for a weekly plan, meal help, school-night reset, or reminder strategy." className="w-full rounded-[24px] border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-600" /><button type="submit" disabled={aiTask !== null} className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">{aiTask === "assistant" ? "Thinking..." : "Send to assistant"}</button></form></div></article>
                <article className="space-y-5"><div className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Quick prompts</p><h3 className="mt-3 font-serif text-3xl">Start with a useful question</h3><div className="mt-5 grid gap-3">{assistantSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => handleAssistantPrompt(suggestion)} disabled={aiTask !== null} className="rounded-[20px] border border-stone-200 bg-stone-50 px-4 py-4 text-left text-sm font-medium text-stone-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{suggestion}</button>)}</div></div><div className="rounded-[28px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_45px_rgba(65,48,32,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">Shared context</p><h3 className="mt-3 font-serif text-3xl">What the assistant sees</h3><ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600"><li>Current pantry and budget settings</li><li>Shared chores, reminders, and routines</li><li>Household workspace data from the database</li></ul></div></article>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
