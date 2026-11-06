// Board logic and drawing ported from references/started-games/03-tetris/game.js.
// No globals: the board and the context are always received by parameter.

import { BLOCK, COLORS, COLS, ROWS, type Piece, type Shape } from "./pieces";

export type Board = number[][]; // board[row][column], origin at the top left

// ── Layout (logical 800×600 canvas) ───────────────────────────────────────────
export const W = 800;
export const H = 600;
export const BOARD_X = 200;
export const NEXT_X = 540;
export const NEXT_Y = 60;
export const NEXT_SIZE = 4 * BLOCK; // the panel is a 4×4 cell square

const GRID_COLOR = "rgba(0, 245, 255, 0.1)";
const FRAME_COLOR = "rgba(0, 245, 255, 0.5)";
const FRAME_WIDTH = 2; // thin lines vanish when the CRT shrinks on a phone
const FILL_ALPHA = 0.42; // blocks are lit tubes: a bright outline around a dim core
const TUBE_WIDTH = 2;
const GLOW_BLUR = 10;

// ── Logic ─────────────────────────────────────────────────────────────────────
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

export function collide(board: Board, shape: Shape, ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function merge(board: Board, piece: Piece) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
      }
    }
  }
}

// Removes the full rows in place and returns how many there were.
export function clearLines(board: Board) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++; // the rows above moved down, so this row has to be checked again
    }
  }
  return cleared;
}

// ── Drawing ───────────────────────────────────────────────────────────────────
// x and y are logical pixels, not cells.
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  alpha = 1,
  glow = false,
) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  ctx.save();
  ctx.globalAlpha = alpha * FILL_ALPHA;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, BLOCK - 4, BLOCK - 4);
  ctx.globalAlpha = alpha;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = GLOW_BLUR;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = TUBE_WIDTH;
  ctx.strokeRect(x + 3, y + 3, BLOCK - 6, BLOCK - 6);
  ctx.restore();
}

// The faint grid and the frame of the board.
export function drawGrid(ctx: CanvasRenderingContext2D) {
  const width = COLS * BLOCK;
  const height = ROWS * BLOCK;
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(BOARD_X + c * BLOCK, 0);
    ctx.lineTo(BOARD_X + c * BLOCK, height);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(BOARD_X, r * BLOCK);
    ctx.lineTo(BOARD_X + width, r * BLOCK);
  }
  ctx.stroke();
  ctx.strokeStyle = FRAME_COLOR;
  ctx.lineWidth = FRAME_WIDTH;
  ctx.strokeRect(BOARD_X, 0, width, height);
  ctx.restore();
}

export function drawBoard(ctx: CanvasRenderingContext2D, board: Board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, BOARD_X + c * BLOCK, r * BLOCK, board[r][c]);
    }
  }
}

// The panel has no text. With piece = null (start screen) it is only the frame.
export function drawNext(ctx: CanvasRenderingContext2D, piece: Piece | null) {
  ctx.save();
  ctx.strokeStyle = FRAME_COLOR;
  ctx.lineWidth = FRAME_WIDTH;
  ctx.strokeRect(NEXT_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  ctx.restore();
  if (!piece) return;

  // Centre what is actually filled: the shapes have empty rows (the I, the T…).
  const { shape } = piece;
  const filled = shape.flatMap((row, r) =>
    row.flatMap((v, c) => (v ? [{ r, c }] : [])),
  );
  const minR = Math.min(...filled.map((b) => b.r));
  const maxR = Math.max(...filled.map((b) => b.r));
  const minC = Math.min(...filled.map((b) => b.c));
  const maxC = Math.max(...filled.map((b) => b.c));
  const offX = NEXT_X + (NEXT_SIZE - (maxC - minC + 1) * BLOCK) / 2;
  const offY = NEXT_Y + (NEXT_SIZE - (maxR - minR + 1) * BLOCK) / 2;
  for (const { r, c } of filled) {
    drawBlock(
      ctx,
      offX + (c - minC) * BLOCK,
      offY + (r - minR) * BLOCK,
      shape[r][c],
    );
  }
}
