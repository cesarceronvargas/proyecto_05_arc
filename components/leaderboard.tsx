import type { LeaderboardRow } from "@/lib/leaderboard";

const PODIUM = [" top1", " top2", " top3"];

// rows === null means the game has no ranking yet (simulated games).
export default function Leaderboard({
  rows,
}: {
  rows: LeaderboardRow[] | null;
}) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows === null ? (
        <div className="lb-empty">RANKING PRÓXIMAMENTE</div>
      ) : rows.length === 0 ? (
        <div className="lb-empty">SÉ EL PRIMERO</div>
      ) : (
        rows.map((r, i) => (
          <div key={r.rank} className={"lb-row" + (PODIUM[i] ?? "")}>
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div className="text-[10px] tracking-[0.1em] text-ink-faint">
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
