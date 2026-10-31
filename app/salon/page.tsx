import type { Metadata } from "next";
import Link from "next/link";
import HallOfFame from "@/components/hall-of-fame";
import { GAMES } from "@/lib/games";
import { getTopScores } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "Salón de la Fama",
};

export default async function HallOfFamePage() {
  const ranked = GAMES.filter((g) => g.engine);
  const [global, ...perGame] = await Promise.all([
    getTopScores(null),
    ...ranked.map((g) => getTopScores(g.id)),
  ]);
  const byGame = Object.fromEntries(ranked.map((g, i) => [g.id, perGame[i]]));

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <HallOfFame global={global} byGame={byGame} />

      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  );
}
