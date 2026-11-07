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
import { createBreakoutGame, type BreakoutGame } from "@/games/breakout/engine";
import { START_LIVES } from "@/games/breakout/entities";
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

// The brick wall stays lit above the start text. Vertical % padding follows the width, so 30%
// lands just under the wall (its bottom edge is y = 224 on the 800 logical px wide canvas).
const OVERLAY_BELOW_BRICKS =
  "justify-start gap-[clamp(8px,2.4vw,22px)] pt-[30%] bg-[linear-gradient(to_bottom,transparent_36%,rgba(0,0,0,0.7)_42%,rgba(0,0,0,0.7)_78%,transparent_90%)]";

// Focus left on a HUD button would swallow the game keys (and Space would click it again).
function releaseFocus(e: MouseEvent<HTMLElement>) {
  e.currentTarget.blur();
}

export default function BreakoutPlayer({ game }: { game: Game }) {
  const user = useUser();
  const touchOnly = useSyncExternalStore(
    subscribePointer,
    isTouchOnly,
    () => false,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BreakoutGame | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  // Remounts the modal on every run so its "saved" state starts fresh.
  const [run, setRun] = useState(0);
  const playerName = user?.name ?? "INVITADO";

  // Layout effect so the cleanup runs before Activity hides the route (cacheComponents keeps
  // this page alive after navigating away). Coming back creates a fresh engine in "ready",
  // so the React state is reset with it. Setters are stable: no other re-runs.
  useLayoutEffect(() => {
    const engine = createBreakoutGame(canvasRef.current!, {
      onScore: setScore,
      onLives: setLives,
      onLevel: setLevel,
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
      setLives(START_LIVES);
      setLevel(1);
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
              className={`screen-overlay ${OVERLAY_BELOW_BRICKS}`}
              onClick={() => engineRef.current?.start()}
            >
              <span className="screen-title">{game.title}</span>
              <dl className="key-legend">
                <dt>
                  <kbd className="keycap">←</kbd>
                  <kbd className="keycap">→</kbd>
                </dt>
                <dd>Mover, o usa el ratón</dd>
                <dt>
                  <kbd className="keycap">P</kbd>
                  <kbd className="keycap">ESC</kbd>
                </dt>
                <dd>Pausa</dd>
              </dl>
              <span className="press-start">PULSA ESPACIO PARA EMPEZAR</span>
              {touchOnly && (
                <span className="touch-warning">
                  ESTE JUEGO NECESITA TECLADO O RATÓN
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
