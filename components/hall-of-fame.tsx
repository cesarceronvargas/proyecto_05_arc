"use client";

import { useState } from "react";
import { GAMES, seededScores, type ScoreRow } from "@/lib/games";
import { getBestScore, useUser } from "@/lib/storage";

const PODIUM = [" top1", " top2", " top3"];

const formatDate = (at: number) => {
  const d = new Date(at);
  return [d.getDate(), d.getMonth() + 1].map((n) => String(n).padStart(2, "0")).join("/") + "/" + d.getFullYear();
};

function PodiumSlot({ row, place }: { row: ScoreRow; place: "gold" | "silver" | "bronze" }) {
  const champion = place === "gold";
  return (
    <div className={"podium-slot " + place}>
      {champion && <div className="pixel text-[9px] tracking-[0.18em] text-gold">CAMPEÓN</div>}
      <div className={"rank-num" + (champion ? " mt-1 text-4xl" : "")}>
        {String(row.rank).padStart(2, "0")}
      </div>
      <div className="name">{row.name}</div>
      <div className={"score" + (champion ? " text-xl" : "")}>{row.score.toLocaleString("es-ES")}</div>
      <div className="date">{row.date}</div>
    </div>
  );
}

export default function HallOfFame() {
  const user = useUser();
  const [tab, setTab] = useState(GAMES[0].id);
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  const rows = seededScores(tab.length * 23 + 7, 12);

  // Only called once a user exists, which never happens during SSR or hydration.
  const best = user ? getBestScore(tab, user.name) : null;
  const bestRank = best ? 1 + rows.filter((r) => r.score > best.score).length : 0;

  return (
    <>
      <div className="hall-tabs">
        {GAMES.map((g) => (
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

      <div className="podium">
        <PodiumSlot row={rows[1]} place="silver" />
        <PodiumSlot row={rows[0]} place="gold" />
        <PodiumSlot row={rows[2]} place="bronze" />
      </div>

      {/* Keyed by game so the row-by-row reveal replays on every tab change. */}
      <div key={tab} className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.name} className={"tr" + (PODIUM[i] ?? "")}>
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && best && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you">
              <div className="rk text-yellow">#{String(bestRank).padStart(2, "0")}</div>
              <div className="pl text-yellow">{user.name}</div>
              <div className="sc text-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                {best.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{formatDate(best.at)}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
