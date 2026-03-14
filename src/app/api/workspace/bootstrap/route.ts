import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { attachUserToHousehold } from "@/lib/workspace";
import { validateHouseholdName, validateInviteCode } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json(workspace);
    }

    if (body.mode === "join") {
      const workspace = await attachUserToHousehold({
        userId: session.user.id,
        inviteCode: validateInviteCode(body.inviteCode),
      });

      return NextResponse.json(workspace);
    }

    return NextResponse.json({ error: "Unsupported recovery action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace recovery failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
