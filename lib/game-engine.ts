export type GameStatus = "playing" | "dead" | "paused" | "gameover";

export interface GameSnapshot {
  score: number;
  lives: number | null; // null = el juego no tiene vidas (el HUD muestra "—")
  level: number | null; // null = el juego no tiene niveles (el HUD muestra "—")
  status: GameStatus;
}

export interface GameCallbacks {
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score/lives/level/status
  onGameOver: (finalScore: number) => void;
}

export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  endGame(): void; // usado por el botón FIN
  destroy(): void; // cancela rAF y quita listeners
}

export type GameEngineFactory = (canvas: HTMLCanvasElement, callbacks: GameCallbacks) => GameEngine;
