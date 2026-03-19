import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthRuntimeConfig } from "@/lib/env";
import { createId } from "@/lib/familyflow";
import { getExternalGameDefinition, type ExternalGameKey } from "@/lib/game-catalog";
import { getWorkspacePath } from "@/lib/workspace-tabs";

const GAME_LAUNCH_VERSION = 1;
const GAME_LAUNCH_KIND = "familyflow-play-launch";
const GAME_LAUNCH_TTL_MS = 1000 * 60 * 15;

export type GameLaunchClaims = {
  version: number;
  kind: typeof GAME_LAUNCH_KIND;
  sessionId: string;
  gameKey: ExternalGameKey;
  userId: string;
  playerName: string;
  householdId: string;
  householdName: string;
  returnPath: string;
  issuedAt: string;
  expiresAt: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  return Buffer.from(`${normalized}${"=".repeat(padLength)}`, "base64").toString("utf8");
}

function signValue(value: string) {
  const secret = getAuthRuntimeConfig().secret;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required before launching FamilyFlow Play.");
  }

  return createHmac("sha256", secret).update(value).digest();
}

function getPlayBaseUrl(appUrl: string) {
  const configured = process.env.FAMILYFLOW_PLAY_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/g, "");
  }

  return `${appUrl.replace(/\/+$/g, "")}/familyflow-play`;
}

export function createGameLaunchToken(claims: GameLaunchClaims) {
  const payload = toBase64Url(JSON.stringify(claims));
  const signature = signValue(payload)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${payload}.${signature}`;
}

export function verifyGameLaunchToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new Error("The launch token is not valid.");
  }

  const expected = signValue(payload);
  const provided = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("The launch token signature did not match.");
  }

  const parsed = JSON.parse(fromBase64Url(payload)) as Partial<GameLaunchClaims>;
  if (
    parsed.kind !== GAME_LAUNCH_KIND ||
    parsed.version !== GAME_LAUNCH_VERSION ||
    typeof parsed.sessionId !== "string" ||
    typeof parsed.gameKey !== "string" ||
    typeof parsed.userId !== "string" ||
    typeof parsed.playerName !== "string" ||
    typeof parsed.householdId !== "string" ||
    typeof parsed.householdName !== "string" ||
    typeof parsed.returnPath !== "string" ||
    typeof parsed.issuedAt !== "string" ||
    typeof parsed.expiresAt !== "string"
  ) {
    throw new Error("The launch token payload is incomplete.");
  }

  const expiresAt = new Date(parsed.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("The launch token has expired.");
  }

  return parsed as GameLaunchClaims;
}

export function createGameLaunchBundle(input: {
  appUrl: string;
  gameKey: ExternalGameKey;
  userId: string;
  playerName: string;
  householdId: string;
  householdName: string;
}) {
  const issuedAt = new Date();
  const claims: GameLaunchClaims = {
    version: GAME_LAUNCH_VERSION,
    kind: GAME_LAUNCH_KIND,
    sessionId: createId("play-session"),
    gameKey: input.gameKey,
    userId: input.userId,
    playerName: input.playerName,
    householdId: input.householdId,
    householdName: input.householdName,
    returnPath: getWorkspacePath("games"),
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + GAME_LAUNCH_TTL_MS).toISOString(),
  };

  const token = createGameLaunchToken(claims);
  const launchUrl = buildExternalGameUrl({
    appUrl: input.appUrl,
    gameKey: input.gameKey,
    token,
  });

  return {
    claims,
    token,
    launchUrl,
  };
}

export function buildExternalGameUrl(input: {
  appUrl: string;
  gameKey: ExternalGameKey;
  token: string;
}) {
  const definition = getExternalGameDefinition(input.gameKey);
  const playBaseUrl = getPlayBaseUrl(input.appUrl);
  const launchUrl = new URL(definition.path, `${playBaseUrl}/`);
  launchUrl.searchParams.set("token", input.token);
  launchUrl.searchParams.set("host", input.appUrl.replace(/\/+$/g, ""));
  return launchUrl.toString();
}
