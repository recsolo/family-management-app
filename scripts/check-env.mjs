import "dotenv/config";
import { dirname, isAbsolute, join } from "node:path";
import { mkdirSync } from "node:fs";

const cwd = process.cwd();

function resolveDatabasePath() {
  const rawValue = process.env.FAMILYFLOW_DB_PATH?.trim();
  if (!rawValue) {
    return join(cwd, "data", "familyflow.db");
  }

  if (rawValue.startsWith("file:")) {
    const value = rawValue.slice("file:".length).replace(/^\/\//, "");
    return isAbsolute(value) ? value : join(cwd, value);
  }

  return isAbsolute(rawValue) ? rawValue : join(cwd, rawValue);
}

function isPlaceholderSecret(secret) {
  return !secret || secret === "change-me-for-production";
}

const checks = [];
const failures = [];
const warnings = [];

const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || "";
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
const dbPath = resolveDatabasePath();
const appKey = process.env.OPENAI_API_KEY?.trim() || "";

checks.push(`Database path: ${dbPath}`);

try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (error) {
  failures.push(`Database directory is not writable: ${error instanceof Error ? error.message : "unknown error"}`);
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
