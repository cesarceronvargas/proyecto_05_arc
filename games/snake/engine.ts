// Snake engine: all game state lives in this closure, React only gets callbacks.
import {
  COLS,
  FRUITS_PER_LEVEL,
  H,
  INPUT_BUFFER,
  MAX_LEVEL,
  MAX_SCORE,
  MAX_SPEED,
  POINTS_PER_FRUIT,
  ROWS,
  SPEED_STEP,
  START_LENGTH,
  START_SPEED,
  W,
  drawBackground,
  drawFruit,
  drawSnake,
  type Cell,
  type Dir,
} from "./entities";
import { FRUIT_KEYS, type FruitKey } from "./sprites";

export type SnakeCallbacks = {
  onScore: (score: number) => void;
  onLength: (length: number) => void; // 3 at the start, up to 300
  onLevel: (level: number) => void; // 1..10
  onPauseChange: (paused: boolean) => void; // also when pausing automatically (blur/visibility)
  onStart: () => void; // the run goes from "ready" to "playing"
  onGameOver: (score: number) => void; // crash or full board; emit() runs first
};

export type SnakeState = "ready" | "playing" | "paused" | "gameover";

export type SnakeGame = {
  start: () => void; // ready -> playing; ignored in any other state
  pause: () => void;
  resume: () => void;
  end: () => void; // FIN button: goes to gameover without calling onGameOver
  restart: () => void; // new run straight into "playing"
  destroy: () => void; // cancels the rAF and removes every listener
};

const FRUITS_URL = "/games/snake/fruits.png";
const MAX_DT = 50; // ms

const TURN_KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const STEP: Record<Dir, Cell> = {
  up: { c: 0, r: -1 },
  down: { c: 0, r: 1 },
  left: { c: -1, r: 0 },
  right: { c: 1, r: 0 },
};

const isGameKey = (code: string) =>
  code in TURN_KEYS || code === "Space" || code === "KeyP" || code === "Escape";

const speedFor = (fruits: number) =>
  Math.min(
    MAX_SPEED,
    START_SPEED + SPEED_STEP * Math.floor(fruits / FRUITS_PER_LEVEL),
  );

const levelFor = (fruits: number) =>
  Math.min(MAX_LEVEL, 1 + Math.floor(fruits / FRUITS_PER_LEVEL));

// Keys typed into form controls belong to them (e.g. the initials input of the game over modal).
function isFormControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName))
  );
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── Game state ──────────────────────────────────────────────────────────────
  let snake: Cell[] = []; // snake[0] is the head
  let dir: Dir = "right";
  const turns: Dir[] = [];
  let fruit: Cell | null = null;
  let fruitKey: FruitKey = FRUIT_KEYS[0];
  let hasFruitKey = false; // the very first fruit has no previous type to avoid
  let fruitsEaten = 0;
  let score = 0;
  let stepClock = 0; // ms accumulated towards the next grid step
  let state: SnakeState = "ready";

  // Last values sent to React, so callbacks only fire on change.
  const sent = { score: -1, length: -1, level: -1 };

  function emit() {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (snake.length !== sent.length) {
      callbacks.onLength((sent.length = snake.length));
    }
    const level = levelFor(fruitsEaten);
    if (level !== sent.level) callbacks.onLevel((sent.level = level));
  }

  // Nothing stays held in this game: the only pending input is the queue of turns.
  function clearKeys() {
    turns.length = 0;
  }

  // Picks from the list of free cells, so it never retries however full the board is.
  function placeFruit() {
    const taken = new Set(snake.map((s) => s.r * COLS + s.c));
    const free: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!taken.has(r * COLS + c)) free.push({ c, r });
      }
    }
    if (free.length === 0) {
      fruit = null;
      return;
    }
    fruit = free[Math.floor(Math.random() * free.length)];

    const types = hasFruitKey
      ? FRUIT_KEYS.filter((key) => key !== fruitKey)
      : FRUIT_KEYS;
    fruitKey = types[Math.floor(Math.random() * types.length)];
    hasFruitKey = true;
  }

  function initGame() {
    const head: Cell = {
      c: Math.floor(COLS / 2),
      r: Math.floor(ROWS / 2),
    };
    snake = Array.from({ length: START_LENGTH }, (_, i) => ({
      c: head.c - i,
      r: head.r,
    }));
    dir = "right";
    clearKeys();
    fruitsEaten = 0;
    score = 0;
    stepClock = 0;
    placeFruit();
  }

  // Lost or won, the run ends the same way.
  function finish() {
    state = "gameover";
    stopLoop();
    clearKeys();
    emit();
    callbacks.onGameOver(score);
    draw();
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function queueTurn(next: Dir) {
    if (turns.length >= INPUT_BUFFER) return;
    const last = turns.length > 0 ? turns[turns.length - 1] : dir;
    if (next === last || next === OPPOSITE[last]) return;
    turns.push(next);
  }

  function step() {
    dir = turns.shift() ?? dir;
    const delta = STEP[dir];
    const next: Cell = { c: snake[0].c + delta.c, r: snake[0].r + delta.r };

    // On a crash the snake stays where it was, so the head is never drawn off the board.
    if (next.c < 0 || next.c >= COLS || next.r < 0 || next.r >= ROWS) {
      finish();
      return;
    }

    const eats = fruit !== null && next.c === fruit.c && next.r === fruit.r;
    // The tail leaves its cell on this same step, unless the snake is growing.
    const body = eats ? snake : snake.slice(0, -1);
    if (body.some((s) => s.c === next.c && s.r === next.r)) {
      finish();
      return;
    }

    snake.unshift(next);
    if (!eats) {
      snake.pop();
      return;
    }

    fruitsEaten++;
    score = Math.min(MAX_SCORE, score + POINTS_PER_FRUIT);
    placeFruit();
    if (fruit === null) finish(); // no free cell left: the board is full
  }

  function update(dt: number) {
    if (state !== "playing") return;
    stepClock += dt * 1000;
    let interval = 1000 / speedFor(fruitsEaten);
    while (state === "playing" && stepClock >= interval) {
      stepClock -= interval;
      step();
      interval = 1000 / speedFor(fruitsEaten);
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    drawBackground(ctx);
    if (fruit) drawFruit(ctx, fruitsImage, fruitKey, fruit);
    drawSnake(ctx, snake, dir);
  }

  // Logical size stays 800×600; the backing store follows devicePixelRatio for crisp lines.
  function fitToDevicePixels() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let raf = 0;
  let lastTime: number | null = null;

  function frame(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT) / 1000;
    lastTime = ts;
    update(dt);
    emit();
    draw();
    if (state === "playing") raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (raf) return;
    lastTime = null; // no dt jump after a pause
    stepClock = 0;
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // ── Controls ────────────────────────────────────────────────────────────────
  // The board set up by initGame is already on screen, so the fruit shown in "ready" stays.
  function start() {
    if (state !== "ready") return;
    state = "playing";
    clearKeys();
    emit();
    callbacks.onStart();
    startLoop();
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    clearKeys();
    stopLoop();
    draw();
    callbacks.onPauseChange(true);
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    clearKeys();
    startLoop();
    callbacks.onPauseChange(false);
  }

  function end() {
    if (state === "ready" || state === "gameover") return;
    const wasPaused = state === "paused";
    state = "gameover";
    clearKeys();
    stopLoop();
    emit();
    if (wasPaused) callbacks.onPauseChange(false);
    draw();
  }

  function restart() {
    const wasPaused = state === "paused";
    stopLoop();
    state = "playing";
    initGame();
    emit();
    if (wasPaused) callbacks.onPauseChange(false);
    startLoop();
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // Browser shortcuts (Ctrl+P, Alt+←…) are not game keys.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isFormControl(e.target) || state === "gameover") return;

    if (state === "ready") {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!e.repeat) start();
      } else if (isGameKey(e.code)) {
        e.preventDefault();
      }
      return;
    }

    if (!isGameKey(e.code)) return;
    e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (state === "paused") resume();
      else pause();
      return;
    }

    if (state === "playing" && e.code in TURN_KEYS) {
      queueTurn(TURN_KEYS[e.code]);
    }
  }

  function onBlur() {
    clearKeys();
    pause();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") pause();
  }

  // The sheet may arrive while nothing is looping (start screen, pause), so it redraws itself.
  // If it fails, drawFruit keeps using the vector fallback.
  const fruitsImage = new Image();
  fruitsImage.onload = () => draw();
  fruitsImage.src = FRUITS_URL;

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", fitToDevicePixels);
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Start screen: the initial snake and the first fruit. The loop only runs while playing.
  initGame();
  fitToDevicePixels();

  return {
    start,
    pause,
    resume,
    end,
    restart,
    destroy() {
      stopLoop();
      fruitsImage.onload = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", fitToDevicePixels);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
