import { sendPasswordResetEmail } from "@/lib/account-security";
import { createRouteContext, jsonWithRequestId } from "@/lib/observability";
import { consumeRateLimit, getRequestClientId } from "@/lib/rate-limit";
import { findUserByEmail } from "@/lib/workspace";
import { validateEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/auth/forgot-password", request);

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const clientId = getRequestClientId(request);
  const rateLimit = consumeRateLimit({
    key: `forgot-password:${clientId}`,
    windowMs: 15 * 60 * 1000,
    max: 8,
  });

  if (!rateLimit.allowed) {
    return jsonWithRequestId(context, { ok: true });
  }

  try {
    const email = validateEmail(body.email);
    const user = await findUserByEmail(email);

    if (user) {
      await sendPasswordResetEmail({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
      });
    }
  } catch {
    return jsonWithRequestId(context, { ok: true });
  }

  return jsonWithRequestId(context, { ok: true });
}
