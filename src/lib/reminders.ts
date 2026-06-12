import { db } from "@/lib/db";
import { escapeHtml, sendReminderEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { formatReminderWhen, getReminderOccurrenceKey, getReminderStatus, syncStateWithMembers, type AppState } from "@/lib/familyflow";
import { householdToAppState, type HouseholdMember } from "@/lib/workspace";

type ReminderDispatchWorkspace = {
  householdId: string;
  state: AppState;
  members: HouseholdMember[];
};

function reminderEmailHtml(title: string, when: string, audience: string) {
  return `<div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6; color:#111;">
    <h2 style="margin-bottom:12px;">${escapeHtml(title)}</h2>
    <p><strong>When:</strong> ${escapeHtml(when)}</p>
    <p><strong>For:</strong> ${escapeHtml(audience)}</p>
    <p>Open FamilyFlow to see the full plan and clear the reminder.</p>
    <p><a href="${getAppUrl()}/family-ops" style="color:#1f75fe;">Open Family Ops</a></p>
  </div>`;
}

/*
 * Updates only remindersJson (re-read fresh) instead of writing back the whole
 * stale state snapshot, which would silently erase any chores/messages other
 * family members saved while the emails were being sent.
 */
async function markReminderEmailsDelivered(householdId: string, deliveredOccurrences: Map<string, string>) {
  const household = await db.household.findUnique({
    where: { id: householdId },
    select: { remindersJson: true },
  });

  if (!household) {
    return;
  }

  let reminders: unknown;
  try {
    reminders = JSON.parse(household.remindersJson);
  } catch {
    return;
  }

  if (!Array.isArray(reminders)) {
    return;
  }

  const next = reminders.map((reminder) => {
    if (!reminder || typeof reminder !== "object") {
      return reminder;
    }

    const id = (reminder as { id?: unknown }).id;
    const occurrenceKey = typeof id === "string" ? deliveredOccurrences.get(id) : undefined;
    return occurrenceKey ? { ...reminder, lastEmailDeliveredAt: occurrenceKey } : reminder;
  });

  await db.household.update({
    where: { id: householdId },
    data: {
      remindersJson: JSON.stringify(next),
      updatedAt: new Date(),
    },
  });
}

export async function dispatchReminderEmailsForWorkspace(
  workspace: ReminderDispatchWorkspace,
  requestedReminderIds?: string[],
) {
  const now = new Date();
  const sentReminderIds = new Set<string>();
  const deliveredOccurrences = new Map<string, string>();

  for (const reminder of workspace.state.reminders) {
    if (requestedReminderIds && !requestedReminderIds.includes(reminder.id)) {
      continue;
    }

    // "delivered" only reflects the in-app marker (lastDeliveredAt); the email
    // leg tracks lastEmailDeliveredAt separately via the occurrence check below,
    // so a reminder someone already saw in the app must still get its email.
    const status = getReminderStatus(reminder, now);
    if (!reminder.delivery.email || (status !== "due" && status !== "delivered")) {
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
      deliveredOccurrences.set(reminder.id, occurrenceKey);
    }
  }

  if (deliveredOccurrences.size > 0) {
    await markReminderEmailsDelivered(workspace.householdId, deliveredOccurrences);
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
