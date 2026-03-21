import "dotenv/config";

function isPlaceholderSecret(secret) {
  return !secret || secret === "change-me-for-production";
}

const checks = [];
const failures = [];
const warnings = [];

const databaseUrl = process.env.DATABASE_URL?.trim() || "";
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || "";
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
const appKey = process.env.OPENAI_API_KEY?.trim() || "";
const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
const reminderFromEmail = process.env.REMINDER_FROM_EMAIL?.trim() || "";

if (!databaseUrl) {
  failures.push("DATABASE_URL is missing.");
} else if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  failures.push("DATABASE_URL must be a PostgreSQL connection string.");
} else {
  checks.push("DATABASE_URL: present");
}

if (!nextAuthUrl && !railwayDomain) {
  failures.push("NEXTAUTH_URL is missing.");
} else if (!nextAuthUrl && railwayDomain) {
  checks.push(`NEXTAUTH_URL: https://${railwayDomain} (from RAILWAY_PUBLIC_DOMAIN)`);
} else if (!nextAuthUrl.startsWith("http://") && !nextAuthUrl.startsWith("https://")) {
  failures.push("NEXTAUTH_URL must start with http:// or https://.");
} else {
  checks.push(`NEXTAUTH_URL: ${nextAuthUrl}`);
}

if (isPlaceholderSecret(nextAuthSecret)) {
  failures.push("NEXTAUTH_SECRET is missing or still using the default placeholder.");
} else if (nextAuthSecret.length < 32) {
  failures.push("NEXTAUTH_SECRET must be at least 32 characters.");
} else {
  checks.push("NEXTAUTH_SECRET: present");
}

if (!appKey) {
  warnings.push("OPENAI_API_KEY is not set. Core household features still work, but AI features will be disabled.");
} else {
  checks.push("OPENAI_API_KEY: present");
}

if (!resendApiKey && !reminderFromEmail) {
  warnings.push("RESEND_API_KEY and REMINDER_FROM_EMAIL are not set. Email verification, password reset, and reminder emails will stay off.");
} else if (!resendApiKey || !reminderFromEmail) {
  failures.push("RESEND_API_KEY and REMINDER_FROM_EMAIL must both be set to enable outgoing email.");
} else {
  checks.push("Email delivery: Resend configured");
}

console.log("FamilyFlow deployment env check");
console.log("");
for (const line of checks) {
  console.log(`PASS  ${line}`);
}

for (const line of warnings) {
  console.log(`WARN  ${line}`);
}

for (const line of failures) {
  console.log(`FAIL  ${line}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
