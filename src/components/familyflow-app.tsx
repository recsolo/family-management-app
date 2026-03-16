"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { WorkspacePageSections } from "@/components/workspace/workspace-page-sections";
import { buildWorkspaceShellData } from "@/components/workspace/workspace-shell-data";
import {
  WorkspaceHeroPanel,
  WorkspaceLeftRail,
  WorkspaceRightRail,
} from "@/components/workspace/workspace-shell-panels";
import {
  createId,
  getBudgetPlan,
  normalizeIngredient,
  RECIPES,
  type AppState,
  type BudgetCoach,
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
      const data = await callAi<{ reply: string; suggestions: string[] }>({
        kind: "assistant",
        prompt: prompt.trim(),
        history: nextHistory,
      });
      setState((current) => ({
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

    await updateState((current) => ({
      ...current,
      chores: [
        ...current.chores,
        {
          id: createId("chore"),
          title: choreTitle.trim(),
          assignee: choreAssignee,
          frequency: "Custom",
          done: false,
        },
      ],
    }));
    setChoreTitle("");
  }

  async function toggleChore(id: string) {
    await updateState((current) => ({
      ...current,
      chores: current.chores.map((chore) => (chore.id === id ? { ...chore, done: !chore.done } : chore)),
    }));
  }

  async function addReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderWhen.trim()) {
      return;
    }

    await updateState((current) => ({
      ...current,
      reminders: [
        {
          id: createId("reminder"),
          title: reminderTitle.trim(),
          when: reminderWhen.trim(),
          audience: reminderAudience,
        },
        ...current.reminders,
      ],
    }));
    setReminderTitle("");
    setReminderWhen("");
    setReminderAudience("Family");
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

  const openChores = state.chores.length - completedChores;
  const savingsPercent = savingsRow?.percent ?? 0;
  const savingsAmount = savingsRow?.amount ?? 0;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const primarySuggestion = assistantSuggestions[0] ?? "Ask the assistant for a weekly family planning reset.";
  const ownerCount = memberList.filter((member) => member.role === "owner").length;
  const adminCount = memberList.filter((member) => member.role === "admin").length;
  const { navigation, activeMeta, activeNav, activeHeroStats, pageProfile } = buildWorkspaceShellData({
    activeTab,
    state,
    memberList,
    memberNames,
    bestRecipe,
    budgetPlanCount: budgetPlan.length,
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
          <WorkspaceLeftRail
            roleLabel={roleLabel}
            householdName={householdName}
            userName={userName}
            memberCount={memberList.length}
            inviteCode={inviteCode}
            saving={saving}
            primarySuggestion={primarySuggestion}
            navigation={navigation}
            activeTab={activeTab}
            aiTask={aiTask}
            onNavigate={goToTab}
            onGenerateMealPlan={() => {
              void generateMealPlan();
            }}
            onGenerateBudgetCoach={() => {
              void generateBudgetCoach();
            }}
          />

          <div className="space-y-5">
            <WorkspaceHeroPanel
              activeTab={activeTab}
              aiTask={aiTask}
              activeMeta={activeMeta}
              activeNav={activeNav}
              activeHeroStats={activeHeroStats}
              pageProfile={pageProfile}
            />

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
                reminderTitle={reminderTitle}
                setReminderTitle={setReminderTitle}
                reminderWhen={reminderWhen}
                setReminderWhen={setReminderWhen}
                reminderAudience={reminderAudience}
                setReminderAudience={setReminderAudience}
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
                recipeMatches={recipeMatches}
                bestRecipe={bestRecipe}
                budgetPlan={budgetPlan}
                savingsPercent={savingsPercent}
                savingsAmount={savingsAmount}
                completedChores={completedChores}
                openChores={openChores}
                ownerCount={ownerCount}
                adminCount={adminCount}
                goToTab={goToTab}
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
              />
            </section>
          </div>

          <WorkspaceRightRail
            householdName={householdName}
            activeNav={activeNav}
            activeHeroStats={activeHeroStats}
            pageProfile={pageProfile}
            onSignOut={() => {
              void signOut({ callbackUrl: "/" });
            }}
          />
        </div>
      </div>
    </main>
  );
}
