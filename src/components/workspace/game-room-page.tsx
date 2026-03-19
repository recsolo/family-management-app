"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createId, type AppState, type ArcadeRun, type GameRoomState, type UnoCard, type UnoGame, type UnoPlayableColor } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";

type Props = {
  currentUserId: string;
  memberList: HouseholdMember[];
  gameRoom: GameRoomState;
  familyQuestBoard: AppState["familyQuestBoard"];
  initialView?: GameView;
  onSelectArcadeMember: (memberId: string) => void;
  onSaveArcadeRun: (run: ArcadeRun) => void;
  onSaveUnoGame: (game: UnoGame | null) => void;
  onRedeemFamilyReward: (rewardId: string) => void;
};

type GameView = "arcade" | "uno";

type FallingThing = {
  id: number;
  x: number;
  y: number;
  radius: number;
  kind: "star" | "cloud";
  speed: number;
  drift: number;
};

type ArcadeRuntime = {
  mode: "idle" | "playing" | "finished";
  selectedMemberId: string;
  playerX: number;
  score: number;
  starsCaught: number;
  cloudsDodged: number;
  timeLeftMs: number;
  spawnCarryMs: number;
  things: FallingThing[];
  lastRun: ArcadeRun | null;
};

const UNO_COLORS: UnoPlayableColor[] = ["red", "blue", "green", "yellow"];
const UNO_NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const UNO_SPECIALS = ["skip", "reverse", "+2"] as const;
const ARCADE_WIDTH = 920;
const ARCADE_HEIGHT = 420;
const PLAYER_HALF_WIDTH = 48;
const PLAYER_Y = ARCADE_HEIGHT - 46;
const PLAYER_SPEED = 340;
const ARCADE_DURATION_MS = 35000;

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createUnoDeck() {
  const deck: UnoCard[] = [];

  for (const color of UNO_COLORS) {
    deck.push({ id: createId("uno"), color, value: "0" });

    for (const value of UNO_NUMBERS.slice(1)) {
      deck.push({ id: createId("uno"), color, value });
      deck.push({ id: createId("uno"), color, value });
    }

    for (const value of UNO_SPECIALS) {
      deck.push({ id: createId("uno"), color, value });
      deck.push({ id: createId("uno"), color, value });
    }
  }

  for (let index = 0; index < 4; index += 1) {
    deck.push({ id: createId("uno"), color: "wild", value: "wild" });
    deck.push({ id: createId("uno"), color: "wild", value: "+4" });
  }

  return shuffleArray(deck);
}

function getUnoCardLabel(card: UnoCard) {
  switch (card.value) {
    case "skip":
      return "Skip";
    case "reverse":
      return "Reverse";
    case "+2":
      return "+2";
    case "wild":
      return "Wild";
    case "+4":
      return "Wild +4";
    default:
      return card.value;
  }
}

function getUnoColorLabel(color: UnoPlayableColor) {
  return color.slice(0, 1).toUpperCase() + color.slice(1);
}

function getNextIndex(playerCount: number, currentIndex: number, direction: 1 | -1, steps = 1) {
  let nextIndex = currentIndex;
  for (let index = 0; index < steps; index += 1) {
    nextIndex = (nextIndex + direction + playerCount) % playerCount;
  }
  return nextIndex;
}

function replenishDrawPile(drawPile: UnoCard[], discardPile: UnoCard[]) {
  if (drawPile.length > 0 || discardPile.length <= 1) {
    return {
      drawPile,
      discardPile,
    };
  }

  const topCard = discardPile[discardPile.length - 1];
  const nextDrawPile = shuffleArray(discardPile.slice(0, -1));
  return {
    drawPile: nextDrawPile,
    discardPile: [topCard],
  };
}

function drawCards(game: UnoGame, playerIndex: number, count: number) {
  let drawPile = [...game.drawPile];
  let discardPile = [...game.discardPile];
  const drawn: UnoCard[] = [];

  for (let index = 0; index < count; index += 1) {
    const refreshed = replenishDrawPile(drawPile, discardPile);
    drawPile = refreshed.drawPile;
    discardPile = refreshed.discardPile;

    const nextCard = drawPile.shift();
    if (!nextCard) {
      break;
    }
    drawn.push(nextCard);
  }

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === playerIndex ? { ...player, hand: [...player.hand, ...drawn] } : player,
    ),
    drawPile,
    discardPile,
  };
}

function isPlayableCard(card: UnoCard, game: UnoGame) {
  const topCard = game.discardPile[game.discardPile.length - 1];
  return card.color === "wild" || card.color === game.activeColor || card.value === topCard.value;
}

function createUnoGame(participants: HouseholdMember[]): UnoGame {
  const now = new Date().toISOString();
  const deck = createUnoDeck();
  const players = participants.slice(0, 6).map((member) => ({
    memberId: member.id,
    name: member.name,
    hand: deck.splice(0, 7),
  }));

  let openingCard = deck.shift();
  while (openingCard && (openingCard.color === "wild" || openingCard.value === "skip" || openingCard.value === "reverse" || openingCard.value === "+2")) {
    deck.push(openingCard);
    openingCard = deck.shift();
  }

  if (!openingCard || openingCard.color === "wild") {
    openingCard = { id: createId("uno"), color: "red", value: "0" };
  }

  return {
    status: "playing",
    players,
    currentPlayerIndex: 0,
    direction: 1,
    discardPile: [openingCard],
    drawPile: deck,
    activeColor: openingCard.color as UnoPlayableColor,
    winnerId: null,
    lastAction: `${players[0]?.name ?? "Player 1"} starts the UNO round.`,
    startedAt: now,
    updatedAt: now,
  } satisfies UnoGame;
}

function getDefaultSelectedPlayerIds(memberList: HouseholdMember[], preferredIds: string[] = []) {
  const validPreferredIds = preferredIds.filter((memberId) => memberList.some((member) => member.id === memberId));
  if (validPreferredIds.length >= 2) {
    return validPreferredIds.slice(0, 6);
  }

  const fallbackIds = memberList.slice(0, 4).map((member) => member.id);
  return (fallbackIds.length >= 2 ? fallbackIds : memberList.map((member) => member.id).slice(0, 2)).slice(0, 6);
}

function playUnoCard(game: UnoGame, cardId: string, chosenColor?: UnoPlayableColor): UnoGame {
  const currentPlayer = game.players[game.currentPlayerIndex];
  const card = currentPlayer?.hand.find((entry) => entry.id === cardId);
  if (!currentPlayer || !card || !isPlayableCard(card, game)) {
    return game;
  }

  const nextPlayers = game.players.map((player, index) =>
    index === game.currentPlayerIndex
      ? { ...player, hand: player.hand.filter((entry) => entry.id !== cardId) }
      : player,
  );
  let nextGame: UnoGame = {
    ...game,
    players: nextPlayers,
    discardPile: [...game.discardPile, card],
    activeColor: card.color === "wild" ? chosenColor ?? game.activeColor : card.color,
    updatedAt: new Date().toISOString(),
  };

  const remainingHand = nextPlayers[game.currentPlayerIndex]?.hand.length ?? 0;
  if (remainingHand === 0) {
    return {
      ...nextGame,
      status: "finished",
      winnerId: currentPlayer.memberId,
      lastAction: `${currentPlayer.name} wins the UNO round!`,
      currentPlayerIndex: game.currentPlayerIndex,
    };
  }

  let direction = game.direction;
  let nextPlayerIndex = getNextIndex(nextPlayers.length, game.currentPlayerIndex, direction);
  let actionNote = `${currentPlayer.name} played ${getUnoCardLabel(card)}.`;

  if (card.value === "reverse") {
    direction = game.direction === 1 ? -1 : 1;
    nextPlayerIndex =
      nextPlayers.length === 2
        ? game.currentPlayerIndex
        : getNextIndex(nextPlayers.length, game.currentPlayerIndex, direction);
    actionNote = `${currentPlayer.name} flipped the round.`;
  } else if (card.value === "skip") {
    const skippedIndex = nextPlayerIndex;
    nextPlayerIndex = getNextIndex(nextPlayers.length, skippedIndex, direction);
    actionNote = `${currentPlayer.name} skipped ${game.players[skippedIndex]?.name ?? "the next player"}.`;
  } else if (card.value === "+2") {
    const targetIndex = nextPlayerIndex;
    nextGame = drawCards(nextGame, targetIndex, 2);
    nextPlayerIndex = getNextIndex(nextPlayers.length, targetIndex, direction);
    actionNote = `${currentPlayer.name} made ${game.players[targetIndex]?.name ?? "the next player"} draw two cards.`;
  } else if (card.value === "+4") {
    const targetIndex = nextPlayerIndex;
    nextGame = drawCards(nextGame, targetIndex, 4);
    nextPlayerIndex = getNextIndex(nextPlayers.length, targetIndex, direction);
    actionNote = `${currentPlayer.name} played Wild +4 and switched to ${getUnoColorLabel(nextGame.activeColor)}.`;
  } else if (card.value === "wild") {
    actionNote = `${currentPlayer.name} switched the table to ${getUnoColorLabel(nextGame.activeColor)}.`;
  }

  return {
    ...nextGame,
    direction,
    currentPlayerIndex: nextPlayerIndex,
    lastAction: actionNote,
  };
}

function drawUnoForCurrent(game: UnoGame): UnoGame {
  const currentPlayer = game.players[game.currentPlayerIndex];
  const nextGame = drawCards(game, game.currentPlayerIndex, 1);
  return {
    ...nextGame,
    currentPlayerIndex: getNextIndex(game.players.length, game.currentPlayerIndex, game.direction),
    lastAction: `${currentPlayer?.name ?? "The current player"} drew a card and passed the turn.`,
    updatedAt: new Date().toISOString(),
  };
}

function getArcadeLeaderboard(gameRoom: GameRoomState) {
  return [...gameRoom.arcadeRuns].sort((left, right) => right.score - left.score).slice(0, 6);
}

function createIdleArcadeState(selectedMemberId: string, lastRun: ArcadeRun | null): ArcadeRuntime {
  return {
    mode: "idle",
    selectedMemberId,
    playerX: ARCADE_WIDTH / 2,
    score: 0,
    starsCaught: 0,
    cloudsDodged: 0,
    timeLeftMs: ARCADE_DURATION_MS,
    spawnCarryMs: 0,
    things: [],
    lastRun,
  };
}

function buildArcadeRun(runtime: ArcadeRuntime, memberList: HouseholdMember[]) {
  const member = memberList.find((entry) => entry.id === runtime.selectedMemberId);
  return {
    id: createId("arcade-run"),
    memberId: runtime.selectedMemberId,
    memberName: member?.name ?? "Family player",
    score: Math.max(0, runtime.score),
    starsCaught: runtime.starsCaught,
    cloudsDodged: runtime.cloudsDodged,
    playedAt: new Date().toISOString(),
  } satisfies ArcadeRun;
}

function getThingColor(kind: FallingThing["kind"]) {
  return kind === "star" ? "#f3d773" : "#b0b6c8";
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderArcadeCanvas(ctx: CanvasRenderingContext2D, runtime: ArcadeRuntime, topScore: number) {
  ctx.clearRect(0, 0, ARCADE_WIDTH, ARCADE_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, ARCADE_HEIGHT);
  gradient.addColorStop(0, "#102041");
  gradient.addColorStop(0.52, "#203c7a");
  gradient.addColorStop(1, "#f5efe0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ARCADE_WIDTH, ARCADE_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let index = 0; index < 28; index += 1) {
    ctx.beginPath();
    ctx.arc(((index * 47) % ARCADE_WIDTH) + 12, ((index * 59) % 180) + 18, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(ctx, 24, 20, 280, 102, 24);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 15px Aptos";
  ctx.fillText("Family Star Sprint", 42, 52);
  ctx.font = "600 13px Aptos";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`Score ${runtime.score}`, 42, 78);
  ctx.fillText(`Stars ${runtime.starsCaught}`, 42, 98);
  ctx.fillText(`Dodged ${runtime.cloudsDodged}`, 142, 98);
  ctx.fillText(`Best ${topScore}`, 142, 78);
  ctx.fillText(`Time ${Math.max(0, Math.ceil(runtime.timeLeftMs / 1000))}s`, 224, 78);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  drawRoundedRect(ctx, 0, PLAYER_Y + 18, ARCADE_WIDTH, 56, 0);
  ctx.fill();

  ctx.fillStyle = "#f0c85b";
  drawRoundedRect(ctx, runtime.playerX - PLAYER_HALF_WIDTH, PLAYER_Y, PLAYER_HALF_WIDTH * 2, 22, 10);
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.fillRect(runtime.playerX - 26, PLAYER_Y - 8, 52, 12);

  for (const thing of runtime.things) {
    if (thing.kind === "star") {
      ctx.fillStyle = getThingColor(thing.kind);
      ctx.beginPath();
      for (let point = 0; point < 5; point += 1) {
        const outerAngle = (Math.PI / 2) + (point * Math.PI * 2) / 5;
        const innerAngle = outerAngle + Math.PI / 5;
        const outerX = thing.x + Math.cos(outerAngle) * thing.radius;
        const outerY = thing.y - Math.sin(outerAngle) * thing.radius;
        const innerX = thing.x + Math.cos(innerAngle) * (thing.radius * 0.45);
        const innerY = thing.y - Math.sin(innerAngle) * (thing.radius * 0.45);
        if (point === 0) {
          ctx.moveTo(outerX, outerY);
        } else {
          ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = getThingColor(thing.kind);
      ctx.beginPath();
      ctx.arc(thing.x - 10, thing.y, 14, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(thing.x + 2, thing.y - 6, 18, Math.PI, Math.PI * 2);
      ctx.arc(thing.x + 18, thing.y + 2, 13, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (runtime.mode !== "playing") {
    ctx.fillStyle = "rgba(9, 11, 18, 0.58)";
    drawRoundedRect(ctx, 220, 122, 480, 158, 28);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 28px Iowan Old Style";
    ctx.fillText(runtime.mode === "finished" ? "Round finished" : "Ready for a quick family run?", 256, 170);
    ctx.font = "500 15px Aptos";
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText("Move left and right, catch bright stars, and avoid storm clouds.", 256, 204);
    ctx.fillText("This round is short enough for kids and adults to take turns fast.", 256, 228);
    if (runtime.lastRun) {
      ctx.fillText(`Last score: ${runtime.lastRun.memberName} scored ${runtime.lastRun.score}.`, 256, 258);
    }
  }
}

function renderUnoCanvas(ctx: CanvasRenderingContext2D, game: UnoGame | null, players: HouseholdMember[]) {
  ctx.clearRect(0, 0, ARCADE_WIDTH, ARCADE_HEIGHT);

  const felt = ctx.createLinearGradient(0, 0, ARCADE_WIDTH, ARCADE_HEIGHT);
  felt.addColorStop(0, "#133020");
  felt.addColorStop(1, "#0b1811");
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, ARCADE_WIDTH, ARCADE_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(ctx, 18, 18, ARCADE_WIDTH - 36, ARCADE_HEIGHT - 36, 36);
  ctx.fill();

  ctx.strokeStyle = "rgba(244, 220, 158, 0.38)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 40, 42, ARCADE_WIDTH - 80, ARCADE_HEIGHT - 84, 120);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 16px Aptos";
  ctx.fillText("Family UNO Table", 42, 52);

  if (!game) {
    ctx.font = "700 32px Iowan Old Style";
    ctx.fillText("Deal a round and pass the phone around.", 170, 164);
    ctx.font = "500 16px Aptos";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Pick 2 to 6 family members, tap Start UNO, and the table is ready.", 208, 200);
    ctx.fillText(`${players.length} household member${players.length === 1 ? "" : "s"} can join the round.`, 256, 228);
    return;
  }

  const topCard = game.discardPile[game.discardPile.length - 1];
  const currentPlayer = game.players[game.currentPlayerIndex];

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  drawRoundedRect(ctx, 140, 122, 160, 190, 24);
  drawRoundedRect(ctx, 338, 122, 160, 190, 24);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 14px Aptos";
  ctx.fillText("Draw pile", 190, 152);
  ctx.fillText("Top card", 394, 152);

  ctx.fillStyle = "rgba(17,17,17,0.48)";
  drawRoundedRect(ctx, 172, 166, 96, 128, 18);
  ctx.fill();

  const cardColor = topCard.color === "wild" ? game.activeColor : topCard.color;
  ctx.fillStyle =
    cardColor === "red"
      ? "#d85858"
      : cardColor === "blue"
        ? "#3c7be0"
        : cardColor === "green"
          ? "#2e9c61"
          : "#d7af34";
  drawRoundedRect(ctx, 370, 166, 96, 128, 18);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px Iowan Old Style";
  ctx.fillText(getUnoCardLabel(topCard), 388, 236);
  ctx.font = "600 14px Aptos";
  ctx.fillText(`Color ${getUnoColorLabel(game.activeColor)}`, 384, 264);

  ctx.font = "700 24px Iowan Old Style";
  ctx.fillText(currentPlayer ? `${currentPlayer.name} is up` : "UNO table ready", 542, 152);
  ctx.font = "500 15px Aptos";
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(game.lastAction, 542, 184);
  ctx.fillText(`Draw pile ${game.drawPile.length} · Discard pile ${game.discardPile.length}`, 542, 212);
  ctx.fillText(game.status === "finished" ? "Round finished" : "Pass the device to the current player.", 542, 240);

  game.players.forEach((player, index) => {
    const x = 540;
    const y = 272 + index * 28;
    ctx.fillStyle = index === game.currentPlayerIndex ? "#f3d773" : "rgba(255,255,255,0.74)";
    ctx.font = index === game.currentPlayerIndex ? "700 14px Aptos" : "500 14px Aptos";
    ctx.fillText(`${player.name} · ${player.hand.length} card${player.hand.length === 1 ? "" : "s"}`, x, y);
  });
}

export function GameRoomPage({
  currentUserId,
  memberList,
  gameRoom,
  familyQuestBoard,
  initialView = "arcade",
  onSelectArcadeMember,
  onSaveArcadeRun,
  onSaveUnoGame,
  onRedeemFamilyReward,
}: Props) {
  const [activeView, setActiveView] = useState<GameView>(initialView);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    return getDefaultSelectedPlayerIds(
      memberList,
      gameRoom.uno?.players.map((player) => player.memberId) ?? [],
    );
  });
  const [wildSelection, setWildSelection] = useState<string | null>(null);
  const initialArcadeState = createIdleArcadeState(
    gameRoom.selectedArcadeMemberId ?? currentUserId,
    gameRoom.arcadeRuns[0] ?? null,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const arcadeStateRef = useRef<ArcadeRuntime>(initialArcadeState);
  const [arcadeSnapshot, setArcadeSnapshot] = useState<ArcadeRuntime>(initialArcadeState);

  const arcadeLeaderboard = useMemo(() => getArcadeLeaderboard(gameRoom), [gameRoom]);
  const topArcadeRun = arcadeLeaderboard[0] ?? null;
  const currentArcadeMemberId =
    gameRoom.selectedArcadeMemberId && memberList.some((member) => member.id === gameRoom.selectedArcadeMemberId)
      ? gameRoom.selectedArcadeMemberId
      : memberList[0]?.id ?? currentUserId;
  const activeUnoGame = gameRoom.uno;
  const effectiveSelectedPlayerIds = useMemo(
    () =>
      activeUnoGame?.players.length
        ? activeUnoGame.players.map((player) => player.memberId)
        : getDefaultSelectedPlayerIds(memberList, selectedPlayerIds),
    [activeUnoGame, memberList, selectedPlayerIds],
  );
  const currentUnoPlayer = activeUnoGame?.players[activeUnoGame.currentPlayerIndex] ?? null;
  const currentUnoHand = currentUnoPlayer?.hand ?? [];
  const activeQuests = familyQuestBoard.quests.slice(0, 3);
  const recentUnoWinners = gameRoom.unoWins.slice(0, 3);

  useEffect(() => {
    const nextLastRun = arcadeLeaderboard[0] ?? arcadeStateRef.current.lastRun;
    arcadeStateRef.current = {
      ...arcadeStateRef.current,
      selectedMemberId: currentArcadeMemberId,
      lastRun: nextLastRun ?? null,
    };
    setArcadeSnapshot({ ...arcadeStateRef.current });
  }, [arcadeLeaderboard, currentArcadeMemberId]);

  function renderCurrentCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    if (activeView === "arcade") {
      renderArcadeCanvas(context, arcadeStateRef.current, topArcadeRun?.score ?? 0);
    } else {
      renderUnoCanvas(context, activeUnoGame, memberList);
    }
  }

  function finishArcadeRound() {
    const finishedRun = buildArcadeRun(arcadeStateRef.current, memberList);
    arcadeStateRef.current = {
      ...arcadeStateRef.current,
      mode: "finished",
      score: finishedRun.score,
      lastRun: finishedRun,
      timeLeftMs: 0,
    };
    setArcadeSnapshot({ ...arcadeStateRef.current });
    onSaveArcadeRun(finishedRun);
  }

  function stepArcade(ms: number) {
    const runtime = arcadeStateRef.current;
    if (runtime.mode !== "playing") {
      return;
    }

    const dt = ms / 1000;
    const nextRuntime = { ...runtime };
    const moveLeft = pressedKeysRef.current.has("ArrowLeft") || pressedKeysRef.current.has("a") || pressedKeysRef.current.has("A");
    const moveRight = pressedKeysRef.current.has("ArrowRight") || pressedKeysRef.current.has("d") || pressedKeysRef.current.has("D");
    const velocity = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
    nextRuntime.playerX = Math.min(ARCADE_WIDTH - PLAYER_HALF_WIDTH, Math.max(PLAYER_HALF_WIDTH, nextRuntime.playerX + velocity * PLAYER_SPEED * dt));
    nextRuntime.timeLeftMs -= ms;
    nextRuntime.spawnCarryMs += ms;

    while (nextRuntime.spawnCarryMs >= 620) {
      nextRuntime.spawnCarryMs -= 620;
      const kind = Math.random() < 0.72 ? "star" : "cloud";
      nextRuntime.things = [
        ...nextRuntime.things,
        {
          id: Date.now() + Math.round(Math.random() * 100000),
          x: 70 + Math.random() * (ARCADE_WIDTH - 140),
          y: -30,
          radius: kind === "star" ? 13 : 18,
          kind,
          speed: kind === "star" ? 120 + Math.random() * 70 : 105 + Math.random() * 55,
          drift: (Math.random() - 0.5) * 35,
        },
      ];
    }

    const caught: FallingThing[] = [];
    const escaped: FallingThing[] = [];
    nextRuntime.things = nextRuntime.things
      .map((thing) => ({
        ...thing,
        x: Math.min(ARCADE_WIDTH - 18, Math.max(18, thing.x + thing.drift * dt)),
        y: thing.y + thing.speed * dt,
      }))
      .filter((thing) => {
        const withinCatchZone =
          Math.abs(thing.x - nextRuntime.playerX) < PLAYER_HALF_WIDTH + 6 &&
          thing.y + thing.radius >= PLAYER_Y - 8 &&
          thing.y - thing.radius <= PLAYER_Y + 20;

        if (withinCatchZone) {
          caught.push(thing);
          return false;
        }

        if (thing.y - thing.radius > ARCADE_HEIGHT) {
          escaped.push(thing);
          return false;
        }

        return true;
      });

    for (const thing of caught) {
      if (thing.kind === "star") {
        nextRuntime.score += 12;
        nextRuntime.starsCaught += 1;
      } else {
        nextRuntime.score = Math.max(0, nextRuntime.score - 10);
      }
    }

    for (const thing of escaped) {
      if (thing.kind === "cloud") {
        nextRuntime.cloudsDodged += 1;
        nextRuntime.score += 4;
      }
    }

    arcadeStateRef.current = nextRuntime;
    setArcadeSnapshot({ ...nextRuntime });

    if (nextRuntime.timeLeftMs <= 0) {
      finishArcadeRound();
    }
  }

  function runArcadeFrame(frameAt: number) {
    if (lastFrameAtRef.current === null) {
      lastFrameAtRef.current = frameAt;
    }

    const delta = Math.min(40, frameAt - lastFrameAtRef.current);
    lastFrameAtRef.current = frameAt;
    stepArcade(delta);
    renderCurrentCanvas();

    if (arcadeStateRef.current.mode === "playing") {
      frameRef.current = window.requestAnimationFrame(runArcadeFrame);
    }
  }

  function startArcadeRound() {
    arcadeStateRef.current = createIdleArcadeState(currentArcadeMemberId, topArcadeRun);
    arcadeStateRef.current.mode = "playing";
    setArcadeSnapshot({ ...arcadeStateRef.current });
    lastFrameAtRef.current = null;
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = window.requestAnimationFrame(runArcadeFrame);
  }

  function nudgeArcade(direction: -1 | 1) {
    const runtime = arcadeStateRef.current;
    runtime.playerX = Math.min(ARCADE_WIDTH - PLAYER_HALF_WIDTH, Math.max(PLAYER_HALF_WIDTH, runtime.playerX + direction * 42));
    arcadeStateRef.current = { ...runtime };
    setArcadeSnapshot({ ...runtime });
    renderCurrentCanvas();
  }

  function toggleUnoPlayer(memberId: string) {
    setSelectedPlayerIds((current) => {
      const baseSelection = getDefaultSelectedPlayerIds(memberList, current);
      const exists = baseSelection.includes(memberId);
      if (exists) {
        return baseSelection.length <= 2 ? baseSelection : baseSelection.filter((entry) => entry !== memberId);
      }

      return baseSelection.length >= 6 ? baseSelection : [...baseSelection, memberId];
    });
  }

  function handleStartUno() {
    const participants = memberList.filter((member) => effectiveSelectedPlayerIds.includes(member.id)).slice(0, 6);
    if (participants.length < 2) {
      return;
    }

    setWildSelection(null);
    onSaveUnoGame(createUnoGame(participants));
  }

  function handlePlayUnoCard(card: UnoCard, colorChoice?: UnoPlayableColor) {
    if (!activeUnoGame || activeUnoGame.status === "finished") {
      return;
    }

    if (card.color === "wild" && !colorChoice) {
      setWildSelection(card.id);
      return;
    }

    setWildSelection(null);
    onSaveUnoGame(playUnoCard(activeUnoGame, card.id, colorChoice));
  }

  function handleDrawUnoCard() {
    if (!activeUnoGame || activeUnoGame.status === "finished") {
      return;
    }

    setWildSelection(null);
    onSaveUnoGame(drawUnoForCurrent(activeUnoGame));
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeView === "arcade") {
        pressedKeysRef.current.add(event.key);
        if (event.key === " " && arcadeStateRef.current.mode !== "playing") {
          event.preventDefault();
          startArcadeRound();
        }
      }

      if (event.key.toLowerCase() === "f") {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        if (!document.fullscreenElement) {
          void canvas.requestFullscreen?.();
        } else {
          void document.exitFullscreen?.();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeView, currentArcadeMemberId, topArcadeRun]);

  useEffect(() => {
    renderCurrentCanvas();
  }, [activeView, arcadeSnapshot, activeUnoGame, topArcadeRun, memberList]);

  useEffect(() => {
    const boundWindow = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    };

    boundWindow.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem: "canvas origin at top-left; x grows right, y grows down",
        view: activeView,
        arcade:
          activeView === "arcade"
            ? {
                mode: arcadeStateRef.current.mode,
                selectedMemberId: arcadeStateRef.current.selectedMemberId,
                score: arcadeStateRef.current.score,
                starsCaught: arcadeStateRef.current.starsCaught,
                cloudsDodged: arcadeStateRef.current.cloudsDodged,
                timeLeftMs: arcadeStateRef.current.timeLeftMs,
                player: { x: Math.round(arcadeStateRef.current.playerX), y: PLAYER_Y },
                things: arcadeStateRef.current.things.map((thing) => ({
                  id: thing.id,
                  kind: thing.kind,
                  x: Math.round(thing.x),
                  y: Math.round(thing.y),
                })),
              }
            : null,
        uno:
          activeView === "uno"
            ? {
                status: activeUnoGame?.status ?? "idle",
                activeColor: activeUnoGame?.activeColor ?? null,
                currentPlayer: currentUnoPlayer?.name ?? null,
                topCard: activeUnoGame?.discardPile.at(-1) ?? null,
                playerHands: activeUnoGame?.players.map((player) => ({ name: player.name, cards: player.hand.length })) ?? [],
                lastAction: activeUnoGame?.lastAction ?? "No round yet.",
              }
            : null,
      });

    boundWindow.advanceTime = (ms: number) => {
      if (activeView === "arcade") {
        const frameMs = 1000 / 60;
        const steps = Math.max(1, Math.round(ms / frameMs));
        for (let index = 0; index < steps; index += 1) {
          stepArcade(frameMs);
        }
        renderCurrentCanvas();
      } else {
        renderCurrentCanvas();
      }
    };

    return () => {
      delete boundWindow.render_game_to_text;
      delete boundWindow.advanceTime;
    };
  }, [activeView, activeUnoGame, currentUnoPlayer, memberList, topArcadeRun]);

  useEffect(
    () => () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  return (
    <div className="space-y-5">
      <article className="family-route-shell family-route-shell--games family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="family-route-shell__header">
          <div>
            <p className="family-kicker family-eyebrow">Game Room</p>
            <h3 className="mt-4 font-serif text-5xl leading-[0.95] text-[var(--foreground)]">Play together without leaving FamilyFlow.</h3>
          </div>
          <div className="family-route-chip">Game night</div>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Pick a quick arcade round for instant fun or start a pass-and-play UNO table for the whole family.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveView("arcade")}
            className={`family-partner-tab ${activeView === "arcade" ? "family-partner-tab-active" : ""}`}
          >
            Star Sprint
          </button>
          <button
            type="button"
            onClick={() => setActiveView("uno")}
            className={`family-partner-tab ${activeView === "uno" ? "family-partner-tab-active" : ""}`}
          >
            UNO Table
          </button>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="family-panel family-route-board family-route-board--games family-animate-rise rounded-[30px] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="family-kicker family-eyebrow">{activeView === "arcade" ? "Arcade game" : "Card table"}</p>
              <h3 className="mt-3 font-serif text-4xl leading-tight">
                {activeView === "arcade" ? "Family Star Sprint" : "Pass-and-play UNO"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {activeView === "arcade"
                  ? "Move left and right, catch glowing stars, and dodge storm clouds. Every run is short so everyone gets a turn."
                  : "Pick the players, deal the cards, and pass the device to the current player each turn."}
              </p>
            </div>
            <span className={`family-badge ${activeView === "arcade" ? "family-badge-gold" : "family-badge-accent"}`}>
              {activeView === "arcade" ? arcadeSnapshot.mode : activeUnoGame?.status ?? "ready"}
            </span>
          </div>

          <div className="family-game-canvas-shell mt-5">
            <canvas
              ref={canvasRef}
              className="family-game-canvas"
              width={ARCADE_WIDTH}
              height={ARCADE_HEIGHT}
            />
          </div>

          {activeView === "arcade" ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-stone-700">
                  Player
                  <select
                    value={currentArcadeMemberId}
                    onChange={(event) => onSelectArcadeMember(event.target.value)}
                    className="family-select ml-2 inline-flex w-auto min-w-[10rem]"
                  >
                    {memberList.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={startArcadeRound} className="family-btn family-btn-primary">
                  {arcadeSnapshot.mode === "playing" ? "Restart run" : "Start run"}
                </button>
                <button type="button" onClick={() => nudgeArcade(-1)} className="family-btn family-btn-soft">
                  Move left
                </button>
                <button type="button" onClick={() => nudgeArcade(1)} className="family-btn family-btn-soft">
                  Move right
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="family-list-card">
                  <p className="family-kicker family-eyebrow">How to play</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Use arrow keys or the move buttons. Catch stars, avoid clouds, and chase the family high score.</p>
                </div>
                <div className="family-list-card">
                  <p className="family-kicker family-eyebrow">Live score</p>
                  <p className="mt-3 font-serif text-3xl">{arcadeSnapshot.score}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Stars {arcadeSnapshot.starsCaught} · Dodged {arcadeSnapshot.cloudsDodged}</p>
                </div>
                <div className="family-list-card">
                  <p className="family-kicker family-eyebrow">Best run</p>
                  <p className="mt-3 font-serif text-3xl">{topArcadeRun ? topArcadeRun.score : "Open"}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {topArcadeRun ? `${topArcadeRun.memberName} is leading the room.` : "No one has played yet."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-[1.04fr_0.96fr]">
                <div className="family-list-card">
                  <p className="family-kicker family-eyebrow">Players at the table</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                      {memberList.map((member) => {
                        const selected = effectiveSelectedPlayerIds.includes(member.id);
                        return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleUnoPlayer(member.id)}
                          className={`family-btn ${selected ? "family-btn-primary" : "family-btn-soft"}`}
                        >
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Pick 2 to 6 family members, then start a fresh round.</p>
                </div>
                <div className="family-list-card">
                  <p className="family-kicker family-eyebrow">Table actions</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleStartUno}
                      className="family-btn family-btn-primary"
                      disabled={effectiveSelectedPlayerIds.length < 2}
                    >
                      Start UNO
                    </button>
                    <button type="button" onClick={() => onSaveUnoGame(null)} className="family-btn family-btn-secondary">
                      Clear table
                    </button>
                    {activeUnoGame?.status === "playing" ? (
                      <button type="button" onClick={handleDrawUnoCard} className="family-btn family-btn-soft">
                        Draw card
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                    {activeUnoGame ? activeUnoGame.lastAction : "No round has started yet."}
                  </p>
                </div>
              </div>

              {activeUnoGame ? (
                <div className="grid gap-4 lg:grid-cols-[0.76fr_1.24fr]">
                  <div className="family-list-card">
                    <p className="family-kicker family-eyebrow">Scoreboard</p>
                    <div className="mt-4 space-y-3">
                      {activeUnoGame.players.map((player, index) => (
                        <div key={player.memberId} className={`family-uno-seat ${index === activeUnoGame.currentPlayerIndex ? "family-uno-seat-active" : ""}`}>
                          <div>
                            <p className="font-semibold text-stone-900">{player.name}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">{player.hand.length} card{player.hand.length === 1 ? "" : "s"}</p>
                          </div>
                          <span className={`family-badge ${index === activeUnoGame.currentPlayerIndex ? "family-badge-accent" : "family-badge-warm"}`}>
                            {index === activeUnoGame.currentPlayerIndex ? "Turn" : "Waiting"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="family-list-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">Current hand</p>
                        <h4 className="mt-3 font-serif text-3xl leading-tight">
                          {currentUnoPlayer ? `${currentUnoPlayer.name}, your move.` : "Deal the cards to start."}
                        </h4>
                      </div>
                      <span className="family-badge family-badge-gold">
                        {activeUnoGame.status === "finished"
                          ? "Round done"
                          : `Color ${getUnoColorLabel(activeUnoGame.activeColor)}`}
                      </span>
                    </div>

                    {wildSelection ? (
                      <div className="family-uno-wild-picker mt-5">
                        <p className="text-sm font-semibold text-stone-800">Choose a color for the wild card.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {UNO_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                const card = currentUnoHand.find((entry) => entry.id === wildSelection);
                                if (card) {
                                  handlePlayUnoCard(card, color);
                                }
                              }}
                              className={`family-btn family-btn-soft family-uno-color-btn family-uno-color-btn--${color}`}
                            >
                              {getUnoColorLabel(color)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="family-uno-hand mt-5">
                      {currentUnoHand.length > 0 ? (
                        currentUnoHand.map((card) => {
                          const playable = activeUnoGame.status === "playing" && isPlayableCard(card, activeUnoGame);
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => handlePlayUnoCard(card)}
                              disabled={!playable || activeUnoGame.status !== "playing"}
                              className={`family-uno-card family-uno-card--${card.color === "wild" ? activeUnoGame.activeColor : card.color} ${playable ? "family-uno-card-playable" : ""}`}
                            >
                              <span className="family-kicker text-white/80">{card.color === "wild" ? "Wild" : getUnoColorLabel(card.color as UnoPlayableColor)}</span>
                              <span className="mt-2 block font-serif text-3xl text-white">{getUnoCardLabel(card)}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                          Deal the first round or wait for the next hand to appear.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <article className="family-card family-card-gold rounded-[28px] p-6">
            <p className="family-kicker family-eyebrow">Game picker</p>
            <h3 className="mt-4 font-serif text-4xl leading-tight">
              {activeView === "arcade" ? "Fast turns for everyone." : "A family classic."}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {activeView === "arcade"
                ? "Star Sprint is built for quick, cheerful turns so kids and adults can jump in without learning much."
                : "UNO stays familiar: match color or number, use action cards, and pass the device when the turn changes."}
            </p>
          </article>

          <article className="family-panel rounded-[28px] p-6">
            <p className="family-kicker family-eyebrow">{activeView === "arcade" ? "Leaderboard" : "Table guide"}</p>
            <div className="mt-4 space-y-3">
              {activeView === "arcade" ? (
                arcadeLeaderboard.length > 0 ? (
                  arcadeLeaderboard.map((run, index) => (
                    <div key={run.id} className="family-game-leaderboard-row">
                      <div>
                        <p className="font-semibold text-stone-900">
                          #{index + 1} {run.memberName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {run.starsCaught} stars · {run.cloudsDodged} dodges
                        </p>
                      </div>
                      <span className="family-badge family-badge-accent">{run.score}</span>
                    </div>
                  ))
                ) : (
                  <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                    The leaderboard is empty. Start the first run and set the tone for game night.
                  </div>
                )
              ) : (
                <>
                  {recentUnoWinners.length > 0 ? (
                    recentUnoWinners.map((win) => (
                      <div key={win.id} className="family-game-leaderboard-row">
                        <div>
                          <p className="font-semibold text-stone-900">{win.winnerName}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">Won a round on {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(win.playedAt))}</p>
                        </div>
                        <span className="family-badge family-badge-accent">UNO</span>
                      </div>
                    ))
                  ) : null}
                  <div className="family-game-leaderboard-row">
                    <div>
                      <p className="font-semibold text-stone-900">Match color or symbol</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">Play the same color, the same number, or use a wild card.</p>
                    </div>
                  </div>
                  <div className="family-game-leaderboard-row">
                    <div>
                      <p className="font-semibold text-stone-900">Pass-and-play</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">The screen always shows the current player. Hand the device over each turn.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>

          <article className="family-card family-card-dark rounded-[28px] p-6">
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Family quests</p>
            <h3 className="mt-4 font-serif text-4xl leading-tight text-white">{familyQuestBoard.sharedPoints} shared points in the bank.</h3>
            <div className="mt-5 space-y-3">
              {activeQuests.map((quest) => (
                <div key={quest.id} className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{quest.title}</p>
                      <p className="mt-2 text-sm leading-7 text-stone-200">{quest.detail}</p>
                    </div>
                    <span className="family-badge family-badge-gold">{quest.progress}/{quest.target}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(241,214,136,0.9)]">
                    {quest.completedAt ? `${quest.rewardTitle} unlocked` : `${quest.rewardPoints} shared points`}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="family-panel rounded-[28px] p-6">
            <p className="family-kicker family-eyebrow">Shared reward shelf</p>
            <div className="mt-4 space-y-3">
              {familyQuestBoard.rewards.slice(0, 3).map((reward) => (
                <div key={reward.id} className="family-game-leaderboard-row">
                  <div>
                    <p className="font-semibold text-stone-900">{reward.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{reward.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRedeemFamilyReward(reward.id)}
                    disabled={familyQuestBoard.sharedPoints < reward.cost}
                    className="family-btn family-btn-secondary"
                  >
                    {reward.cost} pts
                  </button>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
