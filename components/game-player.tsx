"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GameCanvas } from "@/components/games/game-canvas";
import { SkinPicker } from "@/components/games/skin-picker";
import { TouchControls } from "@/components/games/touch-controls";
import type { GameSnapshot } from "@/lib/game-engine";
import { DEFAULT_SKIN, readStoredSkin, type SkinId, writeStoredSkin } from "@/lib/skins";
import { getPlayable } from "@/lib/playable-games";
import { submitScore } from "@/app/games/actions";
import type { Game, SavedScore } from "@/lib/games";
import { PLAYER_NAME_RE } from "@/lib/scores-shared";

const SCORES_KEY = "av_scores";
const PLAYER_NAME_KEY = "av_player_name";

// Deja solo A-Z, 0-9 y _ en mayúsculas, máx. 12 (formato de nombre del ranking real).
function sanitizePlayerName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 12);
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

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
  const [lives, setLives] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // null = sin editar; así el nombre sigue a la sesión (que se lee tras montar).
  const [nameEdit, setNameEdit] = useState<string | null>(null);

  // Juego real (en PLAYABLE_GAMES): score/vidas/nivel/pausa vienen del motor.
  const playable = getPlayable(game.id);
  const [engineLevel, setEngineLevel] = useState<number | null>(1);
  const [restartKey, setRestartKey] = useState(0);
  // Skin del juego real: `clasico` en el primer render (hidratación) y luego el de av_skins.
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  const playableSkins = playable?.skins;

  // Juego real: nombre del ranking (Supabase). Prellenado tras montar para no desajustar la hidratación.
  const [storedRankName, setStoredRankName] = useState<string | null>(null);
  const [rankNameEdit, setRankNameEdit] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  const name = nameEdit ?? user?.name ?? "INVITADO";
  const rankName = rankNameEdit ?? storedRankName ?? sanitizePlayerName(user?.name ?? "");
  const rankNameValid = PLAYER_NAME_RE.test(rankName);
  // Nivel derivado de la puntuación (juegos simulados): sube cada 2500 puntos.
  const level = playable ? engineLevel : Math.floor(score / 2500) + 1;

  const handleEngineChange = (s: GameSnapshot) => {
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
    if (!playable) return;
    try {
      const stored = localStorage.getItem(PLAYER_NAME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única tras montar (localStorage)
      if (stored && PLAYER_NAME_RE.test(stored)) setStoredRankName(stored);
    } catch {
      // localStorage bloqueado: sin prellenado desde av_player_name.
    }
  }, [playable]);

  useEffect(() => {
    if (!playableSkins) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única tras montar (localStorage)
    setSkin(readStoredSkin(game.id, playableSkins));
  }, [game.id, playableSkins]);

  const handleSkinChange = (next: SkinId) => {
    setSkin(next);
    writeStoredSkin(game.id, next);
  };

  const handleSaveReal = async () => {
    if (!rankNameValid || saveStatus === "saving") return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const result = await submitScore({ gameId: game.id, playerName: rankName, score });
      if (result.ok) {
        try {
          localStorage.setItem(PLAYER_NAME_KEY, rankName);
        } catch {
          // localStorage bloqueado: el guardado en Supabase no depende de él.
        }
        setStoredRankName(rankName);
        setSaveStatus("saved");
      } else {
        setSaveError(result.error);
        setSaveStatus("error");
      }
    } catch {
      setSaveError("No se pudo conectar. Inténtalo de nuevo.");
      setSaveStatus("error");
    }
  };

  useEffect(() => {
    if (playable || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [playable, over, paused]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveStatus("idle");
    setSaveError("");
    setRestartKey((k) => k + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="hud-stats">
          <div className="hud-stat hud-player">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {/* is-null: en móvil se omite la estadística que el juego no tiene */}
          <div className={`hud-stat lives${lives === null ? " is-null" : ""}`}>
            <div className="l">Vidas</div>
            <div className="v">{lives === null ? "—" : "♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className={`hud-stat level${level === null ? " is-null" : ""}`}>
            <div className="l">Nivel</div>
            <div className="v">{level === null ? "—" : String(level).padStart(2, "0")}</div>
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
          {playable ? (
            <GameCanvas
              playable={playable}
              paused={paused}
              restartKey={restartKey}
              ended={over}
              skin={skin}
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

      {playable?.touch && <TouchControls layout={playable.touch} paused={paused} over={over} />}

      {playable && playable.skins.length > 1 && (
        <SkinPicker skins={playable.skins} value={skin} onChange={handleSkinChange} />
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {playable ? (
              saveStatus !== "saved" ? (
                <>
                  <div className="input-row">
                    <input
                      value={rankName}
                      onChange={(e) => setRankNameEdit(sanitizePlayerName(e.target.value))}
                      placeholder="TU NOMBRE (3-12)"
                      disabled={saveStatus === "saving"}
                    />
                    <button
                      className="btn yellow"
                      onClick={handleSaveReal}
                      disabled={!rankNameValid || saveStatus === "saving"}
                    >
                      {saveStatus === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                    </button>
                  </div>
                  {saveStatus === "error" && (
                    <div
                      role="alert"
                      className="mono"
                      style={{ color: "var(--magenta)", fontSize: 11, letterSpacing: "0.08em" }}
                    >
                      {saveError}
                    </div>
                  )}
                </>
              ) : (
                <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
              )
            ) : !saved ? (
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
