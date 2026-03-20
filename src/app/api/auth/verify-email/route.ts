import { markEmailVerifiedFromToken } from "@/lib/account-security";
import { createRouteContext, errorResponse, jsonWithRequestId } from "@/lib/observability";
import { requireTrimmedString } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/auth/verify-email", request);
  const body = (await request.json().catch(() => ({}))) as { token?: string };

  try {
    const result = await markEmailVerifiedFromToken(requireTrimmedString(body.token, "Verification token", 4000));
    return jsonWithRequestId(context, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That email link could not be used.";
    return errorResponse(context, 400, message);
  }
}
