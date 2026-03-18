import { auth } from "@/lib/auth";
import { getAppUrl, getReminderEmailConfig } from "@/lib/env";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError } from "@/lib/observability";
import { formatReminderWhen, getReminderOccurrenceKey, getReminderStatus } from "@/lib/familyflow";
import { getWorkspaceForUser, saveHouseholdState } from "@/lib/workspace";

type DispatchBody = {
  reminderIds?: string[];
};

async function sendReminderEmail(to: string, subject: string, html: string) {
  const config = getReminderEmailConfig();
  if (!config.configured) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to,
      subject,
      html,
    }),
  });

  return response.ok;
}

export async function POST(request: Request) {
  const context = createRouteContext("/api/reminders/dispatch", request);
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  const body = (await request.json().catch(() => ({}))) as DispatchBody;
  const requestedReminderIds = Array.isArray(body.reminderIds) ? body.reminderIds : [];
  if (requestedReminderIds.length === 0) {
    return jsonWithRequestId(context, { sentReminderIds: [], skipped: "No reminders requested." });
  }

  const config = getReminderEmailConfig();
  if (!config.configured) {
    return jsonWithRequestId(context, { sentReminderIds: [], skipped: "Email delivery is not configured." });
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return errorResponse(context, 404, "Workspace not found");
  }

  const now = new Date();
  const sentReminderIds = new Set<string>();

  try {
    for (const reminder of workspace.state.reminders) {
      if (
        !requestedReminderIds.includes(reminder.id) ||
        !reminder.delivery.email ||
        getReminderStatus(reminder, now) !== "due"
      ) {
        continue;
      }

      const occurrenceKey = getReminderOccurrenceKey(reminder, now);
      if (!occurrenceKey || occurrenceKey === reminder.lastEmailDeliveredAt) {
        continue;
      }

      const recipients = workspace.members.filter((member) =>
        reminder.audience === "Family" ? true : member.name.trim().toLowerCase() === reminder.audience.trim().toLowerCase(),
      );

      if (recipients.length === 0) {
        continue;
      }

      const results = await Promise.all(
        recipients.map((member) =>
          sendReminderEmail(
            member.email,
            `${reminder.title} · FamilyFlow reminder`,
            `<div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6; color:#111;">
              <h2 style="margin-bottom:12px;">${reminder.title}</h2>
              <p><strong>When:</strong> ${formatReminderWhen(reminder)}</p>
              <p><strong>For:</strong> ${reminder.audience}</p>
              <p>Open FamilyFlow to see the full plan and clear the reminder.</p>
              <p><a href="${getAppUrl()}/family-ops" style="color:#b8871f;">Open Family Ops</a></p>
            </div>`,
          ),
        ),
      );

      if (results.some(Boolean)) {
        sentReminderIds.add(reminder.id);
      }
    }

    if (sentReminderIds.size > 0) {
      await saveHouseholdState(workspace.householdId, {
        ...workspace.state,
        reminders: workspace.state.reminders.map((reminder) =>
          sentReminderIds.has(reminder.id)
            ? {
                ...reminder,
                lastEmailDeliveredAt: getReminderOccurrenceKey(reminder, now) ?? now.toISOString(),
              }
            : reminder,
        ),
      });
    }

    return jsonWithRequestId(context, { sentReminderIds: Array.from(sentReminderIds) });
  } catch (error) {
    logRouteError(context, error, { userId: session.user.id });
    return errorResponse(context, 500, "Reminder email dispatch failed.");
  }
}
