import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { type AppState } from "@/lib/familyflow";
import { getWorkspaceForUser, regenerateInviteCode, saveHouseholdState } from "@/lib/workspace";

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

  const body = (await request.json()) as { state?: AppState };
  if (!body.state) {
    return NextResponse.json({ error: "Missing workspace state" }, { status: 400 });
  }

  await saveHouseholdState(session.user.householdId, body.state);

  return NextResponse.json({ ok: true });
}

export async function PATCH() {
  const session = await auth();

  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inviteCode = await regenerateInviteCode(session.user.householdId);
  return NextResponse.json({ inviteCode });
}
