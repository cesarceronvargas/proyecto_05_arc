// Visual skins for RUPTURA. Only colours and rendering style: no gameplay values live here.
import type { SkinId } from "../shared/skins";
import type { BlockColor } from "./levels";

// How a brick is painted:
// - "bevel": opaque fill with a light top edge and a dark bottom edge (moulded arcade brick).
// - "tube": dim translucent core, lit top band and bright outline (lit neon tube).
// - "flat": a single opaque ink snapped to the pixel grid, with a one-pixel seam.
export type BrickStyle = "bevel" | "tube" | "flat";

export type Palette = {
  background: string;
  paddle: string;
  // End caps of the paddle (the Vaus look). null = single colour.
  paddleCap: string | null;
  ball: string;
  blocks: Record<BlockColor, string>;
  brick: BrickStyle;
  // Multiplier for shadowBlur on the main elements (paddle and ball). 0 = no glow.
  glow: number;
  // Square ball, grid-snapped shapes, stepped flashes and a low-res backing store scaled up
  // without smoothing.
  pixelated: boolean;
  // Backing store pixels per logical pixel. null = follow devicePixelRatio.
  resolution: number | null;
};

export const SKINS: Record<SkinId, Palette> = {
  // Arcade cabinet brick wall: solid moulded bricks in muted inks on a neutral dark field,
  // a silver paddle with red caps and a white ball. No glow.
  clasico: {
    background: "#0e0f13",
    paddle: "#d6d9e0",
    paddleCap: "#d9453b",
    ball: "#ffffff",
    blocks: {
      red: "#d9453b",
      yellow: "#e3bd3f",
      cyan: "#3d9fc4",
      magenta: "#a8559a",
      hotpink: "#e07a8c",
      green: "#56a65a",
      gray: "#8b909b",
    },
    brick: "bevel",
    glow: 0,
    pixelated: false,
    resolution: null,
  },
  // The original Arcade Vault palette.
  neon: {
    background: "#05050a",
    paddle: "#00f5ff",
    paddleCap: null,
    ball: "#ffffff",
    blocks: {
      red: "#ff2d55",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#ff00e5",
      hotpink: "#ff6ec7",
      green: "#00ff88",
      gray: "#9aa0b4",
    },
    brick: "tube",
    glow: 1,
    pixelated: false,
    resolution: null,
  },
  // Home console at 400×300: flat inks from the 2600 NTSC palette on black, square ball.
  retro: {
    background: "#000000",
    paddle: "#c84848",
    paddleCap: null,
    ball: "#ececec",
    blocks: {
      red: "#c84848",
      yellow: "#a2a22a",
      cyan: "#5058d8",
      magenta: "#a848a8",
      hotpink: "#c66c3a",
      green: "#48a048",
      gray: "#8e8e8e",
    },
    brick: "flat",
    glow: 0,
    pixelated: true,
    resolution: 0.5,
  },
};
