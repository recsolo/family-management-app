import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { formatReminderWhen, getReminderOccurrenceKey, getReminderStatus, syncStateWithMembers, type AppState } from "@/lib/familyflow";
import { householdToAppState, saveHouseholdState, type HouseholdMember } from "@/lib/workspace";

type ReminderDispatchWorkspace = {
  householdId: string;
  state: AppState;
  members: HouseholdMember[];
};

function reminderEmailHtml(title: string, when: string, audience: string) {
  return `<div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6; color:#111;">
    <h2 style="margin-bottom:12px;">${title}</h2>
    <p><strong>When:</strong> ${when}</p>
    <p><strong>For:</strong> ${audience}</p>
    <p>Open FamilyFlow to see the full plan and clear the reminder.</p>
    <p><a href="${getAppUrl()}/family-ops" style="color:#b8871f;">Open Family Ops</a></p>
  </div>`;
}

export async function dispatchReminderEmailsForWorkspace(
  workspace: ReminderDispatchWorkspace,
  requestedReminderIds?: string[],
) {
  const now = new Date();
  const sentReminderIds = new Set<string>();

  for (const reminder of workspace.state.reminders) {
    if (requestedReminderIds && !requestedReminderIds.includes(reminder.id)) {
      continue;
    }

    if (!reminder.delivery.email || getReminderStatus(reminder, now) !== "due") {
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

    const html = reminderEmailHtml(reminder.title, formatReminderWhen(reminder), reminder.audience);
    const results = await Promise.all(
      recipients.map((member) =>
        sendReminderEmail({
          to: member.email,
          subject: `${reminder.title} - FamilyFlow reminder`,
          html,
        }),
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

  return { sentReminderIds: Array.from(sentReminderIds) };
}

export async function dispatchReminderEmailsAcrossHouseholds() {
  const households = await db.household.findMany({
    include: {
      memberships: {
        include: { user: true },
      },
    },
  });

  let householdsTouched = 0;
  const sentReminderIds: string[] = [];

  for (const household of households) {
    const members = household.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role as HouseholdMember["role"],
    }));
    const state = syncStateWithMembers(householdToAppState(household), members);
    const result = await dispatchReminderEmailsForWorkspace({
      householdId: household.id,
      state,
      members,
    });

    if (result.sentReminderIds.length > 0) {
      householdsTouched += 1;
      sentReminderIds.push(...result.sentReminderIds.map((reminderId) => `${household.id}:${reminderId}`));
    }
  }

  return {
    householdsTouched,
    sentReminderIds,
  };
}
