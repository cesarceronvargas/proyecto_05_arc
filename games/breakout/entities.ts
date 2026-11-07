// Constants, entities and drawing for RUPTURA, ported from references/started-games/04-arkanoid.
// No globals and no browser APIs at module level: the context is always received by parameter.
// The sprites of the original are replaced by neon vector shapes.

import type { BlockColor } from "./levels";

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

export const BALL_SIZE = 16; // collisions use this square; it is drawn as a circle
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s

export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const EXPLOSION_MS = 150;
export const MAX_SCORE = 10_000_000; // the upper limit of the check on public.scores

// ── Palette (neon over the CRT) ───────────────────────────────────────────────
export const COLORS = {
  background: "#05050a",
  paddle: "#00f5ff",
  ball: "#ffffff",
  blocks: {
    red: "#ff2d55",
    yellow: "#f5ff00",
    cyan: "#00f5ff",
    magenta: "#ff00e5",
    hotpink: "#ff6ec7",
    green: "#00ff88",
    gray: "#9aa0b4",
  } satisfies Record<BlockColor, string>,
} as const;

const BLOCK_GAP = 1.5; // visual inset only, so neighbours read as separate bricks
const BLOCK_FILL_ALPHA = 0.55; // lit tubes: a bright outline around a dimmer core
const BLOCK_SHINE_ALPHA = 0.5; // a lit band along the top edge gives the wall some depth
const BLOCK_SHINE_H = 5;
const BLOCK_STROKE = 2;
const PADDLE_GLOW = 14;
const BALL_GLOW = 16;
const EXPLOSION_GROWTH = 8; // px added on each side by the end of the flash

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
export function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
}

export function drawBlock(ctx: CanvasRenderingContext2D, block: Block) {
  const color = COLORS.blocks[block.color];
  const x = block.x + BLOCK_GAP;
  const y = block.y + BLOCK_GAP;
  const w = block.w - BLOCK_GAP * 2;
  const h = block.h - BLOCK_GAP * 2;

  ctx.save();
  ctx.globalAlpha = BLOCK_FILL_ALPHA;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = BLOCK_SHINE_ALPHA;
  ctx.fillRect(x, y, w, BLOCK_SHINE_H);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = BLOCK_STROKE;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle) {
  ctx.save();
  ctx.shadowColor = COLORS.paddle;
  ctx.shadowBlur = PADDLE_GLOW;
  ctx.fillStyle = COLORS.paddle;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const radius = ball.w / 2;
  ctx.save();
  ctx.shadowColor = COLORS.ball;
  ctx.shadowBlur = BALL_GLOW;
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x + radius, ball.y + radius, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawExplosion(ctx: CanvasRenderingContext2D, exp: Explosion) {
  const t = Math.min(exp.elapsed / EXPLOSION_MS, 1);
  const grow = EXPLOSION_GROWTH * t;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = COLORS.blocks[exp.color];
  ctx.fillRect(exp.x - grow, exp.y - grow, exp.w + grow * 2, exp.h + grow * 2);
  ctx.restore();
}
