import { sendVerificationEmail } from "@/lib/account-security";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteWarning } from "@/lib/observability";
import { consumeRateLimit, getRequestClientId } from "@/lib/rate-limit";
import { registerUser } from "@/lib/workspace";
import { validateEmail, validateHouseholdName, validateInviteCode, validatePassword, requireTrimmedString } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/auth/register", request);

  let body:
    | {
        name?: string;
        email?: string;
        password?: string;
        householdName?: string;
        inviteCode?: string;
        mode?: "create" | "join";
      }
    | undefined;

  try {
    body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      householdName?: string;
      inviteCode?: string;
      mode?: "create" | "join";
    };

    const clientId = getRequestClientId(request);
    const rateLimit = consumeRateLimit({
      key: `register:${clientId}`,
      windowMs: 15 * 60 * 1000,
      max: 6,
    });

    if (!rateLimit.allowed) {
      logRouteWarning(context, "Registration rate limited.", {
        clientId,
        mode: body.mode,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      const response = errorResponse(context, 429, "Too many registration attempts. Please wait a few minutes and try again.");
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    if (body.mode === "create" && !body.householdName) {
      return errorResponse(context, 400, "Household name is required when creating a workspace.");
    }

    if (body.mode === "join" && !body.inviteCode) {
      return errorResponse(context, 400, "Invite code is required to join a household.");
    }

    const createdUser = await registerUser({
      name: requireTrimmedString(body.name, "Name", 80),
      email: validateEmail(body.email),
      password: validatePassword(body.password),
      householdName: body.mode === "create" ? validateHouseholdName(body.householdName) : undefined,
      inviteCode: body.mode === "join" ? validateInviteCode(body.inviteCode) : undefined,
    });

    const verificationSent = createdUser.verificationRequired ? await sendVerificationEmail(createdUser) : false;

    return jsonWithRequestId(context, {
      ok: true,
      verificationRequired: createdUser.verificationRequired,
      verificationSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    logRouteWarning(context, "Registration rejected.", {
      mode: body?.mode,
    });
    return errorResponse(context, 400, message);
  }
}
