import { createSessionClient } from "./session-client.js";

const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const playerNameElement = document.getElementById("player-name");
const householdNameElement = document.getElementById("household-name");
const returnLinkElement = document.getElementById("return-link");
const scoreValueElement = document.getElementById("score-value");
const starsValueElement = document.getElementById("stars-value");
const dodgedValueElement = document.getElementById("dodged-value");
const timeValueElement = document.getElementById("time-value");
const bestValueElement = document.getElementById("best-value");
const startButton = document.getElementById("start-button");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");
const saveFeedbackElement = document.getElementById("save-feedback");

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const PLAYER_WIDTH = 124;
const PLAYER_HEIGHT = 26;
const PLAYER_Y = GAME_HEIGHT - 78;
const PLAYER_SPEED = 460;
const ROUND_DURATION_MS = 35000;

const state = {
  mode: "loading",
  session: null,
  playerX: GAME_WIDTH / 2,
  score: 0,
  starsCaught: 0,
  cloudsDodged: 0,
  timeLeftMs: ROUND_DURATION_MS,
  spawnCarryMs: 0,
  things: [],
  save: {
    saving: false,
    saved: false,
    message: "",
  },
};

const pressedKeys = new Set();
let animationFrameId = null;
let lastFrameAt = null;
let sessionClient = null;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createThing() {
  const kind = Math.random() < 0.72 ? "star" : "cloud";
  return {
    id: Date.now() + Math.round(Math.random() * 100000),
    x: randomBetween(60, GAME_WIDTH - 60),
    y: -24,
    radius: kind === "star" ? 18 : 24,
    speed: kind === "star" ? randomBetween(165, 245) : randomBetween(135, 205),
    drift: randomBetween(-42, 42),
    kind,
  };
}

function resetRound() {
  state.mode = "playing";
  state.playerX = GAME_WIDTH / 2;
  state.score = 0;
  state.starsCaught = 0;
  state.cloudsDodged = 0;
  state.timeLeftMs = ROUND_DURATION_MS;
  state.spawnCarryMs = 0;
  state.things = [];
  state.save = {
    saving: false,
    saved: false,
    message: "",
  };
  lastFrameAt = null;
  startLoop();
  render();
}

function startLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  const tick = (timestamp) => {
    if (state.mode !== "playing") {
      animationFrameId = null;
      return;
    }

    if (lastFrameAt === null) {
      lastFrameAt = timestamp;
    }

    const delta = Math.min(40, timestamp - lastFrameAt);
    lastFrameAt = timestamp;
    step(delta);
    render();
    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);
}

function step(ms) {
  if (state.mode !== "playing") {
    return;
  }

  const dt = ms / 1000;
  const moveLeft = pressedKeys.has("ArrowLeft") || pressedKeys.has("a") || pressedKeys.has("A");
  const moveRight = pressedKeys.has("ArrowRight") || pressedKeys.has("d") || pressedKeys.has("D");
  const velocity = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

  state.playerX = Math.min(
    GAME_WIDTH - PLAYER_WIDTH / 2,
    Math.max(PLAYER_WIDTH / 2, state.playerX + velocity * PLAYER_SPEED * dt),
  );

  state.timeLeftMs -= ms;
  state.spawnCarryMs += ms;

  while (state.spawnCarryMs >= 560) {
    state.spawnCarryMs -= 560;
    state.things.push(createThing());
  }

  const nextThings = [];
  for (const thing of state.things) {
    const nextThing = {
      ...thing,
      x: Math.min(GAME_WIDTH - 24, Math.max(24, thing.x + thing.drift * dt)),
      y: thing.y + thing.speed * dt,
    };

    const hitX = Math.abs(nextThing.x - state.playerX) <= PLAYER_WIDTH / 2 + nextThing.radius * 0.55;
    const hitY = nextThing.y + nextThing.radius >= PLAYER_Y - 2 && nextThing.y - nextThing.radius <= PLAYER_Y + PLAYER_HEIGHT;

    if (hitX && hitY) {
      if (nextThing.kind === "star") {
        state.score += 12;
        state.starsCaught += 1;
      } else {
        state.score = Math.max(0, state.score - 9);
      }
      continue;
    }

    if (nextThing.y > GAME_HEIGHT + 48) {
      if (nextThing.kind === "cloud") {
        state.cloudsDodged += 1;
        state.score += 5;
      }
      continue;
    }

    nextThings.push(nextThing);
  }

  state.things = nextThings;

  if (state.timeLeftMs <= 0) {
    finishRound();
  }
}

function drawRoundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawStar(thing) {
  context.fillStyle = "#f3cf76";
  context.beginPath();
  for (let point = 0; point < 5; point += 1) {
    const outerAngle = Math.PI / 2 + (point * Math.PI * 2) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    const outerX = thing.x + Math.cos(outerAngle) * thing.radius;
    const outerY = thing.y - Math.sin(outerAngle) * thing.radius;
    const innerX = thing.x + Math.cos(innerAngle) * (thing.radius * 0.45);
    const innerY = thing.y - Math.sin(innerAngle) * (thing.radius * 0.45);
    if (point === 0) {
      context.moveTo(outerX, outerY);
    } else {
      context.lineTo(outerX, outerY);
    }
    context.lineTo(innerX, innerY);
  }
  context.closePath();
  context.fill();
}

function drawCloud(thing) {
  context.fillStyle = "#b1bfd8";
  context.beginPath();
  context.arc(thing.x - 14, thing.y + 4, 18, Math.PI * 0.5, Math.PI * 1.5);
  context.arc(thing.x + 2, thing.y - 4, 24, Math.PI, Math.PI * 2);
  context.arc(thing.x + 20, thing.y + 6, 17, Math.PI * 1.5, Math.PI * 0.5);
  context.closePath();
  context.fill();
}

function renderOverlay() {
  if (state.mode === "playing") {
    return;
  }

  context.fillStyle = "rgba(8, 10, 14, 0.62)";
  drawRoundedRect(220, 184, 840, 230, 34);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 54px Georgia";
  context.fillText(
    state.mode === "finished" ? "Round finished" : state.mode === "error" ? "Game room issue" : "Ready for a fast family run?",
    278,
    262,
  );
  context.font = "500 24px Inter, Segoe UI, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.86)";

  const description =
    state.mode === "finished"
      ? "Catch gold stars, dodge gray storm clouds, and send the run back into FamilyFlow."
      : state.mode === "error"
        ? state.save.message || "Refresh from FamilyFlow and open the game again."
        : "Use the arrow keys or the move buttons. Everyone gets a quick turn, so the game stays lively.";
  context.fillText(description, 278, 308);

  if (state.save.message) {
    context.fillStyle = state.save.message.includes("saved") ? "#8de0a9" : "#f2d287";
    context.fillText(state.save.message, 278, 348);
  }
}

function render() {
  const sky = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#0f1c39");
  sky.addColorStop(0.55, "#224888");
  sky.addColorStop(1, "#f7edd1");
  context.fillStyle = sky;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  context.fillStyle = "rgba(255,255,255,0.12)";
  for (let index = 0; index < 34; index += 1) {
    context.beginPath();
    context.arc(((index * 41) % GAME_WIDTH) + 12, ((index * 63) % 220) + 20, 2, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(255,255,255,0.09)";
  drawRoundedRect(30, 30, 360, 132, 26);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 20px Inter, Segoe UI, sans-serif";
  context.fillText("FamilyFlow Play / Star Sprint", 54, 66);
  context.font = "600 18px Inter, Segoe UI, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.82)";
  context.fillText(`Score ${state.score}`, 54, 102);
  context.fillText(`Stars ${state.starsCaught}`, 54, 130);
  context.fillText(`Dodged ${state.cloudsDodged}`, 178, 130);
  context.fillText(`Time ${Math.max(0, Math.ceil(state.timeLeftMs / 1000))}s`, 178, 102);

  context.fillStyle = "rgba(255,255,255,0.14)";
  drawRoundedRect(0, PLAYER_Y + 26, GAME_WIDTH, 72, 0);
  context.fill();

  context.fillStyle = "#f4cb72";
  drawRoundedRect(state.playerX - PLAYER_WIDTH / 2, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, 12);
  context.fill();
  context.fillStyle = "#101214";
  context.fillRect(state.playerX - 32, PLAYER_Y - 14, 64, 14);

  for (const thing of state.things) {
    if (thing.kind === "star") {
      drawStar(thing);
    } else {
      drawCloud(thing);
    }
  }

  renderOverlay();

  scoreValueElement.textContent = String(state.score);
  starsValueElement.textContent = String(state.starsCaught);
  dodgedValueElement.textContent = String(state.cloudsDodged);
  timeValueElement.textContent = `${Math.max(0, Math.ceil(state.timeLeftMs / 1000))}s`;
  saveFeedbackElement.textContent = state.save.message || "";
  saveFeedbackElement.className = `play-feedback${state.mode === "error" ? " play-feedback-error" : ""}`;
}

async function finishRound() {
  state.mode = "finished";
  render();

  if (!sessionClient || state.save.saving || state.save.saved) {
    return;
  }

  state.save.saving = true;
  state.save.message = "Saving this run back to FamilyFlow...";
  render();

  try {
    const result = await sessionClient.saveStarSprint({
      score: state.score,
      starsCaught: state.starsCaught,
      cloudsDodged: state.cloudsDodged,
    });

    state.save = {
      saving: false,
      saved: true,
      message: `Score saved. ${result.pointsAwarded} profile points earned.`,
    };
    if (typeof result.leaderboardTopScore === "number") {
      bestValueElement.textContent = `Top score is now ${result.leaderboardTopScore}.`;
    }
  } catch (error) {
    state.save = {
      saving: false,
      saved: false,
      message: error instanceof Error ? error.message : "The run could not be saved this time.",
    };
    state.mode = "error";
  }

  render();
}

function bindHoldButton(button, key) {
  const press = () => pressedKeys.add(key);
  const release = () => pressedKeys.delete(key);
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
}

function renderGameToText() {
  return JSON.stringify({
    coordinateSystem: "origin: top-left; x increases right; y increases downward",
    mode: state.mode,
    player: {
      x: Math.round(state.playerX),
      y: PLAYER_Y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    },
    entities: state.things.map((thing) => ({
      id: thing.id,
      x: Math.round(thing.x),
      y: Math.round(thing.y),
      radius: thing.radius,
      kind: thing.kind,
    })),
    score: state.score,
    starsCaught: state.starsCaught,
    cloudsDodged: state.cloudsDodged,
    timeLeftMs: Math.max(0, Math.round(state.timeLeftMs)),
    saveMessage: state.save.message,
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const frameMs = 1000 / 60;
  const steps = Math.max(1, Math.round(ms / frameMs));
  for (let index = 0; index < steps; index += 1) {
    step(frameMs);
  }
  render();
};

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key.toLowerCase() === "a" || event.key.toLowerCase() === "d") {
    pressedKeys.add(event.key);
  }
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.key);
});

startButton.addEventListener("click", () => {
  resetRound();
});

bindHoldButton(leftButton, "ArrowLeft");
bindHoldButton(rightButton, "ArrowRight");

render();

async function boot() {
  try {
    sessionClient = createSessionClient();
    const session = await sessionClient.getSession();
    state.session = session;
    state.mode = "ready";
    playerNameElement.textContent = session.player.name;
    householdNameElement.textContent = session.household.name;
    returnLinkElement.href = session.returnUrl;
    if (session.topArcadeRun) {
      bestValueElement.textContent = `${session.topArcadeRun.memberName} leads with ${session.topArcadeRun.score}.`;
    } else {
      bestValueElement.textContent = "No score is saved yet. Set the first one.";
    }
    render();
  } catch (error) {
    state.mode = "error";
    state.save.message = error instanceof Error ? error.message : "The launch session could not be opened.";
    render();
  }
}

boot();
