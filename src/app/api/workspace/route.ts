import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
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

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json(workspace);
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { state?: unknown };
  if (!body.state) {
    return NextResponse.json({ error: "Missing workspace state" }, { status: 400 });
  }

  await saveHouseholdState(session.user.householdId, validateWorkspaceState(body.state));

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as
      | { action?: "rotate-invite" | "rename-household"; householdName?: string }
      | undefined;

    if (body?.action === "rename-household") {
      const householdName = await updateHouseholdName(session.user.id, validateHouseholdName(body.householdName));
      return NextResponse.json({ householdName });
    }

    const inviteCode = await regenerateInviteCodeForUser(session.user.id);
    return NextResponse.json({ inviteCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as
      | { action: "update-member-role"; memberId?: string; role?: HouseholdRole }
      | { action: "remove-member"; memberId?: string };

    if (!body.memberId) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    if (body.action === "update-member-role") {
      if (!body.role) {
        return NextResponse.json({ error: "Role is required." }, { status: 400 });
      }

      const members = await updateMemberRole(session.user.id, body.memberId, validateHouseholdRole(body.role));
      return NextResponse.json({ members });
    }

    if (body.action === "remove-member") {
      const members = await removeMemberFromHousehold(session.user.id, body.memberId);
      return NextResponse.json({ members });
    }

    return NextResponse.json({ error: "Unsupported member action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Household member update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
