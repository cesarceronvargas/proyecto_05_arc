// Constants, types and drawing for SERPIENTE (SPEC 09).
// No globals and no browser APIs at module level: the context is always received by parameter.

import { FRUIT_ATLAS, type FruitKey } from "./sprites";

// ── Constants ─────────────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;

export const CELL = 40;
export const COLS = 20;
export const ROWS = 15;

export const START_LENGTH = 3;
export const POINTS_PER_FRUIT = 10;

export const START_SPEED = 8; // cells/s
export const SPEED_STEP = 0.5; // cells/s added every FRUITS_PER_LEVEL fruits
export const MAX_SPEED = 16; // cells/s
export const FRUITS_PER_LEVEL = 5;
export const MAX_LEVEL = 10; // informative only: the speed keeps rising up to MAX_SPEED

export const INPUT_BUFFER = 2; // queued turns
export const MAX_SCORE = 10_000_000; // the upper limit of the check on public.scores

// ── Palette (neon over the CRT) ───────────────────────────────────────────────
export const COLORS = {
  background: "#0a0a18",
  grid: "rgba(0,245,255,0.06)",
  head: "#7dffc0",
  body: "#00ff88",
  glow: "#00ff88",
  eye: "#0a0a18",
  fruitFallback: "#ff006e",
} as const;

const SEGMENT_INSET = 2; // gap on each side, so neighbours read as separate segments
const SEGMENT_RADIUS = 9;
const HEAD_RADIUS = 12;
const HEAD_GLOW = 18;
const TAIL_ALPHA = 0.35; // the body fades from full opacity behind the head to this at the tail
const EYE_FORWARD = 7; // px from the cell centre towards the direction of travel
const EYE_SPREAD = 8; // px from the cell centre to each side
const EYE_RADIUS = 3.5;
const FRUIT_H = 36; // drawn height; the width keeps the sprite's proportions
const FRUIT_FALLBACK_RADIUS = 14;

// ── Entities ──────────────────────────────────────────────────────────────────
export type Cell = { c: number; r: number };
export type Dir = "up" | "down" | "left" | "right";

const FORWARD: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// ── Drawing ───────────────────────────────────────────────────────────────────
export function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, H);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(W, r * CELL);
  }
  ctx.stroke();
}

// The snake goes head first: snake[0] is the head, the last cell is the tail.
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Cell[],
  dir: Dir,
) {
  const size = CELL - SEGMENT_INSET * 2;

  ctx.save();
  ctx.fillStyle = COLORS.body;
  // Tail first, so each segment sits under the one closer to the head.
  for (let i = snake.length - 1; i >= 1; i--) {
    const t = snake.length > 2 ? (i - 1) / (snake.length - 2) : 0;
    ctx.globalAlpha = 1 - t * (1 - TAIL_ALPHA);
    ctx.beginPath();
    ctx.roundRect(
      snake[i].c * CELL + SEGMENT_INSET,
      snake[i].r * CELL + SEGMENT_INSET,
      size,
      size,
      SEGMENT_RADIUS,
    );
    ctx.fill();
  }
  ctx.restore();

  const head = snake[0];
  ctx.save();
  ctx.shadowColor = COLORS.glow;
  ctx.shadowBlur = HEAD_GLOW;
  ctx.fillStyle = COLORS.head;
  ctx.beginPath();
  ctx.roundRect(
    head.c * CELL + SEGMENT_INSET,
    head.r * CELL + SEGMENT_INSET,
    size,
    size,
    HEAD_RADIUS,
  );
  ctx.fill();
  ctx.restore();

  const cx = head.c * CELL + CELL / 2;
  const cy = head.r * CELL + CELL / 2;
  const f = FORWARD[dir];
  ctx.fillStyle = COLORS.eye;
  for (const side of [-1, 1]) {
    // The sideways axis is the forward vector turned 90 degrees.
    const ex = cx + f.x * EYE_FORWARD - f.y * EYE_SPREAD * side;
    const ey = cy + f.y * EYE_FORWARD + f.x * EYE_SPREAD * side;
    ctx.beginPath();
    ctx.arc(ex, ey, EYE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// `image` is the sprite sheet, which may still be loading or may have failed.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  key: FruitKey,
  cell: Cell,
) {
  const cx = cell.c * CELL + CELL / 2;
  const cy = cell.r * CELL + CELL / 2;

  if (image && image.complete && image.naturalWidth > 0) {
    const rect = FRUIT_ATLAS[key];
    const dw = (rect.w * FRUIT_H) / rect.h;
    ctx.drawImage(
      image,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      cx - dw / 2,
      cy - FRUIT_H / 2,
      dw,
      FRUIT_H,
    );
    return;
  }

  ctx.fillStyle = COLORS.fruitFallback;
  ctx.beginPath();
  ctx.arc(cx, cy, FRUIT_FALLBACK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}
