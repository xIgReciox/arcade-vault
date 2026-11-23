"use client";

import { useEffect, useRef } from "react";
import type { GameCallbacks, GameEngine } from "@/lib/game-engine";
import type { PlayableGame } from "@/lib/playable-games";
import { DEFAULT_SKIN, type SkinId } from "@/lib/skins";

interface GameCanvasProps extends GameCallbacks {
  /** Entrada del registro PLAYABLE_GAMES: motor (carga diferida), resolución y etiqueta. */
  playable: PlayableGame;
  /** Pausa controlada desde el reproductor (botón PAUSA / REANUDAR). */
  paused: boolean;
  /** Al cambiar este valor se reinicia la partida. */
  restartKey: number;
  /** true cuando la partida terminó (modal abierto o botón FIN). */
  ended: boolean;
  /** Paleta activa; se aplica en caliente con engine.setSkin (no reinicia la partida). */
  skin?: SkinId;
}

export function GameCanvas({
  playable,
  paused,
  restartKey,
  ended,
  skin = DEFAULT_SKIN,
  onChange,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Los callbacks y las props de control se leen por ref: no recrean el motor
  // y permiten aplicar el estado actual cuando la carga asíncrona termina.
  const callbacksRef = useRef({ onChange, onGameOver });
  const controlRef = useRef({ paused, ended, restartKey, skin });
  const lastRestartKey = useRef(restartKey);
  useEffect(() => {
    callbacksRef.current = { onChange, onGameOver };
    controlRef.current = { paused, ended, restartKey, skin };
  });

  // Motor: se carga y crea al montar, y se destruye en el cleanup (seguro en Strict Mode).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let engine: GameEngine | null = null;

    const onVisibility = () => {
      if (document.hidden) engine?.pause();
    };
    const autoPause = () => engine?.pause();

    playable.load().then((create) => {
      if (cancelled) return;
      engine = create(
        canvas,
        {
          onChange: (s) => callbacksRef.current.onChange(s),
          onGameOver: (score) => callbacksRef.current.onGameOver(score),
        },
        { skin: controlRef.current.skin },
      );
      engineRef.current = engine;
      lastRestartKey.current = controlRef.current.restartKey;
      engine.start();

      // Pausa o fin pedidos mientras el motor se cargaba.
      if (controlRef.current.paused) engine.pause();
      if (controlRef.current.ended) engine.endGame();

      // Pausa automática al perder foco la pestaña o la ventana.
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", autoPause);
    });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", autoPause);
      engine?.destroy();
      engineRef.current = null;
    };
  }, [playable]);

  // Pausa controlada por props. pause()/resume() son no-ops si ya están en ese estado.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);

  // Fin de partida pedido desde fuera (botón FIN). No-op si ya terminó.
  useEffect(() => {
    if (ended) engineRef.current?.endGame();
  }, [ended]);

  // Skin en caliente: solo cambia la paleta del motor (si la soporta).
  useEffect(() => {
    engineRef.current?.setSkin?.(skin);
  }, [skin]);

  // Reinicio: ignora el primer render (el motor ya arranca de cero).
  useEffect(() => {
    if (lastRestartKey.current === restartKey) return;
    lastRestartKey.current = restartKey;
    engineRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={playable.width}
      height={playable.height}
      aria-label={playable.label}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
