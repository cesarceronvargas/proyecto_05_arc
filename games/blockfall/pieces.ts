// Pieces ported from references/started-games/03-tetris/game.js.
// The README of the original says 7 pieces, but its code has 8, and the code is what we follow.

export type Shape = number[][]; // 0 = empty, 1..8 = colour index
export type Piece = { type: number; shape: Shape; x: number; y: number };

// ── Constants ─────────────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const; // by lines cleared at once
export const MAX_SCORE = 10_000_000; // the upper limit of the check on public.scores

// ── Palette (neon over the CRT, indexed by piece type) ────────────────────────
export const COLORS: readonly string[] = [
  "",
  "#00f5ff", // I - cyan
  "#f5ff00", // O - yellow
  "#ff2bd6", // T - magenta
  "#00ff88", // S - green
  "#ff3b3b", // Z - red
  "#5b8cff", // J - blue
  "#ff9f1c", // L - orange
  "#c8d0e0", // N - metallic grey/white
];

// ── Shapes (indexed by piece type; index 0 is unused so type = colour index) ──
export const PIECES: readonly Shape[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (the nut: a 3×3 ring with a hole)
];

// ── Helpers ───────────────────────────────────────────────────────────────────
// Clockwise rotation: transpose and reverse the rows.
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

// Each of the 8 types has probability 1/8; there is no bag.
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
