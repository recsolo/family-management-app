const BUILD_TIME_SECRET = "build-time-secret-not-used-at-runtime";
const DEFAULT_APP_URL = "http://localhost:3000";

export type RuntimeSetupIssue = {
  key: string;
  message: string;
};

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

export function getRuntimeSetupIssues(): RuntimeSetupIssue[] {
  const issues: RuntimeSetupIssue[] = [];
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";

  if (!databaseUrl) {
    issues.push({
      key: "DATABASE_URL",
      message:
        process.env.FAMILYFLOW_DB_PATH?.trim()
          ? "DATABASE_URL is missing. This app now uses PostgreSQL, so the older FAMILYFLOW_DB_PATH setting is no longer enough for local startup."
          : "DATABASE_URL is missing. FamilyFlow now starts against PostgreSQL and cannot boot local auth or workspace routes without it.",
    });
  }

  if (!nextAuthSecret || isPlaceholderSecret(nextAuthSecret)) {
    issues.push({
      key: "NEXTAUTH_SECRET",
      message: "NEXTAUTH_SECRET is missing or still using the default placeholder.",
    });
  }

  return issues;
}

export function getAuthRuntimeConfig() {
  const secret = getAuthSecret();

  return {
    secret: secret || undefined,
    useSecureCookies: isProductionLikeEnvironment(),
  };
}

export function getMailConfig() {
  const smtpUser = process.env.GMAIL_SMTP_USER?.trim() || "";
  const smtpAppPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.trim() || "";
  const fromEmail = process.env.REMINDER_FROM_EMAIL?.trim() || smtpUser;

  return {
    smtpUser,
    smtpAppPassword,
    fromEmail,
    configured: Boolean(smtpUser && smtpAppPassword && fromEmail),
  };
}

export function getReminderEmailConfig() {
  return getMailConfig();
}

export function getReminderDispatchSecret() {
  return process.env.REMINDER_DISPATCH_SECRET?.trim() || "";
}
