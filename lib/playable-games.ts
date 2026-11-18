// Registro cliente de juegos jugables. La clave es el mismo `id` de lib/games.ts
// y de la tabla `games` de Supabase. Solo se importa desde componentes cliente.

import type { GameEngineFactory } from "@/lib/game-engine";

export interface PlayableGame {
  load: () => Promise<GameEngineFactory>; // import() diferido del motor
  width: number; // resolución interna del canvas
  height: number;
  label: string; // aria-label del canvas
}

export const PLAYABLE_GAMES: Record<string, PlayableGame> = {
  asteroids: {
    load: async () => {
      const { AsteroidsEngine } = await import("@/lib/asteroids/engine");
      return (canvas, cb) => new AsteroidsEngine(canvas, cb);
    },
    width: 800,
    height: 600,
    label: "Juego ASTEROIDS",
  },
  tetris: {
    load: async () => {
      const { TetrisEngine } = await import("@/lib/tetris/engine");
      return (canvas, cb) => new TetrisEngine(canvas, cb);
    },
    width: 800,
    height: 600,
    label: "Juego TETRIS",
  },
};

export function getPlayable(id: string): PlayableGame | undefined {
  return Object.hasOwn(PLAYABLE_GAMES, id) ? PLAYABLE_GAMES[id] : undefined;
}
