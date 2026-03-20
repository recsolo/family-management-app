import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { isExternalGameKey } from "@/lib/game-catalog";
import { createGameLaunchBundle } from "@/lib/play-launch";
import { getWorkspaceForUser } from "@/lib/workspace";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Sign in to launch a game." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { gameKey?: unknown } | null;
  if (!body || !isExternalGameKey(body.gameKey)) {
    return NextResponse.json({ error: "Pick a supported game to launch." }, { status: 400 });
  }

  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const currentMember = workspace.members.find((member) => member.id === workspace.currentUserId);
  const bundle = createGameLaunchBundle({
    appUrl: getAppUrl(),
    gameKey: body.gameKey,
    userId: workspace.currentUserId,
    playerName: currentMember?.name ?? session.user?.name ?? "Family player",
    householdId: workspace.householdId,
    householdName: workspace.householdName,
  });

  return NextResponse.json({
    data: {
      gameKey: bundle.claims.gameKey,
      sessionId: bundle.claims.sessionId,
      expiresAt: bundle.claims.expiresAt,
      launchUrl: bundle.launchUrl,
    },
  });
}
