// Level data for RUPTURA. Pure data: no browser APIs, safe to import on the server.

export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export type LevelBlock = { col: number; row: number; color: BlockColor };

export type LevelDef = {
  speed: number; // multiplies the base ball velocity
  blocks: LevelBlock[];
};

const COLS = 10;
const ROWS = 6;

// Blocks are always listed row by row: collisions pick the first alive one in this order.
function buildBlocks(
  colorAt: (col: number, row: number) => BlockColor | null,
): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = colorAt(col, row);
      if (color) blocks.push({ col, row, color });
    }
  }
  return blocks;
}

const GRID_COLORS: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];

const PYRAMID_COLORS: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const PYRAMID_START = [4, 3, 2, 1, 0, 0];
const PYRAMID_END = [5, 6, 7, 8, 9, 9];

const GAPS_COLORS: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
const GAPS = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];

export const LEVELS: LevelDef[] = [
  {
    speed: 1.0,
    blocks: buildBlocks((_col, row) => GRID_COLORS[row]),
  },
  {
    speed: 1.1,
    blocks: buildBlocks((col, row) =>
      col >= PYRAMID_START[row] && col <= PYRAMID_END[row]
        ? PYRAMID_COLORS[row]
        : null,
    ),
  },
  {
    speed: 1.21,
    blocks: buildBlocks((col, row) => {
      if ((col + row) % 2 !== 0) return null;
      return row < 3 ? "yellow" : "magenta";
    }),
  },
  {
    speed: 1.33,
    blocks: buildBlocks((col, row) =>
      GAPS[row].includes(col) ? null : GAPS_COLORS[row],
    ),
  },
  {
    speed: 1.46,
    blocks: buildBlocks((col, row) => {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (!isFrame && !isCross) return null;
      return isCross && !isFrame ? "hotpink" : "cyan";
    }),
  },
];
