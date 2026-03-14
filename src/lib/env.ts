const BUILD_TIME_SECRET = "build-time-secret-not-used-at-runtime";
const DEFAULT_APP_URL = "http://localhost:3000";

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
