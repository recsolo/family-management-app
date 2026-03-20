import { getReminderDispatchSecret } from "@/lib/env";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError } from "@/lib/observability";
import { dispatchReminderEmailsAcrossHouseholds } from "@/lib/reminders";

function hasDispatchSecret(request: Request) {
  const expectedSecret = getReminderDispatchSecret();
  if (!expectedSecret) {
    return false;
  }

  return (
    request.headers.get("x-familyflow-reminder-secret") === expectedSecret ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") === expectedSecret
  );
}

async function handleDispatch(request: Request) {
  const context = createRouteContext("/api/reminders/dispatch-pending", request);

  if (!hasDispatchSecret(request)) {
    return errorResponse(context, 401, "Unauthorized");
  }

  try {
    const result = await dispatchReminderEmailsAcrossHouseholds();
    return jsonWithRequestId(context, result);
  } catch (error) {
    logRouteError(context, error, { scope: "dispatch-pending" });
    return errorResponse(context, 500, "Reminder dispatch failed.");
  }
}

export async function GET(request: Request) {
  return handleDispatch(request);
}

export async function POST(request: Request) {
  return handleDispatch(request);
}
