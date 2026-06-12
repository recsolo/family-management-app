import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";

import { isAccountEmailConfigured } from "@/lib/account-security";
import {
  type AppNotification,
  cloneDefaultState,
  type AppState,
  type BudgetCoach,
  type DirectThread,
  type FamilyAchievement,
  type FamilyQuestBoard,
  type GameRoomState,
  type MealPlan,
  type MemberProfile,
  type PartnerSpace,
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

type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  verificationRequired: boolean;
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
  directThreadsJson: string;
  partnerSpaceJson: string | null;
  notificationsJson: string;
  familyQuestBoardJson: string;
  gameRoomJson: string;
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

/* No 0/O/1/I/L to keep codes easy to read aloud and retype. */
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateInviteCode() {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) {
    code += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length];
  }

  return code;
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
    directThreadsJson: JSON.stringify(baseState.directThreads),
    partnerSpaceJson: baseState.partnerSpace ? JSON.stringify(baseState.partnerSpace) : null,
    notificationsJson: JSON.stringify(baseState.notifications),
    familyQuestBoardJson: JSON.stringify(baseState.familyQuestBoard),
    gameRoomJson: JSON.stringify(baseState.gameRoom),
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
    directThreads: safeParse<DirectThread[]>(household.directThreadsJson, defaults.directThreads),
    partnerSpace: safeParse<PartnerSpace | null>(household.partnerSpaceJson, defaults.partnerSpace),
    notifications: safeParse<AppNotification[]>(household.notificationsJson, defaults.notifications),
    familyQuestBoard: safeParse<FamilyQuestBoard>(household.familyQuestBoardJson, defaults.familyQuestBoard),
    gameRoom: safeParse<GameRoomState>(household.gameRoomJson, defaults.gameRoom),
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

export async function getMembershipForUser(userId: string) {
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

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
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
      directThreadsJson: payload.directThreadsJson,
      partnerSpaceJson: payload.partnerSpaceJson,
      notificationsJson: payload.notificationsJson,
      familyQuestBoardJson: payload.familyQuestBoardJson,
      gameRoomJson: payload.gameRoomJson,
      assistantHistoryJson: payload.assistantHistoryJson,
      latestMealPlanJson: payload.latestMealPlanJson,
      latestBudgetCoachJson: payload.latestBudgetCoachJson,
      updatedAt: new Date(),
    },
  });
}

export async function regenerateInviteCode(householdId: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextCode = generateInviteCode();

    try {
      await db.household.update({
        where: { id: householdId },
        data: {
          inviteCode: nextCode,
          updatedAt: new Date(),
        },
      });

      return nextCode;
    } catch (error) {
      // P2002 = unique-constraint collision on inviteCode; retry with a new code.
      if ((error as { code?: string }).code === "P2002") {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
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
  const createdAt = new Date();

  await db.$transaction(async (tx) => {
    // Checked inside the transaction so two concurrent bootstrap calls
    // cannot both pass and create duplicate memberships/orphan households.
    const existingMembership = await tx.membership.findFirst({
      where: { userId: input.userId },
    });
    if (existingMembership) {
      throw new Error("This account is already linked to a household.");
    }

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
        directThreadsJson: payload.directThreadsJson,
        partnerSpaceJson: payload.partnerSpaceJson,
        notificationsJson: payload.notificationsJson,
        familyQuestBoardJson: payload.familyQuestBoardJson,
        gameRoomJson: payload.gameRoomJson,
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

export async function registerUser(input: RegisterInput): Promise<RegisteredUser> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const joinedHousehold = input.inviteCode ? await findHouseholdByInviteCode(input.inviteCode) : undefined;
  if (input.inviteCode && !joinedHousehold) {
    throw new Error("That household invite code was not found.");
  }

  const createdAt = new Date();
  const passwordHash = await hash(input.password, 10);
  const verificationRequired = isAccountEmailConfigured();
  let createdUser: RegisteredUser | null = null;

  await db.$transaction(async (tx) => {
    const userId = randomUUID();

    await tx.user.create({
      data: {
        id: userId,
        name: input.name.trim(),
        email,
        passwordHash,
        emailVerifiedAt: verificationRequired ? null : createdAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    createdUser = {
      id: userId,
      name: input.name.trim(),
      email,
      verificationRequired,
    };

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
            directThreadsJson: payload.directThreadsJson,
            partnerSpaceJson: payload.partnerSpaceJson,
            notificationsJson: payload.notificationsJson,
            familyQuestBoardJson: payload.familyQuestBoardJson,
            gameRoomJson: payload.gameRoomJson,
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

  if (!createdUser) {
    throw new Error("Account creation did not finish.");
  }

  return createdUser;
}
