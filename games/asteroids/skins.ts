// Visual skins for ROCAS. Only colours and rendering style: no gameplay values live here.
import type { SkinId } from "../shared/skins";

export type Palette = {
  background: string;
  ship: string;
  asteroid: string;
  bullet: string;
  powerUp: string;
  flame: string;
  flameCore: string;
  // Multiplier for shadowBlur on the main elements (ship, bullets, power-up). 0 = no glow.
  glow: number;
  shipLineWidth: number;
  asteroidLineWidth: number;
  // Square bullets/particles, mitred joins, axis-aligned power-up and a low-res backing store
  // scaled up without smoothing.
  pixelated: boolean;
  // Backing store pixels per logical pixel. null = follow devicePixelRatio.
  resolution: number | null;
};

export const SKINS: Record<SkinId, Palette> = {
  // 1979 vector cabinet: white beam on a neutral dark tube, amber only for the pickup.
  clasico: {
    background: "#0c0d10",
    ship: "#ffffff",
    asteroid: "#b9bcc4",
    bullet: "#ffffff",
    powerUp: "#ffb347",
    flame: "#ffb347",
    flameCore: "#ff6a3d",
    glow: 0,
    shipLineWidth: 2,
    asteroidLineWidth: 2,
    pixelated: false,
    resolution: null,
  },
  // The original Arcade Vault palette.
  neon: {
    background: "#000",
    ship: "#00f5ff",
    asteroid: "#bff9ff",
    bullet: "#f5ff00",
    powerUp: "#ff006e",
    flame: "#f5ff00",
    flameCore: "#ff006e",
    glow: 1,
    shipLineWidth: 1.5,
    asteroidLineWidth: 2,
    pixelated: false,
    resolution: null,
  },
  // P1 green phosphor monitor at 400×300: brightness levels of a single ink.
  retro: {
    background: "#021006",
    ship: "#9dffad",
    asteroid: "#36c95a",
    bullet: "#e6ffe9",
    powerUp: "#d4ff8a",
    flame: "#9dffad",
    flameCore: "#36c95a",
    glow: 0,
    shipLineWidth: 2,
    asteroidLineWidth: 2,
    pixelated: true,
    resolution: 0.5,
  },
};
