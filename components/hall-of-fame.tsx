"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES, getGame } from "@/lib/games";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { useUser } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const PODIUM = [" top1", " top2", " top3"];
const GLOBAL = "global";
const RANKED_GAMES = GAMES.filter((g) => g.engine);

type MyBest = { key: string; score: number; rank: number; date: string };

// UTC, same as the server-formatted rows.
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return (
    [d.getUTCDate(), d.getUTCMonth() + 1]
      .map((n) => String(n).padStart(2, "0"))
      .join("/") +
    "/" +
    d.getUTCFullYear()
  );
};

// Best score of a player (in one game, or in every game for GLOBAL) and its rank: 1 + scores strictly higher.
async function fetchMyBest(name: string, gameId: string | null) {
  const supabase = createClient();
  let best = supabase
    .from("scores")
    .select("score, created_at")
    .eq("player_name", name)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  if (gameId) best = best.eq("game_id", gameId);
  const { data, error } = await best;
  if (error || !data[0]) return null;

  let higher = supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .gt("score", data[0].score);
  if (gameId) higher = higher.eq("game_id", gameId);
  const { count, error: countError } = await higher;
  if (countError) return null;

  return {
    score: data[0].score,
    rank: 1 + (count ?? 0),
    date: formatDate(data[0].created_at),
  };
}

function PodiumSlot({
  row,
  place,
}: {
  row?: LeaderboardRow;
  place: "gold" | "silver" | "bronze";
}) {
  // Keeps the gold slot centred while fewer than three scores exist.
  if (!row) return <div aria-hidden="true" />;
  const champion = place === "gold";
  return (
    <div className={"podium-slot " + place}>
      {champion && (
        <div className="pixel text-[9px] tracking-[0.18em] text-gold">
          CAMPEÓN
        </div>
      )}
      <div className={"rank-num" + (champion ? " mt-1 text-4xl" : "")}>
        {String(row.rank).padStart(2, "0")}
      </div>
      <div className="name">{row.name}</div>
      <div className={"score" + (champion ? " text-xl" : "")}>
        {row.score.toLocaleString("es-ES")}
      </div>
      <div className="date">{row.date}</div>
    </div>
  );
}

type Props = {
  global: LeaderboardRow[];
  byGame: Record<string, LeaderboardRow[]>;
};

export default function HallOfFame({ global, byGame }: Props) {
  const user = useUser();
  const [tab, setTab] = useState(GLOBAL);
  const [myBest, setMyBest] = useState<MyBest | null>(null);

  const isGlobal = tab === GLOBAL;
  const rows = isGlobal ? global : (byGame[tab] ?? []);
  const tabTitle = isGlobal ? "GLOBAL" : (getGame(tab)?.title ?? tab);
  const playHref = `/games/${isGlobal ? RANKED_GAMES[0]?.id : tab}/jugar`;
  const bestKey = user ? `${tab}|${user.name}` : null;

  // Client-only: the simulated user lives in localStorage, so it is only known after hydration.
  useEffect(() => {
    if (!user || !bestKey) return;
    let cancelled = false;
    fetchMyBest(user.name, isGlobal ? null : tab)
      .catch(() => null)
      .then((best) => {
        if (!cancelled) setMyBest(best ? { key: bestKey, ...best } : null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, bestKey, isGlobal, tab]);

  const shownBest = myBest && myBest.key === bestKey ? myBest : null;

  return (
    <>
      <div className="hall-tabs">
        {[{ id: GLOBAL, title: "GLOBAL" }, ...RANKED_GAMES].map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="podium">
          <PodiumSlot row={rows[1]} place="silver" />
          <PodiumSlot row={rows[0]} place="gold" />
          <PodiumSlot row={rows[2]} place="bronze" />
        </div>
      )}

      {/* Keyed by tab so the row-by-row reveal replays on every tab change. */}
      <div key={tab} className={"hall-table" + (isGlobal ? " global" : "")}>
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          {isGlobal && <div>JUEGO</div>}
          <div>PUNTUACIÓN</div>
          <div className="dt">FECHA</div>
        </div>
        {rows.length === 0 && (
          <div className="tr hall-empty">
            <span>SÉ EL PRIMERO EN ENTRAR AL SALÓN</span>
            <Link href={playHref} className="btn yellow">
              ▶ JUGAR
            </Link>
          </div>
        )}
        {rows.map((r, i) => (
          <div key={r.rank} className={"tr" + (PODIUM[i] ?? "")}>
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            {isGlobal && (
              <div className="gm">{getGame(r.gameId)?.title ?? r.gameId}</div>
            )}
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && shownBest && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {tabTitle}</div>
            <div className="tr you">
              <div className="rk text-yellow">
                #{String(shownBest.rank).padStart(2, "0")}
              </div>
              <div className="pl text-yellow">{user.name}</div>
              {isGlobal && <div className="gm" />}
              <div className="sc text-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                {shownBest.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{shownBest.date}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
