import { checkDatabaseConnection } from "@/lib/db";
import { getAppUrl, getRuntimeSetupIssues } from "@/lib/env";
import { createRouteContext, jsonWithRequestId, logRouteWarning } from "@/lib/observability";

export const runtime = "nodejs";

async function getDatabaseHealth() {
  if (!process.env.DATABASE_URL) {
    return {
      configured: false,
      reachable: false,
      latencyMs: null,
      timedOut: false,
    };
  }

  const timeoutMs = 5000;

  const result = await Promise.race([
    checkDatabaseConnection(),
    new Promise<{ ok: false; latencyMs: number; error: Error; timedOut: true }>((resolve) =>
      setTimeout(() => {
        resolve({
          ok: false,
          latencyMs: timeoutMs,
          error: new Error("Database health check timed out."),
          timedOut: true,
        });
      }, timeoutMs),
    ),
  ]);

  return {
    configured: true,
    reachable: result.ok,
    latencyMs: result.latencyMs,
    timedOut: "timedOut" in result ? result.timedOut : false,
  };
}

export async function GET(request: Request) {
  const context = createRouteContext("/api/health", request);
  const setupIssues = getRuntimeSetupIssues();
  const database = await getDatabaseHealth();
  const authConfigured = !setupIssues.some((issue) => issue.key === "NEXTAUTH_SECRET");
  const ok = database.configured && database.reachable && authConfigured;

  if (!ok) {
    logRouteWarning(context, "Health check reported degraded readiness.", {
      databaseConfigured: database.configured,
      databaseReachable: database.reachable,
      databaseTimedOut: database.timedOut,
      setupIssueCount: setupIssues.length,
    });
  }

  return jsonWithRequestId(
    context,
    {
      ok,
      service: "familyflow-ai",
      environment: process.env.NODE_ENV ?? "development",
      url: getAppUrl(),
      databaseProvider: "postgresql",
      database: {
        configured: database.configured,
        reachable: database.reachable,
        latencyMs: database.latencyMs,
        timedOut: database.timedOut,
      },
      auth: {
        configured: authConfigured,
      },
      ai: {
        configured: Boolean(process.env.OPENAI_API_KEY),
      },
      setupIssues,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
