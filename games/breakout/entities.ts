// Constants, entities and drawing for RUPTURA, ported from references/started-games/04-arkanoid.
// No globals and no browser APIs at module level: the context is always received by parameter.
// The sprites of the original are replaced by vector shapes painted with the active skin.

import type { BlockColor } from "./levels";
import type { Palette } from "./skins";

// ── Constants ─────────────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;

export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s

export const BALL_SIZE = 16; // collisions use this square; it is drawn as a circle (or a square)
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s

export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const EXPLOSION_MS = 150;
export const MAX_SCORE = 10_000_000; // the upper limit of the check on public.scores

// ── Drawing constants (visual only) ───────────────────────────────────────────
const BLOCK_GAP = 1.5; // visual inset only, so neighbours read as separate bricks
// tube
const BLOCK_FILL_ALPHA = 0.55; // lit tubes: a bright outline around a dimmer core
const BLOCK_SHINE_ALPHA = 0.5; // a lit band along the top edge gives the wall some depth
const BLOCK_SHINE_H = 5;
const BLOCK_STROKE = 2;
// bevel
const BEVEL_H = 3;
const BEVEL_LIGHT_ALPHA = 0.3;
const BEVEL_DARK_ALPHA = 0.35;
const PADDLE_RADIUS = 3;
const PADDLE_CAP_W = 12;
// glow (multiplied by palette.glow)
const PADDLE_GLOW = 14;
const BALL_GLOW = 16;
// flashes
const EXPLOSION_GROWTH = 8; // px added on each side by the end of the flash
const EXPLOSION_STEPS = 3; // pixelated skins: the flash grows in discrete frames
// pixelated skins snap every shape to this logical grid (one backing pixel at 0.5 resolution)
const PIXEL = 2;

const snap = (v: number) => Math.round(v / PIXEL) * PIXEL;

// ── Entities ──────────────────────────────────────────────────────────────────
export type Paddle = { x: number; y: number; w: number; h: number };

export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};

// Blocks and explosions keep a palette key, not a colour, so a skin change recolours them live.
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};

export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
};

// ── Drawing ───────────────────────────────────────────────────────────────────
export function drawBackground(ctx: CanvasRenderingContext2D, pal: Palette) {
  ctx.fillStyle = pal.background;
  ctx.fillRect(0, 0, W, H);
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  pal: Palette,
) {
  const color = pal.blocks[block.color];
  ctx.save();

  if (pal.brick === "flat") {
    // Brick coordinates are already even (on the grid); one backing pixel of seam on the right
    // and bottom keeps the rows readable without breaking the flat ink.
    ctx.fillStyle = color;
    ctx.fillRect(
      snap(block.x),
      snap(block.y),
      snap(block.w) - PIXEL,
      snap(block.h) - PIXEL,
    );
    ctx.restore();
    return;
  }

  const x = block.x + BLOCK_GAP;
  const y = block.y + BLOCK_GAP;
  const w = block.w - BLOCK_GAP * 2;
  const h = block.h - BLOCK_GAP * 2;

  if (pal.brick === "bevel") {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = BEVEL_LIGHT_ALPHA;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, BEVEL_H);
    ctx.globalAlpha = BEVEL_DARK_ALPHA;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y + h - BEVEL_H, w, BEVEL_H);
  } else {
    ctx.globalAlpha = BLOCK_FILL_ALPHA;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = BLOCK_SHINE_ALPHA;
    ctx.fillRect(x, y, w, BLOCK_SHINE_H);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = BLOCK_STROKE;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  paddle: Paddle,
  pal: Palette,
) {
  ctx.save();
  ctx.fillStyle = pal.paddle;

  if (pal.pixelated) {
    ctx.fillRect(
      snap(paddle.x),
      snap(paddle.y),
      snap(paddle.w),
      snap(paddle.h),
    );
    ctx.restore();
    return;
  }

  if (pal.glow > 0) {
    ctx.shadowColor = pal.paddle;
    ctx.shadowBlur = PADDLE_GLOW * pal.glow;
  }

  if (pal.paddleCap) {
    const { x, y, w, h } = paddle;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, PADDLE_RADIUS);
    ctx.fill();
    ctx.fillStyle = pal.paddleCap;
    ctx.beginPath();
    ctx.roundRect(x, y, PADDLE_CAP_W, h, [PADDLE_RADIUS, 0, 0, PADDLE_RADIUS]);
    ctx.roundRect(x + w - PADDLE_CAP_W, y, PADDLE_CAP_W, h, [
      0,
      PADDLE_RADIUS,
      PADDLE_RADIUS,
      0,
    ]);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  pal: Palette,
) {
  ctx.save();
  ctx.fillStyle = pal.ball;

  if (pal.pixelated) {
    ctx.fillRect(snap(ball.x), snap(ball.y), snap(ball.w), snap(ball.h));
    ctx.restore();
    return;
  }

  const radius = ball.w / 2;
  if (pal.glow > 0) {
    ctx.shadowColor = pal.ball;
    ctx.shadowBlur = BALL_GLOW * pal.glow;
  }
  ctx.beginPath();
  ctx.arc(ball.x + radius, ball.y + radius, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  exp: Explosion,
  pal: Palette,
) {
  const t = Math.min(exp.elapsed / EXPLOSION_MS, 1);
  const color = pal.blocks[exp.color];
  ctx.save();

  if (pal.pixelated) {
    // A one-pixel hollow frame that jumps outwards in a few frames, like an 8-bit sprite.
    const step = Math.min(EXPLOSION_STEPS - 1, Math.floor(t * EXPLOSION_STEPS));
    const grow = snap((EXPLOSION_GROWTH * (step + 1)) / EXPLOSION_STEPS);
    const x = snap(exp.x) - grow;
    const y = snap(exp.y) - grow;
    const w = snap(exp.w) + grow * 2;
    const h = snap(exp.h) + grow * 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, PIXEL);
    ctx.fillRect(x, y + h - PIXEL, w, PIXEL);
    ctx.fillRect(x, y + PIXEL, PIXEL, h - PIXEL * 2);
    ctx.fillRect(x + w - PIXEL, y + PIXEL, PIXEL, h - PIXEL * 2);
    ctx.restore();
    return;
  }

  const grow = EXPLOSION_GROWTH * t;
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = color;
  ctx.fillRect(exp.x - grow, exp.y - grow, exp.w + grow * 2, exp.h + grow * 2);
  ctx.restore();
}
