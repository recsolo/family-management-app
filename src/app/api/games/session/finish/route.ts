import { NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/lib/env";
import { applyArcadeRunResult, hasProcessedGameLaunchSession, markProcessedGameLaunchSession } from "@/lib/game-results";
import { isExternalGameKey } from "@/lib/game-catalog";
import { recalculateFamilyQuestBoard, type ArcadeRun } from "@/lib/familyflow";
import { verifyGameLaunchToken } from "@/lib/play-launch";
import { saveHouseholdState, getWorkspaceForUser } from "@/lib/workspace";

function clampResultValue(value: unknown, minimum: number, maximum: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(numeric)));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    gameKey?: unknown;
    result?: {
      score?: unknown;
      starsCaught?: unknown;
      cloudsDodged?: unknown;
    };
  } | null;

  if (!body || typeof body.token !== "string" || !isExternalGameKey(body.gameKey)) {
    return NextResponse.json({ error: "A valid game result payload is required." }, { status: 400 });
  }

  try {
    const claims = verifyGameLaunchToken(body.token);
    if (claims.gameKey !== body.gameKey) {
      return NextResponse.json({ error: "Game result did not match the launch session." }, { status: 400 });
    }

    const workspace = await getWorkspaceForUser(claims.userId);
    if (!workspace || workspace.householdId !== claims.householdId) {
      return NextResponse.json({ error: "Workspace not found for this launch session." }, { status: 404 });
    }

    if (hasProcessedGameLaunchSession(workspace.state, claims.sessionId)) {
      return NextResponse.json({ error: "This game session was already saved." }, { status: 409 });
    }

    if (claims.gameKey !== "star-sprint") {
      return NextResponse.json({ error: "This game is not ready to sync scores yet." }, { status: 501 });
    }

    const playedAt = new Date().toISOString();
    const run: ArcadeRun = {
      id: claims.sessionId,
      memberId: claims.userId,
      memberName: claims.playerName,
      score: clampResultValue(body.result?.score, 0, 5000),
      starsCaught: clampResultValue(body.result?.starsCaught, 0, 500),
      cloudsDodged: clampResultValue(body.result?.cloudsDodged, 0, 500),
      playedAt,
    };

    const applied = applyArcadeRunResult(workspace.state, workspace.members, run);
    const nextState = markProcessedGameLaunchSession(applied.state, claims.sessionId);
    const recalculatedState = {
      ...nextState,
      familyQuestBoard: recalculateFamilyQuestBoard(nextState.familyQuestBoard, nextState),
    };

    await saveHouseholdState(workspace.householdId, recalculatedState);

    return NextResponse.json({
      data: {
        saved: true,
        pointsAwarded: applied.pointsAwarded,
        sharedPoints: recalculatedState.familyQuestBoard.sharedPoints,
        leaderboardTopScore: recalculatedState.gameRoom.arcadeRuns[0]?.score ?? run.score,
        returnUrl: `${getAppUrl()}/game-room`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The game result could not be saved.",
      },
      { status: 400 },
    );
  }
}
