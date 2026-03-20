import { auth } from "@/lib/auth";
import { getReminderDispatchSecret, getReminderEmailConfig } from "@/lib/env";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError } from "@/lib/observability";
import { dispatchReminderEmailsAcrossHouseholds, dispatchReminderEmailsForWorkspace } from "@/lib/reminders";
import { getWorkspaceForUser } from "@/lib/workspace";

type DispatchBody = {
  reminderIds?: string[];
};

export async function POST(request: Request) {
  const context = createRouteContext("/api/reminders/dispatch", request);
  const session = await auth();
  const dispatchSecret = getReminderDispatchSecret();
  const authorizedBySecret =
    Boolean(dispatchSecret) &&
    (request.headers.get("x-familyflow-reminder-secret") === dispatchSecret ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") === dispatchSecret);

  if (!session?.user?.id && !authorizedBySecret) {
    return errorResponse(context, 401, "Unauthorized");
  }

  const body = (await request.json().catch(() => ({}))) as DispatchBody;
  const requestedReminderIds = Array.isArray(body.reminderIds) ? body.reminderIds : [];
  if (requestedReminderIds.length === 0 && !authorizedBySecret) {
    return jsonWithRequestId(context, { sentReminderIds: [], skipped: "No reminders requested." });
  }

  const config = getReminderEmailConfig();
  if (!config.configured) {
    return jsonWithRequestId(context, { sentReminderIds: [], skipped: "Email delivery is not configured." });
  }

  try {
    if (authorizedBySecret && !session?.user?.id) {
      const result = await dispatchReminderEmailsAcrossHouseholds();
      return jsonWithRequestId(context, result);
    }

    const workspace = await getWorkspaceForUser(session!.user.id);
    if (!workspace) {
      return errorResponse(context, 404, "Workspace not found");
    }

    const result = await dispatchReminderEmailsForWorkspace(workspace, requestedReminderIds);
    return jsonWithRequestId(context, result);
  } catch (error) {
    logRouteError(context, error, { userId: session?.user?.id ?? "dispatch-secret" });
    return errorResponse(context, 500, "Reminder email dispatch failed.");
  }
}
