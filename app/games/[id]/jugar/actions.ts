"use server";

import { updateTag } from "next/cache";
import { getGame } from "@/lib/games";
import { SCORES_TAG } from "@/lib/leaderboard";
import { createPublicClient } from "@/lib/supabase/public";

const MAX_SCORE = 10_000_000;
const MAX_NAME = 10;

type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitScore(input: {
  gameId: string;
  score: number;
  name: string;
}): Promise<SubmitResult> {
  // Only games with a real engine have a ranking (and a row in public.games).
  if (!getGame(input.gameId)?.engine) {
    return { ok: false, error: "Este juego no tiene ranking." };
  }
  if (
    !Number.isInteger(input.score) ||
    input.score < 0 ||
    input.score > MAX_SCORE
  ) {
    return { ok: false, error: "Puntuación no válida." };
  }
  const name = String(input.name ?? "")
    .trim()
    .toUpperCase();
  if (name.length < 1 || name.length > MAX_NAME) {
    return {
      ok: false,
      error: "El nombre debe tener entre 1 y 10 caracteres.",
    };
  }

  const supabase = createPublicClient();
  if (!supabase) {
    console.error("[scores] Supabase no está configurado");
    return { ok: false, error: "El ranking no está disponible." };
  }

  const { error } = await supabase
    .from("scores")
    .insert({ game_id: input.gameId, player_name: name, score: input.score });
  if (error) {
    console.error("[scores] Supabase rechazó la puntuación:", error.message);
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }

  updateTag(SCORES_TAG);
  return { ok: true };
}
