export type Recipe = {
  name: string;
  description: string;
  ingredients: string[];
  tags: string[];
};

export type BudgetGoal = "stability" | "savings" | "debt";
export type BudgetStyle = "balanced" | "lean" | "comfort";

export type Chore = {
  id: string;
  title: string;
  assignee: string;
  frequency: string;
  done: boolean;
};

export type Reminder = {
  id: string;
  title: string;
  when: string;
  audience: string;
};

export type Routine = {
  id: string;
  name: string;
  timeWindow: string;
  items: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
};

export type DirectThread = {
  id: string;
  participantIds: string[];
  messages: DirectMessage[];
};

export type AppNotificationKind = "message" | "partner" | "reminder" | "goal" | "reward" | "calendar" | "achievement" | "system";

export type AppNotification = {
  id: string;
  recipientUserId: string;
  actorId: string | null;
  actorName: string;
  kind: AppNotificationKind;
  title: string;
  detail: string;
  link: string;
  createdAt: string;
  readAt: string | null;
};

export type MealPlan = {
  headline: string;
  summary: string;
  meals: Array<{
    day: string;
    recipe: string;
    whyItFits: string;
    usesIngredients: string[];
    missingIngredients: string[];
    prepNote: string;
  }>;
  shoppingList: string[];
};

export type BudgetCoach = {
  summary: string;
  wins: string[];
  watchouts: string[];
  nextSteps: string[];
};

export type FitnessLog = {
  date: string;
  steps: number;
  movementMinutes: number;
  waterCups: number;
  sleepHours: number;
  note: string;
};

export type MemberGoal = {
  id: string;
  title: string;
  detail: string;
  category: string;
  targetDate: string;
  points: number;
  status: "active" | "done";
  completedAt: string | null;
  sharedAt: string | null;
};

export type MemberReward = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  redemptions: number;
  lastRedeemedAt: string | null;
};

export type ProfileUpload = {
  id: string;
  kind: "avatar" | "memory";
  title: string;
  note: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
};

export type ProfileCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  detail: string;
};

export type MemberProfile = {
  memberId: string;
  headline: string;
  about: string;
  weatherLocation: string;
  fitnessLogs: FitnessLog[];
  goals: MemberGoal[];
  rewards: MemberReward[];
  uploads: ProfileUpload[];
  avatarUploadId: string | null;
  calendarEvents: ProfileCalendarEvent[];
  pointsBalance: number;
  lifetimePoints: number;
};

export type FamilyAchievement = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  detail: string;
  points: number;
  createdAt: string;
  kind: "goal" | "reward" | "fitness" | "shoutout";
};

export type PartnerReward = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  createdByMemberId: string;
  createdByName: string;
  redemptions: number;
  lastRedeemedAt: string | null;
};

export type DateNightPlan = {
  id: string;
  title: string;
  when: string;
  location: string;
  detail: string;
  budget: string;
  status: "idea" | "planned" | "booked";
};

export type ConnectionNote = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
};

export type PartnerSpace = {
  memberIds: string[];
  messages: DirectMessage[];
  privateRewards: PartnerReward[];
  datePlans: DateNightPlan[];
  connectionNotes: ConnectionNote[];
};

export type AppState = {
  pantry: string[];
  budget: {
    income: number;
    familySize: number;
    goal: BudgetGoal;
    style: BudgetStyle;
  };
  chores: Chore[];
  reminders: Reminder[];
  routines: Routine[];
  assistantHistory: ChatMessage[];
  latestMealPlan: MealPlan | null;
  latestBudgetCoach: BudgetCoach | null;
  memberProfiles: MemberProfile[];
  familyAchievements: FamilyAchievement[];
  directThreads: DirectThread[];
  partnerSpace: PartnerSpace | null;
  notifications: AppNotification[];
};

type MemberSeed = {
  id: string;
  name: string;
};

export const STORAGE_KEY = "familyflow-next-stage3";
export const LEGACY_STORAGE_KEYS = ["familyflow-next-stage3", "familyflow-next-stage2", "familyflow-next-stage1"];

export const RECIPES: Recipe[] = [
  {
    name: "Garlic Chicken Rice Bowls",
    description: "Fast weeknight bowls with tender chicken, broccoli, and pantry staples.",
    ingredients: ["chicken", "rice", "broccoli", "garlic", "soy sauce"],
    tags: ["30 min", "high protein"],
  },
  {
    name: "Pantry Tomato Pasta Bake",
    description: "Comfort-food pasta with tomatoes, cheese, and easy leftovers.",
    ingredients: ["pasta", "tomatoes", "cheese", "garlic"],
    tags: ["leftovers", "kid friendly"],
  },
  {
    name: "Veggie Fried Rice",
    description: "A flexible clean-out-the-fridge dinner built around leftover rice.",
    ingredients: ["rice", "eggs", "broccoli", "carrots", "garlic"],
    tags: ["low waste", "quick"],
  },
  {
    name: "Loaded Quesadillas",
    description: "Easy skillet quesadillas that work with whatever protein and vegetables you have.",
    ingredients: ["tortillas", "cheese", "chicken", "beans", "tomatoes"],
    tags: ["customizable", "family style"],
  },
];

export const FAMILY_MEMBERS = ["Jordan", "Avery", "Mia", "Noah"];

export const FAMILY_PROFILES = [
  "Jordan, parent: school pickup and sports logistics",
  "Avery, parent: grocery runs and meal prep",
  "Mia, age 11: soccer practice on Tuesdays",
  "Noah, age 7: peanut-free lunch needs",
];

export const FAMILY_NEEDS = [
  "Weeknight dinners should stay under 35 minutes.",
  "Keep school lunches planned four days ahead.",
  "Reserve money monthly for activities and savings.",
];

const DEFAULT_REWARDS: Array<Pick<MemberReward, "title" | "detail" | "cost">> = [
  {
    title: "Pick dessert night",
    detail: "Choose the treat for one family night.",
    cost: 20,
  },
  {
    title: "Pick the movie",
    detail: "Choose the next family movie or show.",
    cost: 40,
  },
  {
    title: "Choose a fun outing",
    detail: "Pick a small family adventure or special stop.",
    cost: 75,
  },
];

export const DEFAULT_STATE: AppState = {
  pantry: ["chicken", "rice", "broccoli", "garlic", "tomatoes", "pasta", "cheese"],
  budget: {
    income: 6200,
    familySize: 4,
    goal: "savings",
    style: "balanced",
  },
  chores: [
    { id: "chore-1", title: "Empty dishwasher", assignee: "Jordan", frequency: "Daily", done: false },
    { id: "chore-2", title: "Pack school lunches", assignee: "Avery", frequency: "Weekdays", done: true },
    { id: "chore-3", title: "Feed the dog", assignee: "Mia", frequency: "Daily", done: false },
  ],
  reminders: [
    { id: "reminder-1", title: "Soccer practice pickup", when: "Tue 5:15 PM", audience: "Jordan" },
    { id: "reminder-2", title: "Review grocery list", when: "Wed 7:30 PM", audience: "Avery" },
    { id: "reminder-3", title: "Library books back in backpacks", when: "Thu 8:00 PM", audience: "Family" },
  ],
  routines: [
    {
      id: "routine-1",
      name: "School Morning",
      timeWindow: "6:45 AM - 8:00 AM",
      items: ["Breakfast ready", "Lunches packed", "Backpacks by the door"],
    },
    {
      id: "routine-2",
      name: "After School Reset",
      timeWindow: "3:30 PM - 5:00 PM",
      items: ["Snack and homework", "Check calendar", "Prep tomorrow clothes"],
    },
    {
      id: "routine-3",
      name: "Evening Wind Down",
      timeWindow: "7:30 PM - 9:00 PM",
      items: ["Kitchen reset", "Quick room tidy", "Review tomorrow plan"],
    },
  ],
  assistantHistory: [
    {
      role: "assistant",
      content: "I can help plan meals from your pantry, coach the monthly budget, and turn chores and reminders into a practical weekly plan.",
    },
  ],
  latestMealPlan: null,
  latestBudgetCoach: null,
  memberProfiles: [],
  familyAchievements: [],
  directThreads: [],
  partnerSpace: null,
  notifications: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function clampNumber(value: unknown, fallback: number, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const next = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, next));
}

function toTrimmedString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function toLocalDateParts(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { year, month, day };
}

function createDefaultRewards() {
  return DEFAULT_REWARDS.map((reward, index) => ({
    id: `reward-template-${index + 1}`,
    title: reward.title,
    detail: reward.detail,
    cost: reward.cost,
    redemptions: 0,
    lastRedeemedAt: null,
  })) satisfies MemberReward[];
}

function sanitizeGoal(value: unknown): MemberGoal | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("goal")),
    title,
    detail: toTrimmedString(value.detail),
    category: toTrimmedString(value.category, "Goal"),
    targetDate: toTrimmedString(value.targetDate),
    points: clampNumber(value.points, 10, 1, 500),
    status: value.status === "done" ? "done" : "active",
    completedAt: typeof value.completedAt === "string" && value.completedAt ? value.completedAt : null,
    sharedAt: typeof value.sharedAt === "string" && value.sharedAt ? value.sharedAt : null,
  };
}

function sanitizeReward(value: unknown): MemberReward | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("reward")),
    title,
    detail: toTrimmedString(value.detail),
    cost: clampNumber(value.cost, 25, 1, 1000),
    redemptions: clampNumber(value.redemptions, 0, 0, 9999),
    lastRedeemedAt: typeof value.lastRedeemedAt === "string" && value.lastRedeemedAt ? value.lastRedeemedAt : null,
  };
}

function sanitizeFitnessLog(value: unknown): FitnessLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const date = toTrimmedString(value.date);
  if (!date) {
    return null;
  }

  return {
    date,
    steps: clampNumber(value.steps, 0, 0, 100000),
    movementMinutes: clampNumber(value.movementMinutes, 0, 0, 1440),
    waterCups: clampNumber(value.waterCups, 0, 0, 50),
    sleepHours: clampNumber(value.sleepHours, 0, 0, 24),
    note: toTrimmedString(value.note),
  };
}

function sanitizeUpload(value: unknown): ProfileUpload | null {
  if (!isRecord(value)) {
    return null;
  }

  const dataUrl = toTrimmedString(value.dataUrl);
  const title = toTrimmedString(value.title);
  const fileName = toTrimmedString(value.fileName);
  if (!dataUrl || !fileName) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("upload")),
    kind: value.kind === "avatar" ? "avatar" : "memory",
    title: title || fileName,
    note: toTrimmedString(value.note),
    fileName,
    mimeType: toTrimmedString(value.mimeType, "application/octet-stream"),
    dataUrl,
    createdAt: toTrimmedString(value.createdAt, new Date().toISOString()),
  };
}

function sanitizeCalendarEvent(value: unknown): ProfileCalendarEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  const date = toTrimmedString(value.date);
  if (!title || !date) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("calendar")),
    title,
    date,
    time: toTrimmedString(value.time),
    detail: toTrimmedString(value.detail),
  };
}

function sanitizeProfile(value: unknown): MemberProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const memberId = toTrimmedString(value.memberId);
  if (!memberId) {
    return null;
  }

  const rewards = Array.isArray(value.rewards) ? value.rewards.map(sanitizeReward).filter(isDefined) : createDefaultRewards();
  const uploads = Array.isArray(value.uploads) ? value.uploads.map(sanitizeUpload).filter(isDefined) : [];
  const avatarUploadId = toTrimmedString(value.avatarUploadId) || null;

  return {
    memberId,
    headline: toTrimmedString(value.headline, "Ready for a great day"),
    about: toTrimmedString(value.about),
    weatherLocation: toTrimmedString(value.weatherLocation),
    fitnessLogs: Array.isArray(value.fitnessLogs) ? value.fitnessLogs.map(sanitizeFitnessLog).filter(isDefined) : [],
    goals: Array.isArray(value.goals) ? value.goals.map(sanitizeGoal).filter(isDefined) : [],
    rewards: rewards.length > 0 ? rewards : createDefaultRewards(),
    uploads,
    avatarUploadId: avatarUploadId && uploads.some((upload) => upload.id === avatarUploadId) ? avatarUploadId : uploads.find((upload) => upload.kind === "avatar")?.id ?? null,
    calendarEvents: Array.isArray(value.calendarEvents) ? value.calendarEvents.map(sanitizeCalendarEvent).filter(isDefined) : [],
    pointsBalance: clampNumber(value.pointsBalance, 0, 0, 100000),
    lifetimePoints: clampNumber(value.lifetimePoints, 0, 0, 100000),
  };
}

function sanitizeAchievement(value: unknown): FamilyAchievement | null {
  if (!isRecord(value)) {
    return null;
  }

  const memberId = toTrimmedString(value.memberId);
  const title = toTrimmedString(value.title);
  if (!memberId || !title) {
    return null;
  }

  const kind =
    value.kind === "reward" || value.kind === "fitness" || value.kind === "shoutout" || value.kind === "goal"
      ? value.kind
      : "goal";

  return {
    id: toTrimmedString(value.id, createId("achievement")),
    memberId,
    memberName: toTrimmedString(value.memberName, "Family member"),
    title,
    detail: toTrimmedString(value.detail),
    points: clampNumber(value.points, 0, 0, 1000),
    createdAt: toTrimmedString(value.createdAt, new Date().toISOString()),
    kind,
  };
}

function sanitizeDirectMessage(value: unknown): DirectMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const senderId = toTrimmedString(value.senderId);
  const content = toTrimmedString(value.content);
  if (!senderId || !content) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("message")),
    senderId,
    senderName: toTrimmedString(value.senderName, "Family member"),
    content,
    createdAt: toTrimmedString(value.createdAt, new Date().toISOString()),
    editedAt: toTrimmedString(value.editedAt) || null,
  };
}

function sanitizeDirectThread(value: unknown): DirectThread | null {
  if (!isRecord(value)) {
    return null;
  }

  const participantIds = Array.from(new Set(toStringArray(value.participantIds))).slice(0, 2);
  if (participantIds.length !== 2) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("thread")),
    participantIds,
    messages: Array.isArray(value.messages) ? value.messages.map(sanitizeDirectMessage).filter(isDefined).slice(-120) : [],
  };
}

function sanitizeNotification(value: unknown): AppNotification | null {
  if (!isRecord(value)) {
    return null;
  }

  const recipientUserId = toTrimmedString(value.recipientUserId);
  const title = toTrimmedString(value.title);
  if (!recipientUserId || !title) {
    return null;
  }

  const kind =
    value.kind === "message" ||
    value.kind === "partner" ||
    value.kind === "reminder" ||
    value.kind === "goal" ||
    value.kind === "reward" ||
    value.kind === "calendar" ||
    value.kind === "achievement" ||
    value.kind === "system"
      ? value.kind
      : "system";

  return {
    id: toTrimmedString(value.id, createId("notification")),
    recipientUserId,
    actorId: typeof value.actorId === "string" && value.actorId ? value.actorId : null,
    actorName: toTrimmedString(value.actorName, "FamilyFlow"),
    kind,
    title,
    detail: toTrimmedString(value.detail),
    link: toTrimmedString(value.link, "/dashboard"),
    createdAt: toTrimmedString(value.createdAt, new Date().toISOString()),
    readAt: typeof value.readAt === "string" && value.readAt ? value.readAt : null,
  };
}

function sanitizePartnerReward(value: unknown): PartnerReward | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  const createdByMemberId = toTrimmedString(value.createdByMemberId);
  if (!title || !createdByMemberId) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("partner-reward")),
    title,
    detail: toTrimmedString(value.detail),
    cost: clampNumber(value.cost, 40, 1, 5000),
    createdByMemberId,
    createdByName: toTrimmedString(value.createdByName, "Partner"),
    redemptions: clampNumber(value.redemptions, 0, 0, 5000),
    lastRedeemedAt: typeof value.lastRedeemedAt === "string" && value.lastRedeemedAt ? value.lastRedeemedAt : null,
  };
}

function sanitizeDateNightPlan(value: unknown): DateNightPlan | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  const status = value.status === "planned" || value.status === "booked" ? value.status : "idea";
  return {
    id: toTrimmedString(value.id, createId("date-night")),
    title,
    when: toTrimmedString(value.when),
    location: toTrimmedString(value.location),
    detail: toTrimmedString(value.detail),
    budget: toTrimmedString(value.budget),
    status,
  };
}

function sanitizeConnectionNote(value: unknown): ConnectionNote | null {
  if (!isRecord(value)) {
    return null;
  }

  const authorId = toTrimmedString(value.authorId);
  const content = toTrimmedString(value.content);
  if (!authorId || !content) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("note")),
    authorId,
    authorName: toTrimmedString(value.authorName, "Partner"),
    title: toTrimmedString(value.title, "Little win"),
    content,
    createdAt: toTrimmedString(value.createdAt, new Date().toISOString()),
  };
}

function sanitizePartnerSpace(value: unknown): PartnerSpace | null {
  if (!isRecord(value)) {
    return null;
  }

  const memberIds = Array.from(new Set(toStringArray(value.memberIds))).slice(0, 2);
  if (memberIds.length !== 2) {
    return null;
  }

  return {
    memberIds,
    messages: Array.isArray(value.messages) ? value.messages.map(sanitizeDirectMessage).filter(isDefined).slice(-160) : [],
    privateRewards: Array.isArray(value.privateRewards) ? value.privateRewards.map(sanitizePartnerReward).filter(isDefined) : [],
    datePlans: Array.isArray(value.datePlans) ? value.datePlans.map(sanitizeDateNightPlan).filter(isDefined) : [],
    connectionNotes: Array.isArray(value.connectionNotes) ? value.connectionNotes.map(sanitizeConnectionNote).filter(isDefined).slice(-80) : [],
  };
}

export function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

export function getTodayKey(date = new Date()) {
  const { year, month, day } = toLocalDateParts(date);
  return `${year}-${month}-${day}`;
}

export function createDefaultMemberProfile(member: MemberSeed): MemberProfile {
  const shortName = member.name.trim().split(/\s+/)[0] || "Family member";
  return {
    memberId: member.id,
    headline: `${shortName} is ready to shine`,
    about: "",
    weatherLocation: "",
    fitnessLogs: [],
    goals: [],
    rewards: createDefaultRewards(),
    uploads: [],
    avatarUploadId: null,
    calendarEvents: [],
    pointsBalance: 0,
    lifetimePoints: 0,
  };
}

export function syncStateWithMembers(state: AppState, members: MemberSeed[]): AppState {
  const sanitized = sanitizeState(state);
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const profileMap = new Map(sanitized.memberProfiles.map((profile) => [profile.memberId, profile]));

  const memberProfiles = members.map((member) => {
    const existing = profileMap.get(member.id);
    return existing
      ? {
          ...existing,
          memberId: member.id,
          rewards: existing.rewards.length > 0 ? existing.rewards : createDefaultRewards(),
        }
      : createDefaultMemberProfile(member);
  });

  const familyAchievements = sanitized.familyAchievements
    .filter((achievement) => memberMap.has(achievement.memberId))
    .map((achievement) => ({
      ...achievement,
      memberName: memberMap.get(achievement.memberId)?.name ?? achievement.memberName,
    }))
    .slice(0, 60);

  const directThreads = sanitized.directThreads
    .filter((thread) => thread.participantIds.length === 2 && thread.participantIds.every((participantId) => memberMap.has(participantId)))
    .map((thread) => ({
      ...thread,
      participantIds: thread.participantIds.slice(0, 2),
      messages: thread.messages.map((message) => ({
        ...message,
        senderName: memberMap.get(message.senderId)?.name ?? message.senderName,
      })),
    }));

  const notifications = sanitized.notifications
    .filter((notification) => memberMap.has(notification.recipientUserId))
    .map((notification) => ({
      ...notification,
      actorName: notification.actorId ? memberMap.get(notification.actorId)?.name ?? notification.actorName : notification.actorName,
    }))
    .slice(0, 200);

  const partnerSpace =
    sanitized.partnerSpace && sanitized.partnerSpace.memberIds.every((memberId) => memberMap.has(memberId))
      ? {
          ...sanitized.partnerSpace,
          memberIds: sanitized.partnerSpace.memberIds.slice(0, 2),
          messages: sanitized.partnerSpace.messages.map((message) => ({
            ...message,
            senderName: memberMap.get(message.senderId)?.name ?? message.senderName,
          })),
          privateRewards: sanitized.partnerSpace.privateRewards.map((reward) => ({
            ...reward,
            createdByName: memberMap.get(reward.createdByMemberId)?.name ?? reward.createdByName,
          })),
          connectionNotes: sanitized.partnerSpace.connectionNotes.map((note) => ({
            ...note,
            authorName: memberMap.get(note.authorId)?.name ?? note.authorName,
          })),
        }
      : null;

  return {
    ...sanitized,
    memberProfiles,
    familyAchievements,
    directThreads,
    partnerSpace,
    notifications,
  };
}

export function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as AppState;
}

export function sanitizeState(raw: unknown): AppState {
  const defaults = cloneDefaultState();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const parsed = raw as Partial<AppState>;
  const budget: Record<string, unknown> = isRecord(parsed.budget) ? parsed.budget : {};

  return {
    ...defaults,
    ...parsed,
    pantry: Array.isArray(parsed.pantry) ? parsed.pantry.filter((item): item is string => typeof item === "string") : defaults.pantry,
    budget: {
      income: clampNumber(budget.income, defaults.budget.income, 0, 1_000_000),
      familySize: clampNumber(budget.familySize, defaults.budget.familySize, 1, 20),
      goal: budget.goal === "stability" || budget.goal === "debt" || budget.goal === "savings" ? budget.goal : defaults.budget.goal,
      style: budget.style === "lean" || budget.style === "comfort" || budget.style === "balanced" ? budget.style : defaults.budget.style,
    },
    chores: Array.isArray(parsed.chores) ? parsed.chores.filter(isRecord).map((chore) => ({
      id: toTrimmedString(chore.id, createId("chore")),
      title: toTrimmedString(chore.title),
      assignee: toTrimmedString(chore.assignee, "Family"),
      frequency: toTrimmedString(chore.frequency, "Any time"),
      done: Boolean(chore.done),
    })).filter((chore) => chore.title) : defaults.chores,
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders.filter(isRecord).map((reminder) => ({
      id: toTrimmedString(reminder.id, createId("reminder")),
      title: toTrimmedString(reminder.title),
      when: toTrimmedString(reminder.when),
      audience: toTrimmedString(reminder.audience, "Family"),
    })).filter((reminder) => reminder.title) : defaults.reminders,
    routines: Array.isArray(parsed.routines) ? parsed.routines.filter(isRecord).map((routine) => ({
      id: toTrimmedString(routine.id, createId("routine")),
      name: toTrimmedString(routine.name),
      timeWindow: toTrimmedString(routine.timeWindow),
      items: toStringArray(routine.items),
    })).filter((routine) => routine.name) : defaults.routines,
    assistantHistory: Array.isArray(parsed.assistantHistory)
      ? parsed.assistantHistory.filter(isRecord).map<ChatMessage>((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: toTrimmedString(message.content),
        })).filter((message) => message.content)
      : defaults.assistantHistory,
    latestMealPlan: parsed.latestMealPlan ?? defaults.latestMealPlan,
    latestBudgetCoach: parsed.latestBudgetCoach ?? defaults.latestBudgetCoach,
    memberProfiles: Array.isArray(parsed.memberProfiles) ? parsed.memberProfiles.map(sanitizeProfile).filter(isDefined) : defaults.memberProfiles,
    familyAchievements: Array.isArray(parsed.familyAchievements) ? parsed.familyAchievements.map(sanitizeAchievement).filter(isDefined) : defaults.familyAchievements,
    directThreads: Array.isArray(parsed.directThreads) ? parsed.directThreads.map(sanitizeDirectThread).filter(isDefined) : defaults.directThreads,
    partnerSpace: sanitizePartnerSpace(parsed.partnerSpace),
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications.map(sanitizeNotification).filter(isDefined).slice(0, 200) : defaults.notifications,
  };
}

export function getBudgetPlan(budget: AppState["budget"]) {
  const basePlans: Record<BudgetStyle, Record<string, number>> = {
    balanced: { essentials: 50, food: 15, savings: 15, lifestyle: 10, flex: 10 },
    lean: { essentials: 52, food: 13, savings: 20, lifestyle: 5, flex: 10 },
    comfort: { essentials: 48, food: 16, savings: 12, lifestyle: 14, flex: 10 },
  };

  const plan = { ...basePlans[budget.style] };

  if (budget.goal === "savings") {
    plan.savings += 5;
    plan.lifestyle -= 3;
    plan.flex -= 2;
  }

  if (budget.goal === "debt") {
    plan.flex += 4;
    plan.lifestyle -= 4;
  }

  if (budget.goal === "stability") {
    plan.essentials += 2;
    plan.flex += 2;
    plan.lifestyle -= 4;
  }

  return Object.entries(plan).map(([label, percent]) => ({
    label,
    percent,
    amount: Math.round((budget.income * percent) / 100),
  }));
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
