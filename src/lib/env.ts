import { dirname, isAbsolute, join } from "node:path";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "familyflow.db");
const DEFAULT_APP_URL = "http://localhost:3000";
const BUILD_TIME_SECRET = "build-time-secret-not-used-at-runtime";

function fromFileValue(value: string) {
  const trimmed = value.slice("file:".length).replace(/^\/\//, "");
  if (!trimmed) {
    return DEFAULT_DB_PATH;
  }

  return isAbsolute(trimmed) ? trimmed : join(process.cwd(), trimmed);
}

export function resolveDatabasePath() {
  const rawValue = process.env.FAMILYFLOW_DB_PATH?.trim();
  if (!rawValue) {
    return DEFAULT_DB_PATH;
  }

  if (rawValue.startsWith("file:")) {
    return fromFileValue(rawValue);
  }

  return isAbsolute(rawValue) ? rawValue : join(process.cwd(), rawValue);
}

export function getDatabaseDirectory() {
  return dirname(resolveDatabasePath());
}

export function getAppUrl() {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    return nextAuthUrl;
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return railwayDomain.startsWith("http") ? railwayDomain : `https://${railwayDomain}`;
  }

  return DEFAULT_APP_URL;
}

export function getAuthSecret() {
  const envSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
  if (!isPlaceholderSecret(envSecret)) {
    return envSecret;
  }

  if (process.env.npm_lifecycle_event === "build") {
    return BUILD_TIME_SECRET;
  }

  return "";
}

export function isPlaceholderSecret(secret: string) {
  return secret.length === 0 || secret === "change-me-for-production";
}

export function isProductionLikeEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getAuthRuntimeConfig() {
  const secret = getAuthSecret();

  return {
    secret: secret || undefined,
    useSecureCookies: isProductionLikeEnvironment(),
  };
}
