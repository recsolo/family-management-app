/**
 * Shared date/time formatting utilities used across workspace components.
 */

const SHORT_DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return SHORT_DATE_TIME.format(parsed);
}

export function formatDateValue(value: string): string {
  if (!value) {
    return "Pick a time";
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return SHORT_DATE_TIME.format(parsed);
  }
  return value;
}

export function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return SHORT_DATE.format(parsed);
}

export function getDaysUntil(dateValue: string): number | null {
  if (!dateValue) {
    return null;
  }
  const target = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const today = new Date();
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  return Math.round((target.getTime() - todayAtNoon.getTime()) / (24 * 60 * 60 * 1000));
}

export function getUniqueConnectionDays(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.slice(0, 10))
        .filter(Boolean),
    ),
  ).sort((left, right) => right.localeCompare(left));
}

export function getConnectionStreak(values: string[]): number {
  const days = getUniqueConnectionDays(values);
  if (days.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(`${days[index - 1]}T12:00:00`);
    const next = new Date(`${days[index]}T12:00:00`);
    const diff = Math.round((previous.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
    if (diff !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}
