import { sanitizeState, type AppState } from "@/lib/familyflow";
import type { HouseholdRole } from "@/lib/workspace";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireTrimmedString(value: unknown, fieldName: string, maxLength = 160) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

export function validateEmail(value: unknown) {
  const email = requireTrimmedString(value, "Email", 160).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Email must be a valid email address.");
  }

  return email;
}

export function validatePassword(value: unknown) {
  const password = requireTrimmedString(value, "Password", 200);
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return password;
}

export function validateInviteCode(value: unknown) {
  return requireTrimmedString(value, "Invite code", 24).toUpperCase();
}

export function validateHouseholdName(value: unknown) {
  return requireTrimmedString(value, "Household name", 80);
}

export function validateWorkspaceState(value: unknown): AppState {
  return sanitizeState(value);
}

export function validateAssistantPrompt(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim().slice(0, 2000);
}

export function validateHouseholdRole(value: unknown): HouseholdRole {
  if (value === "owner" || value === "admin" || value === "member") {
    return value;
  }

  throw new Error("Role must be owner, admin, or member.");
}
