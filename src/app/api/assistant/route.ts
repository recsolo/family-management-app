import OpenAI from "openai";

import { auth } from "@/lib/auth";
import type { BudgetCoach, ChatMessage, MealPlan } from "@/lib/familyflow";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError, logRouteWarning } from "@/lib/observability";
import { consumeRateLimit } from "@/lib/rate-limit";
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

const SUPPORTED_KINDS = new Set<RequestBody["kind"]>(["assistant", "meal-plan", "budget-coach"]);

const MAX_HISTORY_MESSAGES = 40;
const MAX_HISTORY_MESSAGE_CHARS = 4_000;

/*
 * body.history is attacker-controllable and gets persisted into shared
 * household state, so it must be reduced to well-formed, bounded messages.
 */
function sanitizeClientHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message): message is Record<string, unknown> => Boolean(message) && typeof message === "object")
    .map<ChatMessage>((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: typeof message.content === "string" ? message.content.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS) : "",
    }))
    .filter((message) => message.content)
    .slice(-MAX_HISTORY_MESSAGES);
}

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
  const context = createRouteContext("/api/assistant", request);

  if (!client) {
    return errorResponse(context, 503, "OPENAI_API_KEY is not set. Add it to deployment variables or .env.local to enable AI features.");
  }

  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  const rateLimit = consumeRateLimit({
    key: `ai:${session.user.id}`,
    windowMs: 5 * 60 * 1000,
    max: 24,
  });

  if (!rateLimit.allowed) {
    logRouteWarning(context, "AI request rate limited.", {
      userId: session.user.id,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    const response = errorResponse(context, 429, "Too many AI requests. Please wait a moment and try again.");
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return errorResponse(context, 404, "Workspace not found");
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse(context, 400, "Invalid request payload.");
  }

  if (!body?.kind || !SUPPORTED_KINDS.has(body.kind)) {
    return errorResponse(context, 400, "Unsupported AI request.");
  }

  let prompt: string | undefined;
  try {
    const historyProvided = Array.isArray(body.history);
    const clientHistory = sanitizeClientHistory(body.history);
    const history = (historyProvided ? clientHistory : workspace.state.assistantHistory).slice(-8);
    prompt = validateAssistantPrompt(body.prompt);

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
      logRouteWarning(context, "AI provider returned an empty response.", {
        kind: body.kind,
        userId: session.user.id,
      });
      return errorResponse(context, 502, "The AI response was empty.");
    }

    const parsed = JSON.parse(outputText) as
      | { reply: string; suggestions: string[] }
      | MealPlan
      | BudgetCoach;

    if (body.kind === "assistant") {
      const assistant = parsed as { reply: string; suggestions: string[] };
      const baseHistory = historyProvided ? clientHistory : workspace.state.assistantHistory;
      await saveHouseholdState(workspace.householdId, {
        ...workspace.state,
        assistantHistory: [...baseHistory, { role: "assistant" as const, content: assistant.reply }].slice(-100),
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

    return jsonWithRequestId(context, { data: parsed });
  } catch (error) {
    if (error instanceof Error && error.message) {
      const isValidationError =
        error.message.includes("must be") ||
        error.message.includes("required") ||
        error.message.includes("too long");

      if (isValidationError) {
        logRouteWarning(context, "AI request validation failed.", {
          kind: body.kind,
          userId: session.user.id,
        });
        return errorResponse(context, 400, error.message);
      }
    }

    logRouteError(context, error, {
      kind: body.kind,
      userId: session.user.id,
      promptProvided: Boolean(prompt),
    });
    return errorResponse(context, 500, "The AI request failed. Try again in a moment.");
  }
}
