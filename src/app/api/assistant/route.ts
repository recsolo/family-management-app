import OpenAI from "openai";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import type { BudgetCoach, ChatMessage, MealPlan } from "@/lib/familyflow";
import { getWorkspaceForUser, saveHouseholdState } from "@/lib/workspace";
import { validateAssistantPrompt } from "@/lib/validation";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type RequestBody = {
  kind: "assistant" | "meal-plan" | "budget-coach";
  prompt?: string;
  history?: ChatMessage[];
};

const assistantSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "suggestions"],
  properties: {
    reply: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
  },
};

const mealPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "meals", "shoppingList"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    meals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "recipe", "whyItFits", "usesIngredients", "missingIngredients", "prepNote"],
        properties: {
          day: { type: "string" },
          recipe: { type: "string" },
          whyItFits: { type: "string" },
          usesIngredients: { type: "array", items: { type: "string" } },
          missingIngredients: { type: "array", items: { type: "string" } },
          prepNote: { type: "string" },
        },
      },
    },
    shoppingList: { type: "array", items: { type: "string" } },
  },
};

const budgetCoachSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "wins", "watchouts", "nextSteps"],
  properties: {
    summary: { type: "string" },
    wins: { type: "array", items: { type: "string" } },
    watchouts: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
};

function getResponseFormat(kind: RequestBody["kind"]) {
  if (kind === "meal-plan") {
    return { type: "json_schema" as const, name: "family_meal_plan", strict: true, schema: mealPlanSchema };
  }

  if (kind === "budget-coach") {
    return { type: "json_schema" as const, name: "family_budget_coach", strict: true, schema: budgetCoachSchema };
  }

  return { type: "json_schema" as const, name: "family_assistant_chat", strict: true, schema: assistantSchema };
}

function getStateSnapshot(workspace: NonNullable<Awaited<ReturnType<typeof getWorkspaceForUser>>>) {
  return [
    `Household: ${workspace.householdName}`,
    `Pantry: ${workspace.state.pantry.join(", ") || "none listed"}`,
    `Budget: income $${workspace.state.budget.income}, family size ${workspace.state.budget.familySize}, goal ${workspace.state.budget.goal}, style ${workspace.state.budget.style}`,
    `Chores: ${workspace.state.chores.map((item) => `${item.title} (${item.assignee}, ${item.done ? "done" : "open"})`).join("; ") || "none listed"}`,
    `Reminders: ${workspace.state.reminders.map((item) => `${item.title} at ${item.when} for ${item.audience}`).join("; ") || "none listed"}`,
    `Routines: ${workspace.state.routines.map((item) => `${item.name}: ${item.items.join(", ")}`).join("; ") || "none listed"}`,
  ].join("\n");
}

function getSystemPrompt(kind: RequestBody["kind"]) {
  const base = "You are FamilyFlow AI, a warm and practical family planning assistant. Keep advice realistic, concise, and useful for a busy household.";

  if (kind === "meal-plan") {
    return `${base} Build pantry-first meal plans that reduce waste and keep prep manageable.`;
  }

  if (kind === "budget-coach") {
    return `${base} Give household budget coaching in plain language. Avoid legal or tax advice.`;
  }

  return `${base} Answer like a supportive family operations coach.`;
}

function getConversationHistory(history: ChatMessage[]) {
  if (history.length === 0) {
    return "No prior conversation.";
  }

  return history
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");
}

function getUserPrompt(
  kind: RequestBody["kind"],
  prompt: string | undefined,
  workspace: NonNullable<Awaited<ReturnType<typeof getWorkspaceForUser>>>,
  history: ChatMessage[],
) {
  const snapshot = getStateSnapshot(workspace);
  const conversation = getConversationHistory(history);

  if (kind === "meal-plan") {
    return `Create a practical 5-day meal plan using the pantry first. Keep it family-friendly and low waste.\n\nContext:\n${snapshot}`;
  }

  if (kind === "budget-coach") {
    return `Coach this household on their current monthly budget. Highlight wins, watchouts, and next steps.\n\nContext:\n${snapshot}`;
  }

  return `${prompt ?? "Help this family plan the week."}\n\nRecent conversation:\n${conversation}\n\nContext:\n${snapshot}`;
}

export async function POST(request: Request) {
  if (!client) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set. Add it to .env.local to enable AI features." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const history = (body.history ?? workspace.state.assistantHistory).slice(-8);
    const prompt = validateAssistantPrompt(body.prompt);

    const response = await client.responses.create({
      model: MODEL,
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: [{ type: "input_text", text: getSystemPrompt(body.kind) }] },
        { role: "user", content: [{ type: "input_text", text: getUserPrompt(body.kind, prompt, workspace, history) }] },
      ],
      text: { format: getResponseFormat(body.kind) },
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json({ error: "The AI response was empty." }, { status: 502 });
    }

    const parsed = JSON.parse(outputText) as
      | { reply: string; suggestions: string[] }
      | MealPlan
      | BudgetCoach;

    if (body.kind === "assistant") {
      const assistant = parsed as { reply: string; suggestions: string[] };
      const baseHistory = body.history ?? workspace.state.assistantHistory;
      await saveHouseholdState(workspace.householdId, {
        ...workspace.state,
        assistantHistory: [...baseHistory, { role: "assistant", content: assistant.reply }],
      });
    }

    if (body.kind === "meal-plan") {
      await saveHouseholdState(workspace.householdId, {
        ...workspace.state,
        latestMealPlan: parsed as MealPlan,
      });
    }

    if (body.kind === "budget-coach") {
      await saveHouseholdState(workspace.householdId, {
        ...workspace.state,
        latestBudgetCoach: parsed as BudgetCoach,
      });
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
