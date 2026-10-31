"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitScore } from "@/app/games/[id]/jugar/actions";

type Props = {
  gameId: string;
  score: number;
  defaultName: string;
  ranked: boolean;
  onRestart: () => void;
};

type SaveState = "idle" | "saved" | "error";

export default function GameOverModal({
  gameId,
  score,
  defaultName,
  ranked,
  onRestart,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState<SaveState>("idle");
  const [saving, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const save = () => {
    startSaving(async () => {
      try {
        const result = await submitScore({ gameId, score, name });
        setState(result.ok ? "saved" : "error");
      } catch {
        // Network failure or server crash: keep the name so the player can retry.
        setState("error");
      }
    });
  };

  return (
    <div className="modal-bd">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
      >
        <h2 id="game-over-title">FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {!ranked ? (
          <div className="toast-unranked" role="status">
            ESTE JUEGO AÚN NO TIENE RANKING
          </div>
        ) : state === "saved" ? (
          <div className="toast-saved" role="status">
            ▸ PUNTUACIÓN GUARDADA_
          </div>
        ) : (
          <>
            <div className="input-row">
              <input
                ref={inputRef}
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toUpperCase().slice(0, 10))
                }
                placeholder="TUS INICIALES"
                aria-label="Tus iniciales"
                maxLength={10}
                disabled={saving}
              />
              <button
                type="button"
                className="btn yellow"
                onClick={save}
                disabled={saving || !name.trim()}
              >
                {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
              </button>
            </div>
            {state === "error" && !saving && (
              <div className="toast-error" role="alert">
                ▸ NO SE PUDO GUARDAR · REINTENTAR
              </div>
            )}
          </>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onRestart}>
            JUGAR DE NUEVO
          </button>
          <Link href="/games" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
