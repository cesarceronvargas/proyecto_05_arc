// Brick-breaking engine: all game state lives in this closure, React only gets callbacks.
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BLOCK_H,
  BLOCK_W,
  EXPLOSION_MS,
  H,
  MAX_SCORE,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  START_LIVES,
  W,
  drawBackground,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./entities";
import { LEVELS } from "./levels";
import { SKINS, type Palette } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "../shared/skins";

export type BreakoutCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // also when pausing automatically (blur/visibility)
  onStart: () => void; // the run goes from "ready" to "playing"
  onGameOver: (score: number) => void; // last life lost or level 5 cleared; emit() runs first
};

export type BreakoutState = "ready" | "playing" | "paused" | "gameover";

export type BreakoutGame = {
  start: () => void; // ready -> playing; ignored in any other state
  pause: () => void;
  resume: () => void;
  end: () => void; // FIN button: goes to gameover without calling onGameOver
  restart: () => void; // new run straight into "playing"
  setSkin: (skin: SkinId) => void; // visual only: redraws at once, the run is untouched
  destroy: () => void; // cancels the rAF and removes every listener
};

export type BreakoutOptions = {
  skin?: SkinId;
};

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyP",
  "Escape",
]);
const MAX_DT = 50; // ms

const clampPaddleX = (x: number) => Math.max(0, Math.min(W - PADDLE_W, x));

// Keys typed into form controls belong to them (e.g. the initials input of the game over modal).
function isFormControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName))
  );
}

export function createBreakoutGame(
  canvas: HTMLCanvasElement,
  callbacks: BreakoutCallbacks,
  options: BreakoutOptions = {},
): BreakoutGame {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── Game state ──────────────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: 0,
    vy: 0,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let state: BreakoutState = "ready";
  let palette: Palette = SKINS[options.skin ?? DEFAULT_SKIN];

  const keys = { ArrowLeft: false, ArrowRight: false };

  // Last values sent to React, so callbacks only fire on change.
  const sent = { score: -1, lives: -1, level: -1 };

  function emit() {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lives !== sent.lives) callbacks.onLives((sent.lives = lives));
    if (level !== sent.level) callbacks.onLevel((sent.level = level));
  }

  function clearKeys() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }

  // Puts the ball on the paddle with the speed of the current level. It leaves immediately.
  function placeBall() {
    const { speed } = LEVELS[level - 1];
    ball.x = paddle.x + (PADDLE_W - BALL_SIZE) / 2;
    ball.y = PADDLE_Y - BALL_SIZE;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall();
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    paddle.x = (W - PADDLE_W) / 2;
    loadLevel(1);
  }

  // Lost or won, the run ends the same way. No flash is left frozen behind the modal.
  function finish() {
    state = "gameover";
    explosions = [];
    stopLoop();
    clearKeys();
    emit();
    callbacks.onGameOver(score);
    draw();
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function overlapsBall(block: Block) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function update(dt: number) {
    if (state !== "playing") return;

    // Paddle
    if (keys.ArrowLeft) paddle.x = clampPaddleX(paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.x = clampPaddleX(paddle.x + PADDLE_SPEED * dt);

    // Ball
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Walls: left, right and top only
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle bounce: vx never changes
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Blocks: only the first alive one that overlaps breaks each frame
    for (const block of blocks) {
      if (!block.alive || !overlapsBall(block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score = Math.min(MAX_SCORE, score + POINTS_PER_BLOCK);
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) {
          loadLevel(level + 1);
        } else {
          finish();
          return;
        }
      }
      break;
    }

    // Explosions
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_MS);

    // Ball lost
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        finish();
      } else {
        placeBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    const pal = palette;
    drawBackground(ctx, pal);
    for (const block of blocks) {
      if (block.alive) drawBlock(ctx, block, pal);
    }
    for (const exp of explosions) drawExplosion(ctx, exp, pal);
    drawPaddle(ctx, paddle, pal);
    drawBall(ctx, ball, pal);
  }

  // Logical size stays 800×600; the backing store follows devicePixelRatio for crisp lines,
  // or the skin's fixed resolution (retro renders at 400×300 and is scaled up without smoothing).
  function fitToDevicePixels() {
    const scale = palette.resolution ?? (window.devicePixelRatio || 1);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // Assigning canvas.width resets the context, smoothing included.
    ctx.imageSmoothingEnabled = !palette.pixelated;
    canvas.style.imageRendering = palette.pixelated ? "pixelated" : "";
    draw();
  }

  function setSkin(skin: SkinId) {
    const next = SKINS[skin];
    if (!next || next === palette) return;
    palette = next;
    // Refit (resolution may change) and redraw now: the loop is stopped outside "playing".
    fitToDevicePixels();
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
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // ── Controls ────────────────────────────────────────────────────────────────
  function start() {
    if (state !== "ready") return;
    state = "playing";
    clearKeys();
    initGame();
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
    explosions = [];
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
    clearKeys();
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
      } else if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
      }
      return;
    }

    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (state === "paused") resume();
      else pause();
      return;
    }

    if (state !== "playing") return;
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
  }

  // Not filtered by focus: a key released anywhere must never stay stuck.
  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (state !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    // Logical width, never canvas.width: with DPR 2 that would double the position.
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    paddle.x = clampPaddleX(mouseX - PADDLE_W / 2);
  }

  function onBlur() {
    clearKeys();
    pause();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", fitToDevicePixels);
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("mousemove", onMouseMove);

  // Start screen: level 1, centred paddle, ball resting on it. The loop only runs while playing.
  initGame();
  fitToDevicePixels();

  return {
    start,
    pause,
    resume,
    end,
    restart,
    setSkin,
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", fitToDevicePixels);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
