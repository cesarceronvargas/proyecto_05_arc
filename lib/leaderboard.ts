// Real leaderboards from Supabase. Reads are cached and invalidated by submitScore via the "scores" tag.
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  gameId: string;
  date: string; // dd/mm/yyyy
};

export const SCORES_TAG = "scores";

// UTC so the server and every visitor agree on the date of a score.
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

// gameId null => global top across every game.
export async function getTopScores(
  gameId: string | null,
  limit = 10,
): Promise<LeaderboardRow[]> {
  "use cache";
  cacheTag(SCORES_TAG);
  // submitScore invalidates on every insert; the time-based refresh only covers writes made outside the app.
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) {
    console.warn(
      "[leaderboard] Supabase no está configurado; se muestra el ranking vacío.",
    );
    return [];
  }

  let query = supabase
    .from("scores")
    .select("player_name, score, game_id, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (gameId) query = query.eq("game_id", gameId);

  const { data, error } = await query;
  if (error) {
    console.warn("[leaderboard] No se pudo leer el ranking:", error.message);
    return [];
  }

  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    gameId: r.game_id,
    date: formatDate(r.created_at),
  }));
}
