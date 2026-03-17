import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";

import {
  cloneDefaultState,
  type AppState,
  type BudgetCoach,
  type FamilyAchievement,
  type MealPlan,
  type MemberProfile,
  syncStateWithMembers,
} from "@/lib/familyflow";
import { db } from "@/lib/db";

export type HouseholdRole = "owner" | "admin" | "member";

export type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  role: HouseholdRole;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  householdName?: string;
  inviteCode?: string;
};

type AttachHouseholdInput =
  | { userId: string; householdName: string }
  | { userId: string; inviteCode: string };

type HouseholdRecord = {
  id: string;
  name: string;
  inviteCode: string;
  pantryJson: string;
  budgetIncome: number;
  budgetFamilySize: number;
  budgetGoal: string;
  budgetStyle: string;
  choresJson: string;
  remindersJson: string;
  routinesJson: string;
  memberProfilesJson: string;
  familyAchievementsJson: string;
  assistantHistoryJson: string;
  latestMealPlanJson: string | null;
  latestBudgetCoachJson: string | null;
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
    memberProfilesJson: JSON.stringify(baseState.memberProfiles),
    familyAchievementsJson: JSON.stringify(baseState.familyAchievements),
    assistantHistoryJson: JSON.stringify(baseState.assistantHistory),
    latestMealPlanJson: baseState.latestMealPlan ? JSON.stringify(baseState.latestMealPlan) : null,
    latestBudgetCoachJson: baseState.latestBudgetCoach ? JSON.stringify(baseState.latestBudgetCoach) : null,
  };
}

export function householdToAppState(household: HouseholdRecord): AppState {
  const defaults = cloneDefaultState();

  return {
    pantry: safeParse(household.pantryJson, defaults.pantry),
    budget: {
      income: household.budgetIncome,
      familySize: household.budgetFamilySize,
      goal: household.budgetGoal as AppState["budget"]["goal"],
      style: household.budgetStyle as AppState["budget"]["style"],
    },
    chores: safeParse(household.choresJson, defaults.chores),
    reminders: safeParse(household.remindersJson, defaults.reminders),
    routines: safeParse(household.routinesJson, defaults.routines),
    memberProfiles: safeParse<MemberProfile[]>(household.memberProfilesJson, defaults.memberProfiles),
    familyAchievements: safeParse<FamilyAchievement[]>(household.familyAchievementsJson, defaults.familyAchievements),
    assistantHistory: safeParse(household.assistantHistoryJson, defaults.assistantHistory),
    latestMealPlan: safeParse<MealPlan | null>(household.latestMealPlanJson, null),
    latestBudgetCoach: safeParse<BudgetCoach | null>(household.latestBudgetCoachJson, null),
  };
}

async function listHouseholdMembers(householdId: string) {
  const memberships = await db.membership.findMany({
    where: { householdId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role as HouseholdRole,
  })) satisfies HouseholdMember[];
}

async function getMembershipForUser(userId: string) {
  return db.membership.findFirst({
    where: { userId },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });
}

async function getMemberInHousehold(householdId: string, memberId: string) {
  return db.membership.findUnique({
    where: {
      userId_householdId: {
        userId: memberId,
        householdId,
      },
    },
    include: { user: true },
  });
}

async function findHouseholdByInviteCode(inviteCode: string) {
  return db.household.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
  });
}

async function requireMembership(userId: string) {
  const membership = await getMembershipForUser(userId);
  if (!membership) {
    throw new Error("Workspace membership was not found.");
  }

  return membership;
}

function canManageHousehold(role: HouseholdRole) {
  return role === "owner" || role === "admin";
}

function canManageRole(actorRole: HouseholdRole, targetRole: HouseholdRole) {
  return actorRole === "owner" && targetRole !== "owner";
}

function canRemoveMember(actorRole: HouseholdRole, targetRole: HouseholdRole) {
  if (targetRole === "owner") {
    return false;
  }

  if (actorRole === "owner") {
    return true;
  }

  return actorRole === "admin" && targetRole === "member";
}

export async function saveHouseholdState(householdId: string, state: AppState) {
  const payload = householdStatePayload(state);

  await db.household.update({
    where: { id: householdId },
    data: {
      pantryJson: payload.pantryJson,
      budgetIncome: payload.budgetIncome,
      budgetFamilySize: payload.budgetFamilySize,
      budgetGoal: payload.budgetGoal,
      budgetStyle: payload.budgetStyle,
      choresJson: payload.choresJson,
      remindersJson: payload.remindersJson,
      routinesJson: payload.routinesJson,
      memberProfilesJson: payload.memberProfilesJson,
      familyAchievementsJson: payload.familyAchievementsJson,
      assistantHistoryJson: payload.assistantHistoryJson,
      latestMealPlanJson: payload.latestMealPlanJson,
      latestBudgetCoachJson: payload.latestBudgetCoachJson,
      updatedAt: new Date(),
    },
  });
}

export async function regenerateInviteCode(householdId: string) {
  const nextCode = generateInviteCode();

  await db.household.update({
    where: { id: householdId },
    data: {
      inviteCode: nextCode,
      updatedAt: new Date(),
    },
  });

  return nextCode;
}

export async function updateHouseholdName(userId: string, name: string) {
  const membership = await requireMembership(userId);
  if (!canManageHousehold(membership.role as HouseholdRole)) {
    throw new Error("Only household owners or admins can update household settings.");
  }

  const nextName = name.trim();
  if (!nextName) {
    throw new Error("Household name is required.");
  }

  await db.household.update({
    where: { id: membership.householdId },
    data: {
      name: nextName,
      updatedAt: new Date(),
    },
  });

  return nextName;
}

export async function regenerateInviteCodeForUser(userId: string) {
  const membership = await requireMembership(userId);
  if (!canManageHousehold(membership.role as HouseholdRole)) {
    throw new Error("Only household owners or admins can regenerate invite codes.");
  }

  return regenerateInviteCode(membership.householdId);
}

export async function updateMemberRole(userId: string, memberId: string, nextRole: HouseholdRole) {
  if (nextRole === "owner") {
    throw new Error("Ownership transfer is not available in this build.");
  }

  const membership = await requireMembership(userId);
  if (memberId === userId) {
    throw new Error("Change another member's role instead of your own.");
  }

  const target = await getMemberInHousehold(membership.householdId, memberId);
  if (!target) {
    throw new Error("That household member was not found.");
  }

  if (!canManageRole(membership.role as HouseholdRole, target.role as HouseholdRole)) {
    throw new Error("Only the household owner can change member roles.");
  }

  await db.membership.update({
    where: {
      userId_householdId: {
        userId: memberId,
        householdId: membership.householdId,
      },
    },
    data: { role: nextRole },
  });

  return listHouseholdMembers(membership.householdId);
}

export async function removeMemberFromHousehold(userId: string, memberId: string) {
  const membership = await requireMembership(userId);
  if (memberId === userId) {
    throw new Error("Use your own account settings to leave a household.");
  }

  const target = await getMemberInHousehold(membership.householdId, memberId);
  if (!target) {
    throw new Error("That household member was not found.");
  }

  if (!canRemoveMember(membership.role as HouseholdRole, target.role as HouseholdRole)) {
    throw new Error("You do not have permission to remove that member.");
  }

  await db.membership.delete({
    where: {
      userId_householdId: {
        userId: memberId,
        householdId: membership.householdId,
      },
    },
  });

  return listHouseholdMembers(membership.householdId);
}

export async function getWorkspaceForUser(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return null;
  }

  const members = await listHouseholdMembers(membership.household.id);
  const state = syncStateWithMembers(householdToAppState(membership.household), members);

  return {
    currentUserId: userId,
    householdId: membership.household.id,
    householdName: membership.household.name,
    inviteCode: membership.household.inviteCode,
    role: membership.role as HouseholdRole,
    members,
    state,
  };
}

export async function attachUserToHousehold(input: AttachHouseholdInput) {
  const existingMembership = await getMembershipForUser(input.userId);
  if (existingMembership) {
    throw new Error("This account is already linked to a household.");
  }

  const createdAt = new Date();

  await db.$transaction(async (tx) => {
    if ("inviteCode" in input) {
      const joinedHousehold = await tx.household.findUnique({
        where: { inviteCode: input.inviteCode.trim().toUpperCase() },
      });

      if (!joinedHousehold) {
        throw new Error("That household invite code was not found.");
      }

      await tx.membership.create({
        data: {
          id: randomUUID(),
          userId: input.userId,
          householdId: joinedHousehold.id,
          role: "member",
          createdAt,
        },
      });

      return;
    }

    const householdId = randomUUID();
    const payload = householdStatePayload(cloneDefaultState());

    await tx.household.create({
      data: {
        id: householdId,
        name: input.householdName.trim(),
        inviteCode: generateInviteCode(),
        pantryJson: payload.pantryJson,
        budgetIncome: payload.budgetIncome,
        budgetFamilySize: payload.budgetFamilySize,
        budgetGoal: payload.budgetGoal,
        budgetStyle: payload.budgetStyle,
        choresJson: payload.choresJson,
        remindersJson: payload.remindersJson,
        routinesJson: payload.routinesJson,
        memberProfilesJson: payload.memberProfilesJson,
        familyAchievementsJson: payload.familyAchievementsJson,
        assistantHistoryJson: payload.assistantHistoryJson,
        latestMealPlanJson: payload.latestMealPlanJson,
        latestBudgetCoachJson: payload.latestBudgetCoachJson,
        createdAt,
        updatedAt: createdAt,
      },
    });

    await tx.membership.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        householdId,
        role: "owner",
        createdAt,
      },
    });
  });

  return getWorkspaceForUser(input.userId);
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const joinedHousehold = input.inviteCode ? await findHouseholdByInviteCode(input.inviteCode) : undefined;
  if (input.inviteCode && !joinedHousehold) {
    throw new Error("That household invite code was not found.");
  }

  const createdAt = new Date();
  const passwordHash = await hash(input.password, 10);

  await db.$transaction(async (tx) => {
    const userId = randomUUID();

    await tx.user.create({
      data: {
        id: userId,
        name: input.name.trim(),
        email,
        passwordHash,
        createdAt,
        updatedAt: createdAt,
      },
    });

    let householdId = joinedHousehold?.id;

    if (!householdId) {
      householdId = randomUUID();
      const payload = householdStatePayload(cloneDefaultState());

      await tx.household.create({
        data: {
          id: householdId,
          name: input.householdName?.trim() || `${input.name.trim()}'s household`,
          inviteCode: generateInviteCode(),
          pantryJson: payload.pantryJson,
          budgetIncome: payload.budgetIncome,
          budgetFamilySize: payload.budgetFamilySize,
          budgetGoal: payload.budgetGoal,
          budgetStyle: payload.budgetStyle,
          choresJson: payload.choresJson,
          remindersJson: payload.remindersJson,
          routinesJson: payload.routinesJson,
          memberProfilesJson: payload.memberProfilesJson,
          familyAchievementsJson: payload.familyAchievementsJson,
          assistantHistoryJson: payload.assistantHistoryJson,
          latestMealPlanJson: payload.latestMealPlanJson,
          latestBudgetCoachJson: payload.latestBudgetCoachJson,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }

    await tx.membership.create({
      data: {
        id: randomUUID(),
        userId,
        householdId,
        role: joinedHousehold ? "member" : "owner",
        createdAt,
      },
    });
  });
}
