import { auth } from "@/lib/auth";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteWarning } from "@/lib/observability";
import { attachUserToHousehold } from "@/lib/workspace";
import { validateHouseholdName, validateInviteCode } from "@/lib/validation";

export async function POST(request: Request) {
  const context = createRouteContext("/api/workspace/bootstrap", request);
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  try {
    const body = (await request.json()) as
      | { mode: "create"; householdName?: string }
      | { mode: "join"; inviteCode?: string };

    if (body.mode === "create") {
      const workspace = await attachUserToHousehold({
        userId: session.user.id,
        householdName: validateHouseholdName(body.householdName),
      });

      return jsonWithRequestId(context, workspace);
    }

    if (body.mode === "join") {
      const workspace = await attachUserToHousehold({
        userId: session.user.id,
        inviteCode: validateInviteCode(body.inviteCode),
      });

      return jsonWithRequestId(context, workspace);
    }

    return errorResponse(context, 400, "Unsupported recovery action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace recovery failed.";
    logRouteWarning(context, "Workspace recovery rejected.", { userId: session.user.id });
    return errorResponse(context, 400, message);
  }
}
