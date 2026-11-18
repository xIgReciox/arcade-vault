"use client";

import { useEffect, useRef } from "react";
import { AsteroidsEngine, type AsteroidsCallbacks } from "@/lib/asteroids/engine";

interface AsteroidsCanvasProps extends AsteroidsCallbacks {
  /** Pausa controlada desde el reproductor (botón PAUSA / REANUDAR). */
  paused: boolean;
  /** Al cambiar este valor se reinicia la partida. */
  restartKey: number;
  /** true cuando la partida terminó (modal abierto o botón FIN). */
  ended: boolean;
}

export function AsteroidsCanvas({
  paused,
  restartKey,
  ended,
  onChange,
  onGameOver,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);

  // Los callbacks se leen por ref para no recrear el motor en cada render.
  const callbacksRef = useRef({ onChange, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onChange, onGameOver };
  });

  // Motor: se crea al montar y se destruye en el cleanup (seguro en Strict Mode).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new AsteroidsEngine(canvas, {
      onChange: (s) => callbacksRef.current.onChange(s),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
    });
    engineRef.current = engine;
    engine.start();

    // Pausa automática al perder foco la pestaña o la ventana.
    const autoPause = () => engine.pause();
    const onVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", autoPause);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", autoPause);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

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

  // Reinicio: ignora el primer render (el motor ya arranca de cero).
  const lastRestartKey = useRef(restartKey);
  useEffect(() => {
    if (lastRestartKey.current === restartKey) return;
    lastRestartKey.current = restartKey;
    engineRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      aria-label="Juego ASTEROIDS"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
