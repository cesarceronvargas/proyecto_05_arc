"use client";

import type { MouseEvent } from "react";
import { SKIN_IDS, type SkinId } from "@/games/shared/skins";

const LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

type Props = {
  value: SkinId;
  onChange: (skin: SkinId) => void;
  className?: string;
};

// Three-way selector. Clicks never bubble (the start overlay is a button that would start the
// run) and focus is released so the game keeps receiving Space/arrows.
export default function SkinPicker({ value, onChange, className }: Props) {
  const choose = (skin: SkinId) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.blur();
    if (skin !== value) onChange(skin);
  };

  return (
    <div
      className={className ? `skin-picker ${className}` : "skin-picker"}
      role="group"
      aria-label="Skin del juego"
    >
      {SKIN_IDS.map((skin) => (
        <button
          key={skin}
          type="button"
          className="skin-opt"
          data-skin={skin}
          aria-pressed={skin === value}
          onClick={choose(skin)}
        >
          <span className="skin-swatch" aria-hidden="true" />
          {LABELS[skin]}
        </button>
      ))}
    </div>
  );
}
