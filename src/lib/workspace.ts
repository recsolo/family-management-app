import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";

import {
  cloneDefaultState,
  type AppState,
  type BudgetCoach,
  type MealPlan,
} from "@/lib/familyflow";
import { db } from "@/lib/db";

export type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type HouseholdRow = {
  id: string;
  name: string;
  invite_code: string;
  pantry_json: string;
  budget_income: number;
  budget_family_size: number;
  budget_goal: string;
  budget_style: string;
  chores_json: string;
  reminders_json: string;
  routines_json: string;
  assistant_history_json: string;
  latest_meal_plan_json: string | null;
  latest_budget_coach_json: string | null;
  role: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  householdName?: string;
  inviteCode?: string;
};

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function householdStatePayload(baseState: AppState) {
  return {
    pantryJson: JSON.stringify(baseState.pantry),
    budgetIncome: baseState.budget.income,
    budgetFamilySize: baseState.budget.familySize,
    budgetGoal: baseState.budget.goal,
    budgetStyle: baseState.budget.style,
    choresJson: JSON.stringify(baseState.chores),
    remindersJson: JSON.stringify(baseState.reminders),
    routinesJson: JSON.stringify(baseState.routines),
    assistantHistoryJson: JSON.stringify(baseState.assistantHistory),
    latestMealPlanJson: baseState.latestMealPlan ? JSON.stringify(baseState.latestMealPlan) : null,
    latestBudgetCoachJson: baseState.latestBudgetCoach ? JSON.stringify(baseState.latestBudgetCoach) : null,
  };
}

export function householdToAppState(household: HouseholdRow): AppState {
  const defaults = cloneDefaultState();

  return {
    pantry: safeParse(household.pantry_json, defaults.pantry),
    budget: {
      income: household.budget_income,
      familySize: household.budget_family_size,
      goal: household.budget_goal as AppState["budget"]["goal"],
      style: household.budget_style as AppState["budget"]["style"],
    },
    chores: safeParse(household.chores_json, defaults.chores),
    reminders: safeParse(household.reminders_json, defaults.reminders),
    routines: safeParse(household.routines_json, defaults.routines),
    assistantHistory: safeParse(household.assistant_history_json, defaults.assistantHistory),
    latestMealPlan: safeParse<MealPlan | null>(household.latest_meal_plan_json, null),
    latestBudgetCoach: safeParse<BudgetCoach | null>(household.latest_budget_coach_json, null),
  };
}

function listHouseholdMembers(householdId: string) {
  const statement = db.prepare(`
    SELECT users.id, users.name, users.email, memberships.role
    FROM memberships
    INNER JOIN users ON users.id = memberships.user_id
    WHERE memberships.household_id = ?
    ORDER BY memberships.created_at ASC
  `);

  return statement.all(householdId) as HouseholdMember[];
}

export async function saveHouseholdState(householdId: string, state: AppState) {
  const payload = householdStatePayload(state);
  const statement = db.prepare(`
    UPDATE households
    SET pantry_json = ?, budget_income = ?, budget_family_size = ?, budget_goal = ?, budget_style = ?, chores_json = ?, reminders_json = ?, routines_json = ?, assistant_history_json = ?, latest_meal_plan_json = ?, latest_budget_coach_json = ?, updated_at = ?
    WHERE id = ?
  `);

  statement.run(
    payload.pantryJson,
    payload.budgetIncome,
    payload.budgetFamilySize,
    payload.budgetGoal,
    payload.budgetStyle,
    payload.choresJson,
    payload.remindersJson,
    payload.routinesJson,
    payload.assistantHistoryJson,
    payload.latestMealPlanJson,
    payload.latestBudgetCoachJson,
    nowIso(),
    householdId,
  );
}

export async function regenerateInviteCode(householdId: string) {
  const nextCode = generateInviteCode();
  db.prepare("UPDATE households SET invite_code = ?, updated_at = ? WHERE id = ?").run(nextCode, nowIso(), householdId);
  return nextCode;
}

export async function getWorkspaceForUser(userId: string) {
  const statement = db.prepare(`
    SELECT households.*, memberships.role
    FROM memberships
    INNER JOIN households ON households.id = memberships.household_id
    WHERE memberships.user_id = ?
    LIMIT 1
  `);

  const household = statement.get(userId) as HouseholdRow | undefined;
  if (!household) {
    return null;
  }

  return {
    householdId: household.id,
    householdName: household.name,
    inviteCode: household.invite_code,
    role: household.role,
    members: listHouseholdMembers(household.id),
    state: householdToAppState(household),
  };
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(email) as { id: string } | undefined;
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const joinedHousehold = input.inviteCode
    ? (db.prepare("SELECT * FROM households WHERE invite_code = ? LIMIT 1").get(input.inviteCode.trim().toUpperCase()) as HouseholdRow | undefined)
    : undefined;

  if (input.inviteCode && !joinedHousehold) {
    throw new Error("That household invite code was not found.");
  }

  const passwordHash = await hash(input.password, 10);
  const userId = randomUUID();
  const membershipId = randomUUID();
  const createdAt = nowIso();

  db.exec("BEGIN TRANSACTION");

  try {
    db.prepare("INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      userId,
      input.name.trim(),
      email,
      passwordHash,
      createdAt,
      createdAt,
    );

    let householdId = joinedHousehold?.id;

    if (!householdId) {
      const household = cloneDefaultState();
      const payload = householdStatePayload(household);
      householdId = randomUUID();
      db.prepare(`
        INSERT INTO households (id, name, invite_code, pantry_json, budget_income, budget_family_size, budget_goal, budget_style, chores_json, reminders_json, routines_json, assistant_history_json, latest_meal_plan_json, latest_budget_coach_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        householdId,
        input.householdName?.trim() || `${input.name.trim()}'s household`,
        generateInviteCode(),
        payload.pantryJson,
        payload.budgetIncome,
        payload.budgetFamilySize,
        payload.budgetGoal,
        payload.budgetStyle,
        payload.choresJson,
        payload.remindersJson,
        payload.routinesJson,
        payload.assistantHistoryJson,
        payload.latestMealPlanJson,
        payload.latestBudgetCoachJson,
        createdAt,
        createdAt,
      );
    }

    db.prepare("INSERT INTO memberships (id, user_id, household_id, role, created_at) VALUES (?, ?, ?, ?, ?)").run(
      membershipId,
      userId,
      householdId,
      joinedHousehold ? "member" : "owner",
      createdAt,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
