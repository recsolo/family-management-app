import { auth } from "@/lib/auth";
import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError, logRouteWarning } from "@/lib/observability";
import {
  getWorkspaceForUser,
  regenerateInviteCodeForUser,
  removeMemberFromHousehold,
  saveHouseholdState,
  updateHouseholdName,
  updateMemberRole,
  type HouseholdRole,
} from "@/lib/workspace";
import { validateHouseholdRole, validateHouseholdName, validateWorkspaceState } from "@/lib/validation";

export async function GET(request: Request) {
  const context = createRouteContext("/api/workspace", request);
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return errorResponse(context, 404, "Workspace not found");
  }

  return jsonWithRequestId(context, workspace);
}

export async function PUT(request: Request) {
  const context = createRouteContext("/api/workspace", request);
  const session = await auth();

  if (!session?.user?.id || !session.user.householdId) {
    return errorResponse(context, 401, "Unauthorized");
  }

  let body: { state?: unknown };
  try {
    body = (await request.json()) as { state?: unknown };
  } catch {
    return errorResponse(context, 400, "Invalid request payload.");
  }

  if (!body.state) {
    return errorResponse(context, 400, "Missing workspace state");
  }

  try {
    await saveHouseholdState(session.user.householdId, validateWorkspaceState(body.state));
  } catch (error) {
    if (error instanceof Error) {
      logRouteWarning(context, "Workspace save rejected.", {
        userId: session.user.id,
      });
      return errorResponse(context, 400, error.message);
    }

    logRouteError(context, error, { userId: session.user.id });
    return errorResponse(context, 500, "Workspace changes could not be saved.");
  }

  return jsonWithRequestId(context, { ok: true });
}

export async function PATCH(request: Request) {
  const context = createRouteContext("/api/workspace", request);
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  try {
    const body = (await request.json().catch(() => ({}))) as
      | { action?: "rotate-invite" | "rename-household"; householdName?: string }
      | undefined;

    if (body?.action === "rename-household") {
      const householdName = await updateHouseholdName(session.user.id, validateHouseholdName(body.householdName));
      return jsonWithRequestId(context, { householdName });
    }

    const inviteCode = await regenerateInviteCodeForUser(session.user.id);
    return jsonWithRequestId(context, { inviteCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace update failed.";
    logRouteWarning(context, "Workspace patch rejected.", { userId: session.user.id });
    return errorResponse(context, 400, message);
  }
}

export async function POST(request: Request) {
  const context = createRouteContext("/api/workspace", request);
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse(context, 401, "Unauthorized");
  }

  try {
    const body = (await request.json()) as
      | { action: "update-member-role"; memberId?: string; role?: HouseholdRole }
      | { action: "remove-member"; memberId?: string };

    if (!body.memberId) {
      return errorResponse(context, 400, "Member ID is required.");
    }

    if (body.action === "update-member-role") {
      if (!body.role) {
        return errorResponse(context, 400, "Role is required.");
      }

      const members = await updateMemberRole(session.user.id, body.memberId, validateHouseholdRole(body.role));
      return jsonWithRequestId(context, { members });
    }

    if (body.action === "remove-member") {
      const members = await removeMemberFromHousehold(session.user.id, body.memberId);
      return jsonWithRequestId(context, { members });
    }

    return errorResponse(context, 400, "Unsupported member action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Household member update failed.";
    logRouteWarning(context, "Workspace member action rejected.", { userId: session.user.id });
    return errorResponse(context, 400, message);
  }
}
