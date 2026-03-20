import { resetPasswordFromToken } from "@/lib/account-security";
import { createRouteContext, errorResponse, jsonWithRequestId } from "@/lib/observability";
import { requireTrimmedString, validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/auth/reset-password", request);
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };

  try {
    const result = await resetPasswordFromToken(
      requireTrimmedString(body.token, "Reset token", 4000),
      validatePassword(body.password),
    );
    return jsonWithRequestId(context, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That password reset could not be completed.";
    return errorResponse(context, 400, message);
  }
}
