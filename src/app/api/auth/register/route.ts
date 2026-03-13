import { NextResponse } from "next/server";

import { registerUser } from "@/lib/workspace";

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

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (body.mode === "create" && !body.householdName) {
      return NextResponse.json({ error: "Household name is required when creating a workspace." }, { status: 400 });
    }

    if (body.mode === "join" && !body.inviteCode) {
      return NextResponse.json({ error: "Invite code is required to join a household." }, { status: 400 });
    }

    await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
      householdName: body.mode === "create" ? body.householdName : undefined,
      inviteCode: body.mode === "join" ? body.inviteCode : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
