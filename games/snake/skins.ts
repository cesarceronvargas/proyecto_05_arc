// Visual skins for SERPIENTE. Only colours and rendering style: no gameplay values live here.
import type { SkinId } from "../shared/skins";

export type Palette = {
  background: string;
  // Board texture: thin grid lines, an alternate tint on every other cell, or nothing.
  board: "grid" | "checker" | "none";
  boardInk: string; // colour of the grid lines or of the alternate cells
  head: string;
  body: string;
  glow: string; // shadowColor of the head
  headGlow: number; // shadowBlur of the head, 0 = no glow (only the head ever glows)
  eye: string;
  pupil: string | null; // dot inside each eye, null = solid eyes
  segmentRadius: number;
  headRadius: number;
  tailAlpha: number; // body opacity at the tail (1 = flat body, no fade)
  // Fruit: the colour sprite sheet, or a two-ink pixel glyph for limited palettes.
  fruit: "sprite" | "glyph";
  fruitInk: string; // vector fallback (sprite mode) or glyph body
  fruitShine: string; // glyph highlight
  // Square eyes snapped to the pixel grid, and a low-res backing store scaled up without
  // smoothing.
  pixelated: boolean;
  // Backing store pixels per logical pixel. null = follow devicePixelRatio.
  resolution: number | null;
};

export const SKINS: Record<SkinId, Palette> = {
  // Sober board of the genre: charcoal checkerboard, flat blue snake with white eyes, the
  // colour fruit sprites as the only warm accent.
  clasico: {
    background: "#15171b",
    board: "checker",
    boardInk: "#1b1e23",
    head: "#7aa7ff",
    body: "#4a7ae0",
    glow: "#000",
    headGlow: 0,
    eye: "#ffffff",
    pupil: "#15171b",
    segmentRadius: 6,
    headRadius: 10,
    tailAlpha: 0.6,
    fruit: "sprite",
    fruitInk: "#e0483e",
    fruitShine: "#ffffff",
    pixelated: false,
    resolution: null,
  },
  // The original Arcade Vault palette.
  neon: {
    background: "#0a0a18",
    board: "grid",
    boardInk: "rgba(0,245,255,0.06)",
    head: "#7dffc0",
    body: "#00ff88",
    glow: "#00ff88",
    headGlow: 18,
    eye: "#0a0a18",
    pupil: null,
    segmentRadius: 9,
    headRadius: 12,
    tailAlpha: 0.35,
    fruit: "sprite",
    fruitInk: "#ff006e",
    fruitShine: "#ffffff",
    pixelated: false,
    resolution: null,
  },
  // Four-shade handheld LCD at 400×300: dark olive inks on a pea-green screen, square blocks.
  retro: {
    background: "#9bbc0f",
    board: "checker",
    boardInk: "#8fb00e",
    head: "#0f380f",
    body: "#306230",
    glow: "#000",
    headGlow: 0,
    eye: "#9bbc0f",
    pupil: null,
    segmentRadius: 0,
    headRadius: 0,
    tailAlpha: 1,
    fruit: "glyph",
    fruitInk: "#0f380f",
    fruitShine: "#8bac0f",
    pixelated: true,
    resolution: 0.5,
  },
};
