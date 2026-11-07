// Mock catalogue, ported from references/templates/data.jsx. Real leaderboards live in lib/leaderboard.ts.

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type GameEngine = "asteroids" | "blockfall";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: `cover-${string}`;
  color: AccentColor;
  best: number;
  plays: string;
  engine?: GameEngine; // missing => visual simulation
};

export const GAMES: Game[] = [
  {
    id: "blockfall",
    title: "BLOCKFALL",
    short: "Encaja las piezas antes de que el techo te aplaste.",
    long: "Piezas geométricas descienden desde la oscuridad, y entre ellas acecha una tuerca con hueco. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.",
    cat: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
    best: 184220,
    plays: "31.8K",
    engine: "blockfall",
  },
  {
    id: "rocas",
    title: "ROCAS",
    short: "Pulveriza asteroides en gravedad cero.",
    long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños.",
    cat: "SHOOTER",
    cover: "cover-rocas",
    color: "yellow",
    best: 41200,
    plays: "15.6K",
    engine: "asteroids",
  },
];

export const CATEGORIES = ["TODOS", "PUZZLE", "SHOOTER"] as const;

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
