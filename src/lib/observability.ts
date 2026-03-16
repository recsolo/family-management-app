import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type PrimitiveLogValue = string | number | boolean | null | undefined;

type RouteLogMeta = Record<string, PrimitiveLogValue>;

export type RouteContext = {
  route: string;
  requestId: string;
  method: string;
  startedAt: number;
};

function sanitizeMeta(meta: RouteLogMeta) {
  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined));
}

function getErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (typeof error === "string") {
    return {
      errorName: "Error",
      errorMessage: error,
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: "An unknown error was thrown.",
  };
}

function logRoute(level: "info" | "warn" | "error", context: RouteContext, message: string, meta: RouteLogMeta = {}) {
  const payload = {
    scope: "familyflow-api",
    level,
    route: context.route,
    method: context.method,
    requestId: context.requestId,
    durationMs: Date.now() - context.startedAt,
    message,
    ...sanitizeMeta(meta),
  };

  if (level === "error") {
    console.error("[FamilyFlow]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[FamilyFlow]", payload);
    return;
  }

  console.info("[FamilyFlow]", payload);
}

export function createRouteContext(route: string, request: Request): RouteContext {
  const forwardedRequestId = request.headers.get("x-request-id")?.trim();

  return {
    route,
    requestId: forwardedRequestId || randomUUID(),
    method: request.method,
    startedAt: Date.now(),
  };
}

export function withRequestId(response: NextResponse, context: RouteContext) {
  response.headers.set("x-request-id", context.requestId);
  return response;
}

export function jsonWithRequestId<T>(context: RouteContext, body: T, init?: ResponseInit) {
  return withRequestId(NextResponse.json(body, init), context);
}

export function errorResponse(
  context: RouteContext,
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return withRequestId(
    NextResponse.json(
      {
        error: message,
        requestId: context.requestId,
        ...extra,
      },
      { status },
    ),
    context,
  );
}

export function logRouteInfo(context: RouteContext, message: string, meta: RouteLogMeta = {}) {
  logRoute("info", context, message, meta);
}

export function logRouteWarning(context: RouteContext, message: string, meta: RouteLogMeta = {}) {
  logRoute("warn", context, message, meta);
}

export function logRouteError(context: RouteContext, error: unknown, meta: RouteLogMeta = {}) {
  logRoute("error", context, "Route failed.", {
    ...meta,
    ...getErrorPayload(error),
  });
}
