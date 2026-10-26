import type { ScoreRow } from "@/lib/games";

const PODIUM = [" top1", " top2", " top3"];

export default function Leaderboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.map((r, i) => (
        <div key={r.name} className={"lb-row" + (PODIUM[i] ?? "")}>
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div className="text-[10px] tracking-[0.1em] text-ink-faint">{r.date}</div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
