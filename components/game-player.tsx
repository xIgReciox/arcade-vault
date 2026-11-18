"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AsteroidsCanvas } from "@/components/games/asteroids-canvas";
import type { AsteroidsSnapshot } from "@/lib/asteroids/engine";
import type { Game, SavedScore } from "@/lib/games";

const SCORES_KEY = "av_scores";

function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as SavedScore[];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage bloqueado: la app sigue funcionando sin persistir.
  }
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // null = sin editar; así el nombre sigue a la sesión (que se lee tras montar).
  const [nameEdit, setNameEdit] = useState<string | null>(null);

  // ASTEROIDS es el único juego real: score/vidas/nivel/pausa vienen del motor.
  const isAsteroids = game.id === "asteroids";
  const [engineLevel, setEngineLevel] = useState(1);
  const [restartKey, setRestartKey] = useState(0);

  const name = nameEdit ?? user?.name ?? "INVITADO";
  // Nivel derivado de la puntuación (juegos simulados): sube cada 2500 puntos.
  const level = isAsteroids ? engineLevel : Math.floor(score / 2500) + 1;

  const handleEngineChange = (s: AsteroidsSnapshot) => {
    setScore(s.score);
    setLives(s.lives);
    setEngineLevel(s.level);
    setPaused(s.status === "paused");
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setRestartKey((k) => k + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {/* blur(): evita que Espacio vuelva a pulsar el botón en lugar de disparar */}
          <button
            className="btn yellow"
            onClick={(e) => {
              e.currentTarget.blur();
              setPaused((p) => !p);
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            onClick={(e) => {
              e.currentTarget.blur();
              setOver(true);
            }}
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
          {isAsteroids ? (
            <AsteroidsCanvas
              paused={paused}
              restartKey={restartKey}
              ended={over}
              onChange={handleEngineChange}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setNameEdit(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button
                className="btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  restart();
                }}
              >
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
