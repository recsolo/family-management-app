export type Recipe = {
  name: string;
  description: string;
  ingredients: string[];
  tags: string[];
};

export type BudgetGoal = "stability" | "savings" | "debt";
export type BudgetStyle = "balanced" | "lean" | "comfort";
export type ChoreCadence = "daily" | "weekdays" | "weekly" | "custom";
export type ReminderCadence = "once" | "daily" | "weekdays" | "weekly";

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun", shortLabel: "Su" },
  { value: 1, label: "Mon", shortLabel: "Mo" },
  { value: 2, label: "Tue", shortLabel: "Tu" },
  { value: 3, label: "Wed", shortLabel: "We" },
  { value: 4, label: "Thu", shortLabel: "Th" },
  { value: 5, label: "Fri", shortLabel: "Fr" },
  { value: 6, label: "Sat", shortLabel: "Sa" },
] as const;

export type Chore = {
  id: string;
  title: string;
  assignee: string;
  cadence: ChoreCadence;
  customDays: number[];
  dueTime: string;
  points: number;
  done: boolean;
  completedOn: string | null;
  streakCount: number;
  lastCompletedOn: string | null;
};

export type Reminder = {
  id: string;
  title: string;
  when: string;
  audience: string;
  cadence: ReminderCadence;
  scheduledFor: string | null;
  delivery: {
    inApp: boolean;
    browser: boolean;
    email: boolean;
  };
  lastDeliveredAt: string | null;
  lastBrowserDeliveredAt: string | null;
  lastEmailDeliveredAt: string | null;
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
  kind: "goal" | "reward" | "fitness" | "shoutout" | "game" | "chore" | "quest";
};

export type FamilyQuestCadence = "daily" | "weekly";
export type FamilyQuestMetric = "chores-done" | "goals-completed" | "game-rounds";
export type FamilyQuestSource = "default" | "custom";

export type FamilyQuest = {
  id: string;
  title: string;
  detail: string;
  cadence: FamilyQuestCadence;
  metric: FamilyQuestMetric;
  source: FamilyQuestSource;
  target: number;
  progress: number;
  rewardPoints: number;
  rewardTitle: string;
  windowKey: string;
  completedAt: string | null;
};

export type FamilyQuestCompletion = {
  id: string;
  questId: string;
  title: string;
  cadence: FamilyQuestCadence;
  rewardPoints: number;
  rewardTitle: string;
  completedAt: string;
  windowKey: string;
};

export type FamilyQuestMedal = {
  id: string;
  title: string;
  detail: string;
  tone: "gold" | "silver" | "bronze";
  earnedAt: string;
};

export type FamilySharedReward = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  category: "family" | "game-night";
  redemptions: number;
  lastRedeemedAt: string | null;
};

export type FamilyQuestBoard = {
  sharedPoints: number;
  lifetimeSharedPoints: number;
  completedQuestCount: number;
  currentStreak: number;
  longestStreak: number;
  quests: FamilyQuest[];
  recentCompletions: FamilyQuestCompletion[];
  medals: FamilyQuestMedal[];
  rewards: FamilySharedReward[];
};

export type PartnerRewardCategory = "romance" | "rest" | "adventure" | "flirty";

export type PartnerRewardRedemption = {
  id: string;
  redeemedAt: string;
  redeemedByMemberId: string;
  redeemedByName: string;
};

export type PartnerReward = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  category: PartnerRewardCategory;
  favorite: boolean;
  createdByMemberId: string;
  createdByName: string;
  redemptions: number;
  lastRedeemedAt: string | null;
  redemptionHistory: PartnerRewardRedemption[];
};

export type PartnerAnniversary = {
  id: string;
  title: string;
  date: string;
  detail: string;
  memory: string;
};

export type PartnerBucketListItem = {
  id: string;
  title: string;
  detail: string;
  targetWhen: string;
  memory: string;
  status: "idea" | "planned" | "done";
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
  anniversaries: PartnerAnniversary[];
  bucketList: PartnerBucketListItem[];
  datePlans: DateNightPlan[];
  connectionNotes: ConnectionNote[];
};

export type ArcadeRun = {
  id: string;
  memberId: string;
  memberName: string;
  score: number;
  starsCaught: number;
  cloudsDodged: number;
  playedAt: string;
};

export type UnoCardColor = "red" | "blue" | "green" | "yellow" | "wild";
export type UnoPlayableColor = Exclude<UnoCardColor, "wild">;
export type UnoCardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "+2"
  | "wild"
  | "+4";

export type UnoCard = {
  id: string;
  color: UnoCardColor;
  value: UnoCardValue;
};

export type UnoPlayerSeat = {
  memberId: string;
  name: string;
  hand: UnoCard[];
};

export type UnoGame = {
  status: "playing" | "finished";
  players: UnoPlayerSeat[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  discardPile: UnoCard[];
  drawPile: UnoCard[];
  activeColor: UnoPlayableColor;
  winnerId: string | null;
  lastAction: string;
  startedAt: string;
  updatedAt: string;
};

export type GameRoomState = {
  selectedArcadeMemberId: string | null;
  arcadeRuns: ArcadeRun[];
  unoWins: Array<{
    id: string;
    winnerId: string;
    winnerName: string;
    playedAt: string;
  }>;
  uno: UnoGame | null;
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
  familyQuestBoard: FamilyQuestBoard;
  gameRoom: GameRoomState;
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

const DEFAULT_FAMILY_SHARED_REWARDS: Array<Pick<FamilySharedReward, "title" | "detail" | "cost" | "category">> = [
  {
    title: "Family movie night",
    detail: "Unlock a movie night with popcorn and full vote power.",
    cost: 60,
    category: "family",
  },
  {
    title: "Pick dinner together",
    detail: "The family chooses a fun dinner or dessert for the week.",
    cost: 45,
    category: "family",
  },
  {
    title: "Bonus game night",
    detail: "Cash in for an extra game-night pick or a longer play session.",
    cost: 35,
    category: "game-night",
  },
];

const FAMILY_QUEST_TEMPLATES: Array<
  Pick<FamilyQuest, "id" | "title" | "detail" | "cadence" | "metric" | "target" | "rewardPoints" | "rewardTitle">
> = [
  {
    id: "quest-daily-chores",
    title: "Daily Team Sweep",
    detail: "Finish the key chores for today so the house feels lighter tonight.",
    cadence: "daily",
    metric: "chores-done",
    target: 4,
    rewardPoints: 20,
    rewardTitle: "Snack stash bonus",
  },
  {
    id: "quest-weekly-goals",
    title: "Goal Getter Week",
    detail: "Complete a couple of personal goals this week and share the momentum.",
    cadence: "weekly",
    metric: "goals-completed",
    target: 2,
    rewardPoints: 35,
    rewardTitle: "Victory spark",
  },
  {
    id: "quest-weekly-games",
    title: "Game Night Glow",
    detail: "Play a few rounds together to turn the app into a real family hangout.",
    cadence: "weekly",
    metric: "game-rounds",
    target: 3,
    rewardPoints: 25,
    rewardTitle: "Playful streak",
  },
];
const FAMILY_QUEST_TEMPLATE_IDS = new Set(FAMILY_QUEST_TEMPLATES.map((quest) => quest.id));

export const DEFAULT_STATE: AppState = {
  pantry: ["chicken", "rice", "broccoli", "garlic", "tomatoes", "pasta", "cheese"],
  budget: {
    income: 6200,
    familySize: 4,
    goal: "savings",
    style: "balanced",
  },
  chores: [
    {
      id: "chore-1",
      title: "Empty dishwasher",
      assignee: "Jordan",
      cadence: "daily",
      customDays: [],
      dueTime: "18:00",
      points: 10,
      done: false,
      completedOn: null,
      streakCount: 0,
      lastCompletedOn: null,
    },
    {
      id: "chore-2",
      title: "Pack school lunches",
      assignee: "Avery",
      cadence: "weekdays",
      customDays: [],
      dueTime: "20:00",
      points: 15,
      done: true,
      completedOn: getTodayKey(),
      streakCount: 3,
      lastCompletedOn: getTodayKey(),
    },
    {
      id: "chore-3",
      title: "Feed the dog",
      assignee: "Mia",
      cadence: "daily",
      customDays: [],
      dueTime: "17:30",
      points: 8,
      done: false,
      completedOn: null,
      streakCount: 0,
      lastCompletedOn: null,
    },
  ],
  reminders: [
    {
      id: "reminder-1",
      title: "Soccer practice pickup",
      when: "Tue 5:15 PM",
      audience: "Jordan",
      cadence: "once",
      scheduledFor: null,
      delivery: { inApp: true, browser: false, email: false },
      lastDeliveredAt: null,
      lastBrowserDeliveredAt: null,
      lastEmailDeliveredAt: null,
    },
    {
      id: "reminder-2",
      title: "Review grocery list",
      when: "Wed 7:30 PM",
      audience: "Avery",
      cadence: "once",
      scheduledFor: null,
      delivery: { inApp: true, browser: false, email: false },
      lastDeliveredAt: null,
      lastBrowserDeliveredAt: null,
      lastEmailDeliveredAt: null,
    },
    {
      id: "reminder-3",
      title: "Library books back in backpacks",
      when: "Thu 8:00 PM",
      audience: "Family",
      cadence: "once",
      scheduledFor: null,
      delivery: { inApp: true, browser: false, email: false },
      lastDeliveredAt: null,
      lastBrowserDeliveredAt: null,
      lastEmailDeliveredAt: null,
    },
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
  familyQuestBoard: {
    sharedPoints: 0,
    lifetimeSharedPoints: 0,
    completedQuestCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    quests: [],
    recentCompletions: [],
    medals: [],
    rewards: [],
  },
  gameRoom: {
    selectedArcadeMemberId: null,
    arcadeRuns: [],
    unoWins: [],
    uno: null,
  },
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

function createDefaultFamilyRewards() {
  return DEFAULT_FAMILY_SHARED_REWARDS.map((reward, index) => ({
    id: `family-reward-template-${index + 1}`,
    title: reward.title,
    detail: reward.detail,
    cost: reward.cost,
    category: reward.category,
    redemptions: 0,
    lastRedeemedAt: null,
  })) satisfies FamilySharedReward[];
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

function sanitizeFamilyQuest(value: unknown): FamilyQuest | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  const cadence = value.cadence === "weekly" ? "weekly" : "daily";
  const metric =
    value.metric === "goals-completed" || value.metric === "game-rounds" || value.metric === "chores-done"
      ? value.metric
      : "chores-done";

  return {
    id: toTrimmedString(value.id, createId("family-quest")),
    title,
    detail: toTrimmedString(value.detail),
    cadence,
    metric,
    source:
      value.source === "default" || value.source === "custom"
        ? value.source
        : FAMILY_QUEST_TEMPLATE_IDS.has(toTrimmedString(value.id))
          ? "default"
          : "custom",
    target: clampNumber(value.target, 1, 1, 500),
    progress: clampNumber(value.progress, 0, 0, 500),
    rewardPoints: clampNumber(value.rewardPoints, 10, 1, 1000),
    rewardTitle: toTrimmedString(value.rewardTitle, "Shared bonus"),
    windowKey: toTrimmedString(value.windowKey, getQuestWindowKey(cadence)),
    completedAt: typeof value.completedAt === "string" && value.completedAt ? value.completedAt : null,
  };
}

function sanitizeFamilyQuestCompletion(value: unknown): FamilyQuestCompletion | null {
  if (!isRecord(value)) {
    return null;
  }

  const questId = toTrimmedString(value.questId);
  const title = toTrimmedString(value.title);
  const completedAt = toTrimmedString(value.completedAt);
  if (!questId || !title || !completedAt) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("quest-completion")),
    questId,
    title,
    cadence: value.cadence === "weekly" ? "weekly" : "daily",
    rewardPoints: clampNumber(value.rewardPoints, 10, 1, 1000),
    rewardTitle: toTrimmedString(value.rewardTitle, "Shared bonus"),
    completedAt,
    windowKey: toTrimmedString(value.windowKey, ""),
  };
}

function sanitizeFamilyQuestMedal(value: unknown): FamilyQuestMedal | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  const earnedAt = toTrimmedString(value.earnedAt);
  if (!title || !earnedAt) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("quest-medal")),
    title,
    detail: toTrimmedString(value.detail),
    tone: value.tone === "silver" || value.tone === "bronze" ? value.tone : "gold",
    earnedAt,
  };
}

function sanitizeFamilyReward(value: unknown): FamilySharedReward | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("family-reward")),
    title,
    detail: toTrimmedString(value.detail),
    cost: clampNumber(value.cost, 40, 1, 5000),
    category: value.category === "game-night" ? "game-night" : "family",
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
    value.kind === "reward" ||
    value.kind === "fitness" ||
    value.kind === "shoutout" ||
    value.kind === "goal" ||
    value.kind === "game" ||
    value.kind === "chore" ||
    value.kind === "quest"
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
    category:
      value.category === "rest" || value.category === "adventure" || value.category === "flirty" || value.category === "romance"
        ? value.category
        : "romance",
    favorite: Boolean(value.favorite),
    createdByMemberId,
    createdByName: toTrimmedString(value.createdByName, "Partner"),
    redemptions: clampNumber(value.redemptions, 0, 0, 5000),
    lastRedeemedAt: typeof value.lastRedeemedAt === "string" && value.lastRedeemedAt ? value.lastRedeemedAt : null,
    redemptionHistory: Array.isArray(value.redemptionHistory)
      ? value.redemptionHistory
          .filter(isRecord)
          .map((entry) => {
            const redeemedByMemberId = toTrimmedString(entry.redeemedByMemberId);
            const redeemedAt = toTrimmedString(entry.redeemedAt);
            if (!redeemedByMemberId || !redeemedAt) {
              return null;
            }

            return {
              id: toTrimmedString(entry.id, createId("partner-reward-redemption")),
              redeemedAt,
              redeemedByMemberId,
              redeemedByName: toTrimmedString(entry.redeemedByName, "Partner"),
            } satisfies PartnerRewardRedemption;
          })
          .filter(isDefined)
          .slice(0, 20)
      : [],
  };
}

function sanitizePartnerAnniversary(value: unknown): PartnerAnniversary | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  const date = toTrimmedString(value.date);
  if (!title || !date) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("partner-anniversary")),
    title,
    date,
    detail: toTrimmedString(value.detail),
    memory: toTrimmedString(value.memory),
  };
}

function sanitizePartnerBucketListItem(value: unknown): PartnerBucketListItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = toTrimmedString(value.title);
  if (!title) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("partner-bucket")),
    title,
    detail: toTrimmedString(value.detail),
    targetWhen: toTrimmedString(value.targetWhen),
    memory: toTrimmedString(value.memory),
    status: value.status === "planned" || value.status === "done" ? value.status : "idea",
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
    anniversaries: Array.isArray(value.anniversaries) ? value.anniversaries.map(sanitizePartnerAnniversary).filter(isDefined).slice(0, 24) : [],
    bucketList: Array.isArray(value.bucketList) ? value.bucketList.map(sanitizePartnerBucketListItem).filter(isDefined).slice(0, 40) : [],
    datePlans: Array.isArray(value.datePlans) ? value.datePlans.map(sanitizeDateNightPlan).filter(isDefined) : [],
    connectionNotes: Array.isArray(value.connectionNotes) ? value.connectionNotes.map(sanitizeConnectionNote).filter(isDefined).slice(-80) : [],
  };
}

function sanitizeArcadeRun(value: unknown): ArcadeRun | null {
  if (!isRecord(value)) {
    return null;
  }

  const memberId = toTrimmedString(value.memberId);
  if (!memberId) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("arcade-run")),
    memberId,
    memberName: toTrimmedString(value.memberName, "Family member"),
    score: clampNumber(value.score, 0, 0, 99999),
    starsCaught: clampNumber(value.starsCaught, 0, 0, 9999),
    cloudsDodged: clampNumber(value.cloudsDodged, 0, 0, 9999),
    playedAt: toTrimmedString(value.playedAt, new Date().toISOString()),
  };
}

function sanitizeUnoWin(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const winnerId = toTrimmedString(value.winnerId);
  if (!winnerId) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("uno-win")),
    winnerId,
    winnerName: toTrimmedString(value.winnerName, "Family player"),
    playedAt: toTrimmedString(value.playedAt, new Date().toISOString()),
  };
}

function isUnoColor(value: unknown): value is UnoCardColor {
  return value === "red" || value === "blue" || value === "green" || value === "yellow" || value === "wild";
}

function isUnoPlayableColor(value: unknown): value is UnoPlayableColor {
  return value === "red" || value === "blue" || value === "green" || value === "yellow";
}

function isUnoValue(value: unknown): value is UnoCardValue {
  return (
    value === "0" ||
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5" ||
    value === "6" ||
    value === "7" ||
    value === "8" ||
    value === "9" ||
    value === "skip" ||
    value === "reverse" ||
    value === "+2" ||
    value === "wild" ||
    value === "+4"
  );
}

function sanitizeUnoCard(value: unknown): UnoCard | null {
  if (!isRecord(value) || !isUnoColor(value.color) || !isUnoValue(value.value)) {
    return null;
  }

  return {
    id: toTrimmedString(value.id, createId("uno-card")),
    color: value.color,
    value: value.value,
  };
}

function sanitizeUnoPlayerSeat(value: unknown): UnoPlayerSeat | null {
  if (!isRecord(value)) {
    return null;
  }

  const memberId = toTrimmedString(value.memberId);
  const name = toTrimmedString(value.name);
  if (!memberId || !name) {
    return null;
  }

  return {
    memberId,
    name,
    hand: Array.isArray(value.hand) ? value.hand.map(sanitizeUnoCard).filter(isDefined).slice(0, 108) : [],
  };
}

function sanitizeUnoGame(value: unknown): UnoGame | null {
  if (!isRecord(value)) {
    return null;
  }

  const players = Array.isArray(value.players) ? value.players.map(sanitizeUnoPlayerSeat).filter(isDefined).slice(0, 8) : [];
  const discardPile = Array.isArray(value.discardPile) ? value.discardPile.map(sanitizeUnoCard).filter(isDefined).slice(-108) : [];
  const drawPile = Array.isArray(value.drawPile) ? value.drawPile.map(sanitizeUnoCard).filter(isDefined).slice(-108) : [];

  if (players.length < 2 || discardPile.length === 0 || drawPile.length === 0 || !isUnoPlayableColor(value.activeColor)) {
    return null;
  }

  return {
    status: value.status === "finished" ? "finished" : "playing",
    players,
    currentPlayerIndex: clampNumber(value.currentPlayerIndex, 0, 0, Math.max(players.length - 1, 0)),
    direction: value.direction === -1 ? -1 : 1,
    discardPile,
    drawPile,
    activeColor: value.activeColor,
    winnerId: toTrimmedString(value.winnerId) || null,
    lastAction: toTrimmedString(value.lastAction, "UNO round ready."),
    startedAt: toTrimmedString(value.startedAt, new Date().toISOString()),
    updatedAt: toTrimmedString(value.updatedAt, new Date().toISOString()),
  };
}

function sanitizeGameRoomState(value: unknown): GameRoomState {
  if (!isRecord(value)) {
    return {
      selectedArcadeMemberId: null,
      arcadeRuns: [],
      unoWins: [],
      uno: null,
    };
  }

  return {
    selectedArcadeMemberId: toTrimmedString(value.selectedArcadeMemberId) || null,
    arcadeRuns: Array.isArray(value.arcadeRuns) ? value.arcadeRuns.map(sanitizeArcadeRun).filter(isDefined).slice(0, 20) : [],
    unoWins: Array.isArray(value.unoWins) ? value.unoWins.map(sanitizeUnoWin).filter(isDefined).slice(0, 20) : [],
    uno: sanitizeUnoGame(value.uno),
  };
}

function sanitizeFamilyQuestBoard(value: unknown): FamilyQuestBoard {
  if (!isRecord(value)) {
    return {
      sharedPoints: 0,
      lifetimeSharedPoints: 0,
      completedQuestCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      quests: [],
      recentCompletions: [],
      medals: [],
      rewards: createDefaultFamilyRewards(),
    };
  }

  const rewards = Array.isArray(value.rewards) ? value.rewards.map(sanitizeFamilyReward).filter(isDefined) : createDefaultFamilyRewards();
  const recentCompletions = Array.isArray(value.recentCompletions)
    ? value.recentCompletions.map(sanitizeFamilyQuestCompletion).filter(isDefined).slice(0, 30)
    : [];
  const medals = Array.isArray(value.medals) ? value.medals.map(sanitizeFamilyQuestMedal).filter(isDefined).slice(0, 12) : [];

  return {
    sharedPoints: clampNumber(value.sharedPoints, 0, 0, 100000),
    lifetimeSharedPoints: clampNumber(value.lifetimeSharedPoints, 0, 0, 100000),
    completedQuestCount: clampNumber(value.completedQuestCount, recentCompletions.length, 0, 100000),
    currentStreak: clampNumber(value.currentStreak, 0, 0, 3650),
    longestStreak: clampNumber(value.longestStreak, 0, 0, 3650),
    quests: Array.isArray(value.quests) ? value.quests.map(sanitizeFamilyQuest).filter(isDefined) : [],
    recentCompletions,
    medals,
    rewards: rewards.length > 0 ? rewards : createDefaultFamilyRewards(),
  };
}

export function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
}

export function getTodayKey(date = new Date()) {
  const { year, month, day } = toLocalDateParts(date);
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date = new Date()) {
  const cursor = new Date(date);
  cursor.setHours(0, 0, 0, 0);
  const weekday = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - weekday);

  const yearStart = new Date(cursor.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearStartWeekday = (yearStart.getDay() + 6) % 7;
  yearStart.setDate(yearStart.getDate() - yearStartWeekday);

  const diffDays = Math.round((cursor.getTime() - yearStart.getTime()) / 86400000);
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${cursor.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getQuestWindowKey(cadence: FamilyQuestCadence, date = new Date()) {
  return cadence === "daily" ? getTodayKey(date) : getWeekKey(date);
}

export function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map((part) => Number(part));
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatWeekdayList(days: number[]) {
  const normalized = Array.from(new Set(days)).sort((left, right) => left - right);
  return normalized.map((day) => WEEKDAY_OPTIONS.find((entry) => entry.value === day)?.label ?? "Day").join(", ");
}

export function getChoreCadenceLabel(chore: Chore) {
  switch (chore.cadence) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return `Weekly${chore.customDays[0] !== undefined ? ` on ${formatWeekdayList([chore.customDays[0]])}` : ""}`;
    case "custom":
      return chore.customDays.length > 0 ? formatWeekdayList(chore.customDays) : "Custom";
    default:
      return "Scheduled";
  }
}

export function getReminderCadenceLabel(reminder: Reminder) {
  switch (reminder.cadence) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return "Every week";
    case "once":
    default:
      return "One time";
  }
}

export function getReminderOccurrenceKey(reminder: Reminder, now = new Date()) {
  if (!reminder.scheduledFor) {
    return null;
  }

  return reminder.cadence === "once" ? reminder.scheduledFor.slice(0, 16) : getTodayKey(now);
}

export function isReminderScheduledForDate(reminder: Reminder, now = new Date()) {
  if (!reminder.scheduledFor) {
    return false;
  }

  const scheduledAt = new Date(reminder.scheduledFor);
  if (Number.isNaN(scheduledAt.getTime())) {
    return false;
  }

  switch (reminder.cadence) {
    case "daily":
      return true;
    case "weekdays":
      return now.getDay() >= 1 && now.getDay() <= 5;
    case "weekly":
      return now.getDay() === scheduledAt.getDay();
    case "once":
    default:
      return getTodayKey(now) === getTodayKey(scheduledAt);
  }
}

export function getNextChoreStreakCount(chore: Chore, completionDayKey: string) {
  const previousScheduledDay = findPreviousScheduledDayKey(chore, completionDayKey);
  if (previousScheduledDay && chore.lastCompletedOn === previousScheduledDay) {
    return chore.streakCount + 1;
  }

  return 1;
}

export function isChoreScheduledForDate(chore: Chore, date = new Date()) {
  const weekday = date.getDay();

  switch (chore.cadence) {
    case "daily":
      return true;
    case "weekdays":
      return weekday >= 1 && weekday <= 5;
    case "weekly":
      return chore.customDays.length > 0 ? chore.customDays[0] === weekday : true;
    case "custom":
      return chore.customDays.includes(weekday);
    default:
      return true;
  }
}

function buildDateTimeForDay(dayKey: string, timeValue: string) {
  const [hoursText = "18", minutesText = "00"] = timeValue.split(":");
  const date = parseDayKey(dayKey);
  date.setHours(Number(hoursText) || 0, Number(minutesText) || 0, 0, 0);
  return date;
}

function findPreviousScheduledDayKey(chore: Chore, dayKey: string) {
  const cursor = parseDayKey(dayKey);

  for (let index = 0; index < 14; index += 1) {
    cursor.setDate(cursor.getDate() - 1);
    if (isChoreScheduledForDate(chore, cursor)) {
      return getTodayKey(cursor);
    }
  }

  return null;
}

export function getChoreStatus(chore: Chore, now = new Date()) {
  const todayKey = getTodayKey(now);
  const isScheduledToday = isChoreScheduledForDate(chore, now);

  if (!isScheduledToday) {
    return "upcoming" as const;
  }

  if (chore.done && chore.completedOn === todayKey) {
    return "done" as const;
  }

  const dueAt = buildDateTimeForDay(todayKey, chore.dueTime || "18:00");
  return now >= dueAt ? ("overdue" as const) : ("due" as const);
}

export function getReminderStatus(reminder: Reminder, now = new Date()) {
  if (!reminder.scheduledFor) {
    return "queued" as const;
  }

  const scheduledAt = new Date(reminder.scheduledFor);
  if (Number.isNaN(scheduledAt.getTime())) {
    return "queued" as const;
  }

  if (!isReminderScheduledForDate(reminder, now)) {
    return "scheduled" as const;
  }

  const occurrenceKey = getReminderOccurrenceKey(reminder, now);
  const deliveredForOccurrence = reminder.lastDeliveredAt === occurrenceKey;

  if (deliveredForOccurrence) {
    return "delivered" as const;
  }

  const dueAt = new Date(now);
  dueAt.setHours(scheduledAt.getHours(), scheduledAt.getMinutes(), 0, 0);
  return dueAt <= now ? ("due" as const) : ("scheduled" as const);
}

export function formatReminderWhen(reminder: Reminder) {
  if (reminder.scheduledFor) {
    const parsed = new Date(reminder.scheduledFor);
    if (!Number.isNaN(parsed.getTime())) {
      const dateLabel = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed);
      return `${dateLabel}${reminder.cadence !== "once" ? ` · ${getReminderCadenceLabel(reminder)}` : ""}`;
    }
  }

  return reminder.when;
}

export function createDefaultFamilyQuestBoard(date = new Date()): FamilyQuestBoard {
  return {
    sharedPoints: 0,
    lifetimeSharedPoints: 0,
    completedQuestCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    quests: FAMILY_QUEST_TEMPLATES.map((quest) => ({
      ...quest,
      source: "default" as const,
      progress: 0,
      windowKey: getQuestWindowKey(quest.cadence, date),
      completedAt: null,
    })),
    recentCompletions: [],
    medals: [],
    rewards: createDefaultFamilyRewards(),
  };
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

function getQuestProgress(
  state: Pick<AppState, "chores" | "memberProfiles" | "gameRoom">,
  metric: FamilyQuestMetric,
  now = new Date(),
) {
  switch (metric) {
    case "chores-done": {
      const todayKey = getTodayKey(now);
      return state.chores.filter((chore) => chore.done && chore.completedOn === todayKey).length;
    }
    case "goals-completed": {
      const currentWeek = getWeekKey(now);
      return state.memberProfiles.reduce(
        (total, profile) =>
          total +
          profile.goals.filter((goal) => {
            if (!goal.completedAt) {
              return false;
            }

            const completedAt = new Date(goal.completedAt);
            return !Number.isNaN(completedAt.getTime()) && getWeekKey(completedAt) === currentWeek;
          }).length,
        0,
      );
    }
    case "game-rounds": {
      const currentWeek = getWeekKey(now);
      const arcadeRounds = state.gameRoom.arcadeRuns.filter((run) => {
        const playedAt = new Date(run.playedAt);
        return !Number.isNaN(playedAt.getTime()) && getWeekKey(playedAt) === currentWeek;
      }).length;
      const unoWins = state.gameRoom.unoWins.filter((win) => {
        const playedAt = new Date(win.playedAt);
        return !Number.isNaN(playedAt.getTime()) && getWeekKey(playedAt) === currentWeek;
      }).length;
      return arcadeRounds + unoWins;
    }
    default:
      return 0;
  }
}

export function recalculateFamilyQuestBoard(
  board: FamilyQuestBoard,
  state: Pick<AppState, "chores" | "memberProfiles" | "gameRoom">,
  now = new Date(),
): FamilyQuestBoard {
  const sanitizedBoard = sanitizeFamilyQuestBoard(board);
  const defaults = createDefaultFamilyQuestBoard(now);
  const existingQuestMap = new Map(sanitizedBoard.quests.map((quest) => [quest.id, quest]));
  let sharedPoints = sanitizedBoard.sharedPoints;
  let lifetimeSharedPoints = sanitizedBoard.lifetimeSharedPoints;
  const customQuestSeeds = sanitizedBoard.quests
    .filter((quest) => quest.source === "custom" || !FAMILY_QUEST_TEMPLATE_IDS.has(quest.id))
    .map((quest) => ({
      ...quest,
      source: "custom" as const,
    }));

  const quests = [...defaults.quests, ...customQuestSeeds].map((defaultQuest) => {
    const existing = existingQuestMap.get(defaultQuest.id);
    const currentWindowKey = getQuestWindowKey(defaultQuest.cadence, now);
    const activeQuest =
      existing && existing.windowKey === currentWindowKey
        ? {
            ...defaultQuest,
            ...existing,
            source: defaultQuest.source,
            windowKey: currentWindowKey,
          }
        : {
            ...defaultQuest,
            progress: 0,
            windowKey: currentWindowKey,
            completedAt: null,
          };
    const progress = Math.min(activeQuest.target, getQuestProgress(state, activeQuest.metric, now));
    const wasCompletedThisWindow = Boolean(existing && existing.windowKey === currentWindowKey && existing.completedAt);
    const completedNow = progress >= activeQuest.target && !wasCompletedThisWindow;

    if (completedNow) {
      sharedPoints += activeQuest.rewardPoints;
      lifetimeSharedPoints += activeQuest.rewardPoints;
    }

    return {
      ...activeQuest,
      progress,
      windowKey: currentWindowKey,
      completedAt:
        progress >= activeQuest.target
          ? (wasCompletedThisWindow ? existing?.completedAt ?? new Date().toISOString() : new Date().toISOString())
          : null,
    };
  });

  return {
    sharedPoints,
    lifetimeSharedPoints,
    completedQuestCount: sanitizedBoard.completedQuestCount,
    currentStreak: sanitizedBoard.currentStreak,
    longestStreak: sanitizedBoard.longestStreak,
    quests,
    recentCompletions: sanitizedBoard.recentCompletions,
    medals: sanitizedBoard.medals,
    rewards: sanitizedBoard.rewards.length > 0 ? sanitizedBoard.rewards : defaults.rewards,
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
            redemptionHistory: reward.redemptionHistory.map((entry) => ({
              ...entry,
              redeemedByName: memberMap.get(entry.redeemedByMemberId)?.name ?? entry.redeemedByName,
            })),
          })),
          connectionNotes: sanitized.partnerSpace.connectionNotes.map((note) => ({
            ...note,
            authorName: memberMap.get(note.authorId)?.name ?? note.authorName,
          })),
        }
      : null;

  const gameRoom = {
    selectedArcadeMemberId:
      sanitized.gameRoom.selectedArcadeMemberId && memberMap.has(sanitized.gameRoom.selectedArcadeMemberId)
        ? sanitized.gameRoom.selectedArcadeMemberId
        : members[0]?.id ?? null,
    arcadeRuns: sanitized.gameRoom.arcadeRuns
      .filter((run) => memberMap.has(run.memberId))
      .map((run) => ({
        ...run,
        memberName: memberMap.get(run.memberId)?.name ?? run.memberName,
      }))
      .slice(0, 20),
    unoWins: sanitized.gameRoom.unoWins
      .filter((win) => memberMap.has(win.winnerId))
      .map((win) => ({
        ...win,
        winnerName: memberMap.get(win.winnerId)?.name ?? win.winnerName,
      }))
      .slice(0, 20),
    uno:
      sanitized.gameRoom.uno &&
      sanitized.gameRoom.uno.players.length >= 2 &&
      sanitized.gameRoom.uno.players.every((player) => memberMap.has(player.memberId))
        ? {
            ...sanitized.gameRoom.uno,
            players: sanitized.gameRoom.uno.players.map((player) => ({
              ...player,
              name: memberMap.get(player.memberId)?.name ?? player.name,
            })),
            winnerId:
              sanitized.gameRoom.uno.winnerId && memberMap.has(sanitized.gameRoom.uno.winnerId)
                ? sanitized.gameRoom.uno.winnerId
                : null,
          }
          : null,
  };

  const nextState = {
    ...sanitized,
    memberProfiles,
    familyAchievements,
    directThreads,
    partnerSpace,
    notifications,
    gameRoom,
  };

  return {
    ...nextState,
    familyQuestBoard: recalculateFamilyQuestBoard(sanitized.familyQuestBoard, nextState),
  };
}

export function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as AppState;
}

export function sanitizeState(raw: unknown): AppState {
  const defaults = cloneDefaultState();
  const todayKey = getTodayKey();

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
    chores: Array.isArray(parsed.chores)
      ? parsed.chores
            .filter(isRecord)
            .map((chore) => {
              const choreRecord = chore as Record<string, unknown>;
              const legacyFrequency = typeof choreRecord.frequency === "string" ? choreRecord.frequency : "";
              const cadence =
                chore.cadence === "daily" || chore.cadence === "weekdays" || chore.cadence === "weekly" || chore.cadence === "custom"
                  ? chore.cadence
                  : legacyFrequency.toLowerCase().includes("week")
                    ? ("weekdays" as const)
                    : ("daily" as const);
            const customDays = Array.isArray(chore.customDays)
              ? chore.customDays.map((value) => clampNumber(value, 0, 0, 6)).filter((value, index, list) => list.indexOf(value) === index)
              : cadence === "weekly"
                ? [1]
                : [];
            const completedOn = typeof chore.completedOn === "string" && chore.completedOn ? chore.completedOn : null;
            const doneToday = Boolean(chore.done) && completedOn === todayKey;
            const lastCompletedOn = typeof chore.lastCompletedOn === "string" && chore.lastCompletedOn ? chore.lastCompletedOn : completedOn;

            return {
              id: toTrimmedString(chore.id, createId("chore")),
              title: toTrimmedString(chore.title),
              assignee: toTrimmedString(chore.assignee, "Family"),
              cadence,
              customDays,
              dueTime: toTrimmedString(chore.dueTime, "18:00"),
              points: clampNumber(chore.points, 10, 1, 500),
              done: doneToday,
              completedOn: doneToday ? completedOn : null,
              streakCount: clampNumber(chore.streakCount, 0, 0, 999),
              lastCompletedOn: lastCompletedOn || null,
            };
          })
          .filter((chore) => chore.title)
      : defaults.chores,
    reminders: Array.isArray(parsed.reminders)
      ? parsed.reminders
          .filter(isRecord)
          .map((reminder) => ({
            id: toTrimmedString(reminder.id, createId("reminder")),
            title: toTrimmedString(reminder.title),
            when: toTrimmedString(reminder.when),
            audience: toTrimmedString(reminder.audience, "Family"),
            cadence:
              reminder.cadence === "daily" || reminder.cadence === "weekdays" || reminder.cadence === "weekly"
                ? reminder.cadence
                : ("once" as const),
            scheduledFor: toTrimmedString(reminder.scheduledFor) || null,
            delivery: {
              inApp: reminder.delivery && isRecord(reminder.delivery) ? Boolean(reminder.delivery.inApp ?? true) : true,
              browser: reminder.delivery && isRecord(reminder.delivery) ? Boolean(reminder.delivery.browser) : false,
              email: reminder.delivery && isRecord(reminder.delivery) ? Boolean(reminder.delivery.email) : false,
            },
            lastDeliveredAt: toTrimmedString(reminder.lastDeliveredAt) || null,
            lastBrowserDeliveredAt: toTrimmedString(reminder.lastBrowserDeliveredAt) || null,
            lastEmailDeliveredAt: toTrimmedString(reminder.lastEmailDeliveredAt) || null,
          }))
          .filter((reminder) => reminder.title)
      : defaults.reminders,
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
    familyQuestBoard: sanitizeFamilyQuestBoard(parsed.familyQuestBoard),
    gameRoom: sanitizeGameRoomState(parsed.gameRoom),
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
