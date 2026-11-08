// Constants, types and drawing for SERPIENTE (SPEC 09).
// No globals and no browser APIs at module level: the context is always received by parameter.

import type { Palette } from "./skins";
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

// ── Drawing sizes (colours and style come from the active skin, see skins.ts) ──
const SEGMENT_INSET = 2; // gap on each side, so neighbours read as separate segments
const EYE_FORWARD = 7; // px from the cell centre towards the direction of travel
const EYE_SPREAD = 8; // px from the cell centre to each side
const EYE_RADIUS = 3.5;
const PUPIL_RADIUS = 1.8;
const PUPIL_FORWARD = 1; // the pupil looks where the snake is going
const SQUARE_EYE = 6; // pixelated skins: square eyes of this side
const PIXEL_SNAP = 2; // pixelated skins render at half resolution: 2 logical px per pixel
const FRUIT_H = 36; // drawn height; the width keeps the sprite's proportions
const FRUIT_FALLBACK_RADIUS = 14;

// 8×8 apple for limited palettes: "#" = ink, "+" = shine, "." = transparent.
const FRUIT_GLYPH = [
  "....##..",
  "...#....",
  ".######.",
  "########",
  "#+######",
  "#+######",
  ".######.",
  "..##.##.",
];
const GLYPH_PIXEL = 4; // logical px per glyph pixel: 32 px, inside the 40 px cell

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
export function drawBackground(ctx: CanvasRenderingContext2D, pal: Palette) {
  ctx.fillStyle = pal.background;
  ctx.fillRect(0, 0, W, H);

  if (pal.board === "checker") {
    ctx.fillStyle = pal.boardInk;
    for (let r = 0; r < ROWS; r++) {
      for (let c = (r + 1) % 2; c < COLS; c += 2) {
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
    return;
  }

  if (pal.board !== "grid") return;
  ctx.strokeStyle = pal.boardInk;
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

function segment(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  size: number,
  radius: number,
) {
  const x = cell.c * CELL + SEGMENT_INSET;
  const y = cell.r * CELL + SEGMENT_INSET;
  if (radius <= 0) {
    ctx.fillRect(x, y, size, size);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

const snap = (v: number) => Math.round(v / PIXEL_SNAP) * PIXEL_SNAP;

// The snake goes head first: snake[0] is the head, the last cell is the tail.
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Cell[],
  dir: Dir,
  pal: Palette,
) {
  const size = CELL - SEGMENT_INSET * 2;

  ctx.save();
  ctx.fillStyle = pal.body;
  // Tail first, so each segment sits under the one closer to the head.
  for (let i = snake.length - 1; i >= 1; i--) {
    const t = snake.length > 2 ? (i - 1) / (snake.length - 2) : 0;
    ctx.globalAlpha = 1 - t * (1 - pal.tailAlpha);
    segment(ctx, snake[i], size, pal.segmentRadius);
  }
  ctx.restore();

  const head = snake[0];
  ctx.save();
  if (pal.headGlow > 0) {
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = pal.headGlow;
  }
  ctx.fillStyle = pal.head;
  segment(ctx, head, size, pal.headRadius);
  ctx.restore();

  const cx = head.c * CELL + CELL / 2;
  const cy = head.r * CELL + CELL / 2;
  const f = FORWARD[dir];
  for (const side of [-1, 1]) {
    // The sideways axis is the forward vector turned 90 degrees.
    const ex = cx + f.x * EYE_FORWARD - f.y * EYE_SPREAD * side;
    const ey = cy + f.y * EYE_FORWARD + f.x * EYE_SPREAD * side;
    ctx.fillStyle = pal.eye;
    if (pal.pixelated) {
      const half = SQUARE_EYE / 2;
      ctx.fillRect(snap(ex - half), snap(ey - half), SQUARE_EYE, SQUARE_EYE);
      continue;
    }
    ctx.beginPath();
    ctx.arc(ex, ey, EYE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    if (pal.pupil) {
      ctx.fillStyle = pal.pupil;
      ctx.beginPath();
      ctx.arc(
        ex + f.x * PUPIL_FORWARD,
        ey + f.y * PUPIL_FORWARD,
        PUPIL_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function drawFruitGlyph(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  cx: number,
  cy: number,
) {
  const side = FRUIT_GLYPH.length * GLYPH_PIXEL;
  const x0 = cx - side / 2;
  const y0 = cy - side / 2;
  FRUIT_GLYPH.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const px = row[c];
      if (px === ".") continue;
      ctx.fillStyle = px === "+" ? pal.fruitShine : pal.fruitInk;
      ctx.fillRect(
        x0 + c * GLYPH_PIXEL,
        y0 + r * GLYPH_PIXEL,
        GLYPH_PIXEL,
        GLYPH_PIXEL,
      );
    }
  });
}

// `image` is the sprite sheet, which may still be loading or may have failed.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  key: FruitKey,
  cell: Cell,
  pal: Palette,
) {
  const cx = cell.c * CELL + CELL / 2;
  const cy = cell.r * CELL + CELL / 2;

  if (pal.fruit === "glyph") {
    drawFruitGlyph(ctx, pal, cx, cy);
    return;
  }

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

  ctx.fillStyle = pal.fruitInk;
  ctx.beginPath();
  ctx.arc(cx, cy, FRUIT_FALLBACK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}
