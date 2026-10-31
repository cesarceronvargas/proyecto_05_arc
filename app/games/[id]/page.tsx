import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/leaderboard";
import { GAMES, getGame } from "@/lib/games";
import { getTopScores } from "@/lib/leaderboard";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  return game ? { title: game.title, description: game.short } : {};
}

export default async function GameDetailPage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Only games with a real engine have a ranking; the rest keep their catalogue "best".
  const scores = game.engine ? await getTopScores(game.id) : null;
  const best = scores ? (scores[0]?.score.toLocaleString("es-ES") ?? "—") : game.best.toLocaleString("es-ES");

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div className="detail-info mt-5">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v text-magenta [text-shadow:0_0_6px_rgba(255,0,110,0.5)]">
                {best}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v text-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">★ ★ ★ ☆ ☆</div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/jugar`} className="btn xl pulse">▶  JUGAR AHORA</Link>
            <Link href="/games" className="btn ghost lg">VOLVER AL VAULT</Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard rows={scores} />
      </aside>
    </div>
  );
}
