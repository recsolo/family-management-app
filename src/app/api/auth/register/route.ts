import { NextResponse } from "next/server";

import { registerUser } from "@/lib/workspace";
import { validateEmail, validateHouseholdName, validateInviteCode, validatePassword, requireTrimmedString } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      householdName?: string;
      inviteCode?: string;
      mode?: "create" | "join";
    };

    if (body.mode === "create" && !body.householdName) {
      return NextResponse.json({ error: "Household name is required when creating a workspace." }, { status: 400 });
    }

    if (body.mode === "join" && !body.inviteCode) {
      return NextResponse.json({ error: "Invite code is required to join a household." }, { status: 400 });
    }

    await registerUser({
      name: requireTrimmedString(body.name, "Name", 80),
      email: validateEmail(body.email),
      password: validatePassword(body.password),
      householdName: body.mode === "create" ? validateHouseholdName(body.householdName) : undefined,
      inviteCode: body.mode === "join" ? validateInviteCode(body.inviteCode) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
