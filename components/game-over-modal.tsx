"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveScore } from "@/lib/storage";

type Props = {
  gameId: string;
  score: number;
  defaultName: string;
  onRestart: () => void;
};

export default function GameOverModal({ gameId, score, defaultName, onRestart }: Props) {
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const save = () => {
    saveScore({ game: gameId, score, name });
    setSaved(true);
  };

  return (
    <div className="modal-bd">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <h2 id="game-over-title">FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {!saved ? (
          <div className="input-row">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="TUS INICIALES"
              aria-label="Tus iniciales"
              maxLength={10}
            />
            <button type="button" className="btn yellow" onClick={save} disabled={!name.trim()}>
              GUARDAR PUNTUACIÓN
            </button>
          </div>
        ) : (
          <div className="toast-saved" role="status">▸ PUNTUACIÓN GUARDADA_</div>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onRestart}>JUGAR DE NUEVO</button>
          <Link href="/games" className="btn magenta">VOLVER AL VAULT</Link>
        </div>
      </div>
    </div>
  );
}
