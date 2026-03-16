"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";

import type { AppState, BudgetGoal, BudgetStyle, Recipe } from "@/lib/familyflow";
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
  reminderTitle: string;
  setReminderTitle: Dispatch<SetStateAction<string>>;
  reminderWhen: string;
  setReminderWhen: Dispatch<SetStateAction<string>>;
  reminderAudience: string;
  setReminderAudience: Dispatch<SetStateAction<string>>;
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
  recipeMatches: RecipeMatch[];
  bestRecipe?: RecipeMatch;
  budgetPlan: BudgetPlanRow[];
  savingsPercent: number;
  savingsAmount: number;
  completedChores: number;
  openChores: number;
  ownerCount: number;
  adminCount: number;
  goToTab: (tab: ActiveTab) => void;
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

export function WorkspacePageSections(props: WorkspacePageSectionsProps) {
  switch (props.activeTab) {
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
  savingsAmount,
  savingsPercent,
  memberList,
  completedChores,
  openChores,
  goToTab,
  toggleChore,
}: PageProps) {
  const firstReminder = state.reminders[0];
  const firstRoutine = state.routines[0];
  const dashboardMetrics: RouteMetric[] = [
    {
      label: "Dinner path",
      value: bestRecipe ? bestRecipe.name : "Needs pantry data",
      note: bestRecipe ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients already align.` : "Add staples to unlock smarter dinner guidance.",
    },
    {
      label: "Budget reserve",
      value: `${savingsPercent}%`,
      note: `$${savingsAmount.toLocaleString()} currently protected for savings.`,
    },
    {
      label: "Household load",
      value: `${openChores} open`,
      note: `${state.reminders.length} reminders are shaping the family queue.`,
    },
  ];

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--dashboard family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Daily command view</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">A cleaner read on what deserves attention next.</h3>
          </div>
          <div className="family-route-chip">Dashboard</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          This page is now a true overview desk: dinner signal, budget posture, shared load, and the family queue show up in one fast scan before anyone dives deeper.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <RouteMetricStrip items={dashboardMetrics} />
          <div className="family-route-notice family-route-notice--dark">
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Quick switchboard</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => goToTab("meals")} className="family-btn family-btn-primary">
                Open meal planner
              </button>
              <button type="button" onClick={() => goToTab("budget")} className="family-btn family-btn-secondary">
                Open Budget Lab
              </button>
              <button type="button" onClick={() => goToTab("ai")} className="family-btn family-btn-ghost">
                Ask assistant
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-5 2xl:grid-cols-[1.04fr_0.96fr]">
        <InsightCard
          kicker="Tonight's dinner signal"
          title={bestRecipe ? bestRecipe.name : "Set the pantry stage"}
          body={
            bestRecipe
              ? `${bestRecipe.name} is the strongest current match based on what is already in the house. This makes dinner planning feel like a decision desk instead of a guess.`
              : "Add pantry items so the meal planner can stop guessing and start suggesting dinner from what the family actually has."
          }
          className="family-card family-card-dark family-grid-lines"
        >
          {bestRecipe ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {bestRecipe.ingredients.map((ingredient) => (
                <span key={ingredient} className="family-badge bg-white/10 text-stone-100">
                  {ingredient}
                </span>
              ))}
            </div>
          ) : null}
        </InsightCard>

        <div className="grid gap-5">
          <InsightCard
            kicker="Budget pulse"
            title="Reserve is holding steady."
            body={`${savingsPercent}% of income, or about $${savingsAmount.toLocaleString()} monthly, is currently being reserved.`}
            className="family-card family-card-gold"
          >
            <button type="button" onClick={() => goToTab("budget")} className="family-btn family-btn-secondary mt-5">
              Open Budget Lab
            </button>
          </InsightCard>

          <InsightCard
            kicker="Member snapshot"
            title={`${memberList.length} people are in the loop.`}
            body="Roles decide who can manage invites, settings, and access while everyone else stays focused on the family work."
            className="family-panel"
          >
            <div className="mt-5 flex flex-wrap gap-2">
              {memberList.slice(0, 4).map((member) => (
                <span key={member.id} className="family-badge family-badge-accent">
                  {member.name}
                </span>
              ))}
            </div>
          </InsightCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--dashboard family-animate-rise rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">Chore board</p>
              <h3 className="mt-3 font-serif text-4xl leading-tight">
                {completedChores}/{state.chores.length} complete
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
                  onClick={() => toggleChore(chore.id)}
                  className={`family-list-card w-full text-left ${chore.done ? "family-list-card-done" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{chore.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {chore.assignee} / {chore.frequency}
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
        </article>

        <div className="grid gap-5">
          <InsightCard
            kicker="Upcoming reminder"
            title={firstReminder ? firstReminder.title : "No reminder queued"}
            body={
              firstReminder
                ? `${firstReminder.when} for ${firstReminder.audience}.`
                : "Capture school items, pickup timing, or household resets so they do not disappear into memory."
            }
            className="family-panel family-surface-warm"
          />
          <InsightCard
            kicker="Latest routine"
            title={firstRoutine ? firstRoutine.name : "No shared routine yet"}
            body={
              firstRoutine
                ? `${firstRoutine.timeWindow}. ${firstRoutine.items.join(", ")}.`
                : "Add a repeatable routine so the household has a steady rhythm for resets and prep."
            }
            className="family-card family-card-soft"
          />
        </div>
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
  addChore,
  completedChores,
  toggleChore,
  reminderTitle,
  setReminderTitle,
  reminderWhen,
  setReminderWhen,
  reminderAudience,
  setReminderAudience,
  addReminder,
  removeReminder,
}: PageProps) {
  const openChores = state.chores.length - completedChores;

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--ops family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Operations board</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Assign, clear, and move the queue forward.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">Family Ops</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          This route is now shaped like a live execution board: create work, clear it, and keep reminders visible without leaving the operations surface.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <RouteMetricStrip
            tone="dark"
            items={[
              { label: "Open chores", value: `${openChores}`, note: `${completedChores} already finished.` },
              { label: "Reminder queue", value: `${state.reminders.length}`, note: "Shared family details stay visible here." },
              { label: "Available assignees", value: `${memberNames.length}`, note: "Roles are ready to share the load." },
            ]}
          />
          <div className="family-route-notice family-route-notice--gold">
            <p className="family-kicker family-eyebrow">Execution note</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Use chores for tangible work and reminders for time-bound details. This page is meant to make family execution feel lighter, not busier.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <InsightCard
          kicker="Chore composer"
          title="Plan the work at home."
          body="Add work quickly, assign it clearly, and keep the whole board moving from one focused panel."
          className="family-panel family-surface-accent"
        >
          <form className="mt-6 space-y-4" onSubmit={addChore}>
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
            <button type="submit" className="family-btn family-btn-primary">
              Add chore
            </button>
          </form>
        </InsightCard>

        <article className="family-panel family-route-board family-route-board--ops family-animate-rise rounded-[28px] p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">Today&apos;s chores</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Shared completion board.</h3>
            </div>
            <span className="family-badge family-badge-gold">{openChores} open</span>
          </div>
          <div className="mt-6 space-y-4">
            {state.chores.length > 0 ? (
              state.chores.map((chore) => (
                <button
                  key={chore.id}
                  type="button"
                  onClick={() => toggleChore(chore.id)}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${chore.done ? "border-[rgba(228,192,92,0.34)] bg-[rgba(250,241,210,0.86)]" : "border-[var(--line-soft)] bg-white/80 hover:border-[rgba(228,192,92,0.28)]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-2xl">{chore.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {chore.assignee} / {chore.frequency}
                      </p>
                    </div>
                    <span className={`family-badge ${chore.done ? "family-badge-accent" : "family-badge-gold"}`}>{chore.done ? "Done" : "Open"}</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState>Add the first chore to start building a shared completion board.</EmptyState>
            )}
          </div>
        </article>
      </div>

      <article className="family-panel family-animate-rise rounded-[30px] p-6 md:p-7">
        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="family-kicker family-eyebrow">Reminder composer</p>
            <h3 className="mt-4 font-serif text-4xl leading-tight">Add family reminders.</h3>
            <form className="mt-6 space-y-4" onSubmit={addReminder}>
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
              <button type="submit" className="family-btn family-btn-primary">
                Add reminder
              </button>
            </form>
          </div>

          <div className="family-route-column">
            <div>
              <p className="family-kicker family-eyebrow">Upcoming reminders</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Shared family queue.</h3>
            </div>
            <div className="mt-6 space-y-4">
              {state.reminders.length > 0 ? (
                state.reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-serif text-2xl">{reminder.title}</h4>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                          {reminder.when} / {reminder.audience}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeReminder(reminder.id)} className="family-btn family-btn-secondary px-3 py-2 text-xs uppercase tracking-[0.2em]">
                        Clear
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>No reminders yet. Add one for school items, pickup timing, or a weekly household reset.</EmptyState>
              )}
            </div>
          </div>
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
            <p className="family-kicker family-eyebrow">Pantry-first desk</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Plan meals from what is already in reach.</h3>
          </div>
          <div className="family-route-chip">Meal Planner</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          The meals route now feels like its own dinner studio: pantry entry, recipe coverage, and AI planning all sit inside one lower-waste planning flow.
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <InsightCard
            kicker="Pantry inventory"
            title="Feed the planner."
            body="Add ingredients once and let the page reuse them across recipe matching and AI planning."
            className="family-panel family-surface-warm"
          >
            <form className="mt-6 space-y-4" onSubmit={addPantryItems}>
              <label className="block text-sm font-medium text-stone-700">
                Add ingredients
                <input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Tomatoes, rice, tortillas" className="family-input mt-2" />
              </label>
              <button type="submit" className="family-btn family-btn-primary">
                Add pantry items
              </button>
            </form>
          </InsightCard>

          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="family-route-notice family-route-notice--dark">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Current edge</p>
              <h4 className="mt-4 font-serif text-3xl text-white">{bestRecipe ? bestRecipe.name : "No pantry leader yet"}</h4>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                {bestRecipe
                  ? `${bestRecipe.matches}/${bestRecipe.ingredients.length} ingredients are already covered. Missing: ${bestRecipe.missing.length > 0 ? bestRecipe.missing.join(", ") : "nothing extra needed"}.`
                  : "Once the pantry has a few staples, this route becomes the fastest path from ingredients to dinner."}
              </p>
            </div>
            <div className="family-route-notice family-route-notice--gold">
              <p className="family-kicker family-eyebrow">AI planning</p>
              <h4 className="mt-4 font-serif text-3xl leading-tight">Turn pantry context into a multi-day plan.</h4>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Generate a plan and this page will add shopping needs, prep notes, and dinner sequencing automatically.</p>
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
              <p className="family-kicker family-eyebrow">Recipe suggestions</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Pantry-aware matches.</h3>
            </div>
            <span className="family-badge family-badge-gold">{state.pantry.length} pantry items</span>
          </div>
          <div className="mt-6 space-y-4">
            {recipeMatches.map((recipe) => (
              <article key={recipe.name} className="rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
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

        <article className="family-panel family-route-board family-route-board--meals-accent family-animate-rise rounded-[30px] p-6 md:p-7">
          <p className="family-kicker family-eyebrow">AI meal planner</p>
          {state.latestMealPlan ? (
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="font-serif text-4xl leading-tight">{state.latestMealPlan.headline}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{state.latestMealPlan.summary}</p>
              </div>
              <div className="space-y-4">
                {state.latestMealPlan.meals.map((meal) => (
                  <div key={`${meal.day}-${meal.recipe}`} className="rounded-[24px] border border-[var(--line-soft)] bg-white/76 p-5">
                    <p className="family-kicker family-eyebrow">{meal.day}</p>
                    <h4 className="mt-3 font-serif text-2xl">{meal.recipe}</h4>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{meal.whyItFits}</p>
                    <p className="mt-4 text-sm leading-6 text-stone-700">Uses: {meal.usesIngredients.join(", ")}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Missing: {meal.missingIngredients.length > 0 ? meal.missingIngredients.join(", ") : "Nothing extra needed"}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Prep note: {meal.prepNote}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[24px] border border-[var(--line-soft)] bg-white/76 p-5">
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
            <p className="family-kicker family-eyebrow">Money briefing</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Give the monthly plan its own clear room.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">Budget Lab</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          Budget Lab is now more obviously its own planning studio: inputs, allocations, and AI guidance stay grouped around one money decision flow.
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
        <InsightCard
          kicker="Planner inputs"
          title="Build a family spending plan."
          body="These controls stay together so the financial posture is easy to adjust without scanning through unrelated cards."
          className="family-panel"
        >
          <div className="mt-6 space-y-4">
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
        </InsightCard>

        <article className="family-panel family-route-board family-route-board--budget family-animate-rise rounded-[28px] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="family-kicker family-eyebrow">Suggested allocation</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Current monthly split.</h3>
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

      <article className="family-panel family-animate-rise rounded-[28px] p-6 md:p-7">
        <p className="family-kicker family-eyebrow">AI budget coach</p>
        {state.latestBudgetCoach ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-4xl leading-tight">Budget guidance for this household.</h3>
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
          <EmptyState className="mt-4">Generate budget coaching and the assistant will review the current household plan and suggest next actions.</EmptyState>
        )}
      </article>
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
  ownerCount,
  adminCount,
}: PageProps) {
  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--family family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Access and identity</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">A cleaner home for members, invites, and routines.</h3>
          </div>
          <div className="family-route-chip">Family Room</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Family Room is now structured like a workspace admin suite instead of a leftover settings area, while still keeping every existing role and household action intact.
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
            <p className="family-kicker family-eyebrow">Role model</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Owners can change roles. Admins can remove standard members. Everyone else stays focused on the shared family workspace.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--family family-animate-rise rounded-[28px] p-6 md:p-7">
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
          <InsightCard
            kicker="Household settings"
            title="Invite and identity controls."
            body="Share the invite code so relatives join this same workspace. Owners and admins can update these settings."
            className="family-panel family-surface-warm"
          >
            <form className="mt-5 space-y-4" onSubmit={saveHouseholdDetails}>
              <label className="block text-sm font-medium text-stone-700">
                Household name
                <input
                  value={householdNameInput}
                  onChange={(event) => setHouseholdNameInput(event.target.value)}
                  disabled={!canManageHousehold || savingHouseholdName}
                  className="family-input mt-2 disabled:cursor-not-allowed disabled:bg-stone-100"
                />
              </label>
              <button type="submit" disabled={!canManageHousehold || savingHouseholdName} className="family-btn family-btn-primary">
                {savingHouseholdName ? "Saving..." : "Save household name"}
              </button>
            </form>
            <div className="mt-5 rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5 text-center">
              <p className="family-kicker family-eyebrow">Invite code</p>
              <p className="mt-4 font-serif text-4xl tracking-[0.3em] text-stone-900">{inviteCode}</p>
            </div>
            <button type="button" onClick={rotateInviteCode} disabled={!canManageHousehold || rotatingInvite} className="family-btn family-btn-secondary mt-5">
              {rotatingInvite ? "Refreshing..." : "Generate new invite code"}
            </button>
          </InsightCard>

          <InsightCard
            kicker="Routine pulse"
            title={state.routines[0] ? state.routines[0].name : "No routine built yet"}
            body={
              state.routines[0]
                ? `${state.routines[0].timeWindow}. ${state.routines[0].items.join(", ")}.`
                : "Add the first routine here so the family has one repeatable flow it can keep returning to."
            }
            className="family-card family-card-gold"
          />
        </div>
      </div>

      <article className="family-panel family-surface-accent family-animate-rise rounded-[28px] p-6 md:p-7">
        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="family-kicker family-eyebrow">Routine builder</p>
            <h3 className="mt-4 font-serif text-4xl leading-tight">Add a shared routine.</h3>
            <form className="mt-5 space-y-4" onSubmit={addRoutine}>
              <label className="block text-sm font-medium text-stone-700">
                Routine name
                <input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Saturday reset" className="family-input mt-2" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Time window
                <input value={routineTimeWindow} onChange={(event) => setRoutineTimeWindow(event.target.value)} placeholder="9:00 AM - 10:30 AM" className="family-input mt-2" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Checklist items
                <input value={routineItems} onChange={(event) => setRoutineItems(event.target.value)} placeholder="Laundry, wipe counters, prep snacks" className="family-input mt-2" />
              </label>
              <button type="submit" className="family-btn family-btn-primary">
                Add routine
              </button>
            </form>
          </div>

          <div className="family-route-column">
            <div>
              <p className="family-kicker family-eyebrow">Existing routines</p>
              <h3 className="mt-4 font-serif text-4xl leading-tight">Repeatable family rhythms.</h3>
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
      </article>
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
}: PageProps) {
  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--ai family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Private planning studio</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Let the assistant synthesize the whole household.</h3>
          </div>
          <div className="family-route-chip family-route-chip--dark">AI Studio</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200">
          AI Studio is now framed as a real strategy room instead of a generic chat pane, while still using the same live household data and actions underneath.
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
            <p className="family-kicker family-eyebrow">Best use</p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Use this route when the family needs synthesis: turning meals, money, reminders, and chores into one practical weekly plan.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.96fr]">
        <article className="family-panel family-route-board family-route-board--ai family-animate-rise rounded-[28px] p-6 md:p-7">
          <p className="family-kicker family-eyebrow">AI Studio</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight">Talk to the family assistant.</h3>
          <div className="mt-6 space-y-4">
            <div className="family-scroll max-h-[460px] space-y-3 overflow-y-auto rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.55)] p-4">
              {state.assistantHistory.length > 0 ? (
                state.assistantHistory.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rounded-[20px] px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "family-chat-assistant" : "family-chat-user"}`}>
                    <p className="family-kicker opacity-70">{message.role === "assistant" ? "FamilyFlow AI" : "You"}</p>
                    <p className="mt-2">{message.content}</p>
                  </div>
                ))
              ) : (
                <EmptyState>Start the conversation with a weekly planning question, a school-night reset, or a pantry-to-dinner request.</EmptyState>
              )}
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleAssistantPrompt(chatInput);
              }}
            >
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                rows={4}
                placeholder="Ask for a weekly plan, meal help, school-night reset, or reminder strategy."
                className="family-textarea mt-2"
              />
              <button type="submit" disabled={aiTask !== null} className="family-btn family-btn-primary">
                {aiTask === "assistant" ? "Thinking..." : "Send to assistant"}
              </button>
            </form>
          </div>
        </article>

        <div className="space-y-5">
          <InsightCard
            kicker="Quick prompts"
            title="Start with a useful question."
            body="These prompts keep the assistant grounded in actionable household planning instead of abstract brainstorming."
            className="family-panel family-surface-warm"
          >
            <div className="mt-5 grid gap-3">
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
          </InsightCard>

          <InsightCard
            kicker="Shared context"
            title="What the assistant sees."
            body="The assistant is working from live household context, not a blank prompt box."
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
