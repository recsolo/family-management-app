import { sendVerificationEmail } from "@/lib/account-security";
import { createRouteContext, errorResponse, jsonWithRequestId } from "@/lib/observability";
import { consumeRateLimit, getRequestClientId } from "@/lib/rate-limit";
import { findUserByEmail } from "@/lib/workspace";
import { validateEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/auth/resend-verification", request);

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const clientId = getRequestClientId(request);
  const rateLimit = consumeRateLimit({
    key: `resend-verification:${clientId}`,
    windowMs: 15 * 60 * 1000,
    max: 8,
  });

  if (!rateLimit.allowed) {
    return errorResponse(context, 429, "Please wait a few minutes before asking for another email.");
  }

  const email = validateEmail(body.email);
  const user = await findUserByEmail(email);

  if (!user || user.emailVerifiedAt) {
    return jsonWithRequestId(context, { ok: true, sent: false });
  }

  const sent = await sendVerificationEmail({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return jsonWithRequestId(context, { ok: true, sent });
}
