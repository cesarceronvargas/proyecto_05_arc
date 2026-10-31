"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import GameOverModal from "@/components/game-over-modal";
import {
  createAsteroidsGame,
  type AsteroidsGame,
} from "@/games/asteroids/engine";
import type { Game } from "@/lib/games";
import { useUser } from "@/lib/storage";

type Phase = "ready" | "playing" | "over";

const TOUCH_ONLY_QUERY = "(pointer: coarse)";
const FINE_POINTER_QUERY = "(pointer: fine)";

function subscribePointer(onChange: () => void) {
  const queries = [
    matchMedia(TOUCH_ONLY_QUERY),
    matchMedia(FINE_POINTER_QUERY),
  ];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () =>
    queries.forEach((q) => q.removeEventListener("change", onChange));
}

function isTouchOnly() {
  return (
    matchMedia(TOUCH_ONLY_QUERY).matches &&
    !matchMedia(FINE_POINTER_QUERY).matches
  );
}

// Focus left on a HUD button would swallow the game keys (and Space would click it again).
function releaseFocus(e: MouseEvent<HTMLElement>) {
  e.currentTarget.blur();
}

export default function AsteroidsPlayer({ game }: { game: Game }) {
  const user = useUser();
  const touchOnly = useSyncExternalStore(
    subscribePointer,
    isTouchOnly,
    () => false,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsGame | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [triple, setTriple] = useState(0);
  const [paused, setPaused] = useState(false);
  // Remounts the modal on every run so its "saved" state starts fresh.
  const [run, setRun] = useState(0);
  const playerName = user?.name ?? "INVITADO";

  // Layout effect so the cleanup runs before Activity hides the route (cacheComponents keeps
  // this page alive after navigating away). Coming back creates a fresh engine in "ready",
  // so the React state is reset with it. Setters are stable: no other re-runs.
  useLayoutEffect(() => {
    const engine = createAsteroidsGame(canvasRef.current!, {
      onScore: setScore,
      onLives: setLives,
      onLevel: setLevel,
      onTripleShot: setTriple,
      onPauseChange: setPaused,
      onStart: () => setPhase("playing"),
      onGameOver: () => setPhase("over"),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
      setPhase("ready");
      setScore(0);
      setLives(3);
      setLevel(1);
      setTriple(0);
      setPaused(false);
    };
  }, []);

  const togglePause = (e: MouseEvent<HTMLButtonElement>) => {
    releaseFocus(e);
    if (paused) engineRef.current?.resume();
    else engineRef.current?.pause();
  };

  const finish = (e: MouseEvent<HTMLButtonElement>) => {
    releaseFocus(e);
    engineRef.current?.end();
    setPhase("over");
  };

  const restart = () => {
    engineRef.current?.restart();
    setRun((r) => r + 1);
    setPhase("playing");
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-ink [text-shadow:none]">{playerName}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {lives > 0 ? "♥ ".repeat(lives).trim() : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {triple > 0 && (
            <div className="hud-stat triple" role="status">
              <div className="l">Disparo triple</div>
              <div className="v">3X · {triple.toFixed(1)}s</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
            disabled={phase !== "playing"}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={finish}
            disabled={phase !== "playing"}
          >
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            className="game-canvas"
            aria-label={`Partida de ${game.title}`}
          />

          {phase === "ready" && (
            <button
              type="button"
              className="screen-overlay"
              onClick={() => engineRef.current?.start()}
            >
              <span className="screen-title">{game.title}</span>
              <dl className="key-legend">
                <dt>
                  <kbd className="keycap">←</kbd>
                  <kbd className="keycap">→</kbd>
                </dt>
                <dd>Rotar</dd>
                <dt>
                  <kbd className="keycap">↑</kbd>
                </dt>
                <dd>Propulsar</dd>
                <dt>
                  <kbd className="keycap">ESPACIO</kbd>
                </dt>
                <dd>Disparar</dd>
                <dt>
                  <kbd className="keycap">P</kbd>
                  <kbd className="keycap">ESC</kbd>
                </dt>
                <dd>Pausa</dd>
              </dl>
              <span className="press-start">PULSA ESPACIO PARA EMPEZAR</span>
              {touchOnly && (
                <span className="touch-warning">
                  ESTE JUEGO NECESITA TECLADO
                </span>
              )}
            </button>
          )}

          {paused && (
            <div className="crt-content z-[5] bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  PULSA P O REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>VECTOR · 800×600</span>
        </div>
      </div>

      {phase === "over" && (
        <GameOverModal
          key={run}
          gameId={game.id}
          score={score}
          defaultName={playerName}
          ranked
          onRestart={restart}
        />
      )}
    </div>
  );
}
