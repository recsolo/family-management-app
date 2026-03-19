import {
  createId,
  type AppNotification,
  type AppState,
  type ArcadeRun,
  type UnoGame,
} from "@/lib/familyflow";
import { getWorkspacePath } from "@/lib/workspace-tabs";
import type { HouseholdMember } from "@/lib/workspace";

type NotificationConfig = {
  kind: AppNotification["kind"];
  title: string;
  detail: string;
  link: string;
  actorId?: string | null;
  actorName?: string;
  createdAt?: string;
};

function createNotifications(
  recipientUserIds: string[],
  config: NotificationConfig,
  actorDefaults: {
    actorId?: string | null;
    actorName?: string;
  },
) {
  const createdAt = config.createdAt ?? new Date().toISOString();

  return Array.from(new Set(recipientUserIds))
    .filter(Boolean)
    .map((recipientUserId) => ({
      id: createId("notification"),
      recipientUserId,
      actorId: config.actorId ?? actorDefaults.actorId ?? null,
      actorName: config.actorName ?? actorDefaults.actorName ?? "FamilyFlow",
      kind: config.kind,
      title: config.title,
      detail: config.detail,
      link: config.link,
      createdAt,
      readAt: null,
    })) satisfies AppNotification[];
}

function appendNotifications(current: AppState, notifications: AppNotification[]) {
  if (notifications.length === 0) {
    return current;
  }

  return {
    ...current,
    notifications: [...notifications, ...current.notifications]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 200),
  };
}

export function hasProcessedGameLaunchSession(state: AppState, sessionId: string) {
  return state.gameRoom.processedSessionIds.includes(sessionId);
}

export function markProcessedGameLaunchSession(state: AppState, sessionId: string) {
  return {
    ...state,
    gameRoom: {
      ...state.gameRoom,
      processedSessionIds: [sessionId, ...state.gameRoom.processedSessionIds.filter((entry) => entry !== sessionId)].slice(0, 80),
    },
  };
}

export function applyArcadeRunResult(current: AppState, memberList: HouseholdMember[], run: ArcadeRun) {
  const pointsAwarded = Math.max(6, Math.min(32, Math.floor(run.score / 3) + run.starsCaught));
  const runner = memberList.find((member) => member.id === run.memberId);

  const notifications = runner
    ? createNotifications(
        memberList.filter((member) => member.id !== run.memberId).map((member) => member.id),
        {
          kind: "achievement",
          title: `${runner.name} lit up Star Sprint`,
          detail: `${run.score} points and ${pointsAwarded} profile points earned.`,
          link: getWorkspacePath("games"),
          actorId: run.memberId,
          actorName: runner.name,
          createdAt: run.playedAt,
        },
        {
          actorId: run.memberId,
          actorName: runner.name,
        },
      )
    : [];

  const nextState: AppState = {
    ...current,
    memberProfiles: current.memberProfiles.map((profile) =>
      profile.memberId === run.memberId
        ? {
            ...profile,
            pointsBalance: profile.pointsBalance + pointsAwarded,
            lifetimePoints: profile.lifetimePoints + pointsAwarded,
          }
        : profile,
    ),
    familyAchievements: runner
      ? [
          {
            id: createId("achievement"),
            memberId: run.memberId,
            memberName: runner.name,
            title: `${runner.name} won a Star Sprint burst`,
            detail: `${run.score} points, ${run.starsCaught} stars, ${run.cloudsDodged} dodges.`,
            points: pointsAwarded,
            kind: "game" as const,
            createdAt: run.playedAt,
          },
          ...current.familyAchievements,
        ].slice(0, 60)
      : current.familyAchievements,
    gameRoom: {
      ...current.gameRoom,
      selectedArcadeMemberId: run.memberId,
      arcadeRuns: [...current.gameRoom.arcadeRuns, run]
        .sort((left, right) => right.score - left.score || right.playedAt.localeCompare(left.playedAt))
        .slice(0, 20),
    },
  };

  return {
    state: appendNotifications(nextState, notifications),
    pointsAwarded,
  };
}

export function applyUnoGameResult(current: AppState, memberList: HouseholdMember[], game: UnoGame | null) {
  const previousGame = current.gameRoom.uno;
  const justFinished =
    game?.status === "finished" &&
    Boolean(game.winnerId) &&
    (!previousGame || previousGame.status !== "finished" || previousGame.winnerId !== game.winnerId);

  if (!justFinished || !game?.winnerId) {
    return {
      state: {
        ...current,
        gameRoom: {
          ...current.gameRoom,
          uno: game,
        },
      },
      pointsAwarded: 0,
    };
  }

  const winner = memberList.find((member) => member.id === game.winnerId);
  const winnerName = winner?.name ?? game.players.find((player) => player.memberId === game.winnerId)?.name ?? "Family player";
  const pointsAwarded = 18;
  const playedAt = game.updatedAt || new Date().toISOString();
  const notifications = createNotifications(
    memberList.filter((member) => member.id !== game.winnerId).map((member) => member.id),
    {
      kind: "achievement",
      title: `${winnerName} won the UNO round`,
      detail: `${pointsAwarded} profile points earned for the win.`,
      link: getWorkspacePath("games"),
      actorId: game.winnerId,
      actorName: winnerName,
      createdAt: playedAt,
    },
    {
      actorId: game.winnerId,
      actorName: winnerName,
    },
  );

  const nextState: AppState = {
    ...current,
    memberProfiles: current.memberProfiles.map((profile) =>
      profile.memberId === game.winnerId
        ? {
            ...profile,
            pointsBalance: profile.pointsBalance + pointsAwarded,
            lifetimePoints: profile.lifetimePoints + pointsAwarded,
          }
        : profile,
    ),
    familyAchievements: [
      {
        id: createId("achievement"),
        memberId: game.winnerId,
        memberName: winnerName,
        title: `${winnerName} won an UNO round`,
        detail: game.lastAction,
        points: pointsAwarded,
        kind: "game" as const,
        createdAt: playedAt,
      },
      ...current.familyAchievements,
    ].slice(0, 60),
    gameRoom: {
      ...current.gameRoom,
      uno: game,
      unoWins: [
        {
          id: createId("uno-win"),
          winnerId: game.winnerId,
          winnerName,
          playedAt,
        },
        ...current.gameRoom.unoWins,
      ].slice(0, 20),
    },
  };

  return {
    state: appendNotifications(nextState, notifications),
    pointsAwarded,
  };
}
