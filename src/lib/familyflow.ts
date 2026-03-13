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
};

export function normalizeIngredient(value: string) {
  return value.trim().toLowerCase();
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

  return {
    ...defaults,
    ...parsed,
    pantry: Array.isArray(parsed.pantry) ? parsed.pantry.filter((item): item is string => typeof item === "string") : defaults.pantry,
    budget: {
      ...defaults.budget,
      ...(parsed.budget ?? {}),
    },
    chores: Array.isArray(parsed.chores) ? parsed.chores : defaults.chores,
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders : defaults.reminders,
    routines: Array.isArray(parsed.routines) ? parsed.routines : defaults.routines,
    assistantHistory: Array.isArray(parsed.assistantHistory) ? parsed.assistantHistory : defaults.assistantHistory,
    latestMealPlan: parsed.latestMealPlan ?? defaults.latestMealPlan,
    latestBudgetCoach: parsed.latestBudgetCoach ?? defaults.latestBudgetCoach,
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
