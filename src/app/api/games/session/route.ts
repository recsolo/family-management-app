import { NextRequest, NextResponse } from "next/server";

import { verifyGameLaunchToken } from "@/lib/play-launch";
import { getWorkspacePath } from "@/lib/workspace-tabs";
import { getWorkspaceForUser } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Launch token missing." }, { status: 400 });
  }

  try {
    const claims = verifyGameLaunchToken(token);
    const workspace = await getWorkspaceForUser(claims.userId);

    if (!workspace || workspace.householdId !== claims.householdId) {
      return NextResponse.json({ error: "This launch session is no longer available." }, { status: 404 });
    }

    const member = workspace.members.find((entry) => entry.id === claims.userId);
    const topArcadeRun = workspace.state.gameRoom.arcadeRuns[0] ?? null;

    return NextResponse.json({
      data: {
        sessionId: claims.sessionId,
        gameKey: claims.gameKey,
        expiresAt: claims.expiresAt,
        player: {
          id: claims.userId,
          name: member?.name ?? claims.playerName,
        },
        household: {
          id: workspace.householdId,
          name: workspace.householdName,
        },
        returnUrl: `${request.nextUrl.origin}${getWorkspacePath("games")}`,
        topArcadeRun: topArcadeRun
          ? {
              memberName: topArcadeRun.memberName,
              score: topArcadeRun.score,
              starsCaught: topArcadeRun.starsCaught,
              cloudsDodged: topArcadeRun.cloudsDodged,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The game session could not be opened.",
      },
      { status: 400 },
    );
  }
}
