/**
 * Notification creation helpers extracted from familyflow-app.tsx.
 * Pure functions that build AppNotification arrays and merge them into state.
 */

import { createId, type AppNotification, type AppState } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";

export function createNotifications(
  recipientUserIds: string[],
  config: {
    kind: AppNotification["kind"];
    title: string;
    detail: string;
    link: string;
    actorId?: string | null;
    actorName?: string;
    createdAt?: string;
  },
  defaults: { currentUserId: string; userName: string },
): AppNotification[] {
  const createdAt = config.createdAt ?? new Date().toISOString();

  return Array.from(new Set(recipientUserIds))
    .filter(Boolean)
    .map((recipientUserId) => ({
      id: createId("notification"),
      recipientUserId,
      actorId: config.actorId ?? defaults.currentUserId,
      actorName: config.actorName ?? defaults.userName,
      kind: config.kind,
      title: config.title,
      detail: config.detail,
      link: config.link,
      createdAt,
      readAt: null,
    })) satisfies AppNotification[];
}

export function appendNotifications(current: AppState, notifications: AppNotification[]): AppState {
  if (notifications.length === 0) {
    return current;
  }

  return {
    ...current,
    notifications: [...notifications, ...current.notifications]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 200),
  };
}

export function getNotificationRecipientsForAudience(
  audience: string,
  memberList: HouseholdMember[],
  currentUserId: string,
): string[] {
  if (audience === "Family") {
    return memberList.filter((member) => member.id !== currentUserId).map((member) => member.id);
  }

  return memberList
    .filter((member) => member.name.trim().toLowerCase() === audience.trim().toLowerCase() && member.id !== currentUserId)
    .map((member) => member.id);
}

export function getReminderRecipientIds(
  audience: string,
  memberList: HouseholdMember[],
): string[] {
  if (audience === "Family") {
    return memberList.map((member) => member.id);
  }

  return memberList
    .filter((member) => member.name.trim().toLowerCase() === audience.trim().toLowerCase())
    .map((member) => member.id);
}
