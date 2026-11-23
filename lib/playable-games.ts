// Registro cliente de juegos jugables. La clave es el mismo `id` de lib/games.ts
// y de la tabla `games` de Supabase. Solo se importa desde componentes cliente.

import type { GameEngineFactory } from "@/lib/game-engine";
import { SKIN_IDS, type SkinId } from "@/lib/skins";

export interface PlayableGame {
  load: () => Promise<GameEngineFactory>; // import() diferido del motor
  width: number; // resolución interna del canvas
  height: number;
  label: string; // aria-label del canvas
  // Skins que el motor soporta vía setSkin. Objetivo: los tres (auditado por skin-designer).
  // Con uno solo, el reproductor no muestra selector.
  skins: readonly SkinId[];
}

export const PLAYABLE_GAMES: Record<string, PlayableGame> = {
  asteroids: {
    load: async () => {
      const { AsteroidsEngine } = await import("@/lib/asteroids/engine");
      return (canvas, cb, options) => new AsteroidsEngine(canvas, cb, options);
    },
    width: 800,
    height: 600,
    label: "Juego ASTEROIDS",
    skins: SKIN_IDS,
  },
  tetris: {
    load: async () => {
      const { TetrisEngine } = await import("@/lib/tetris/engine");
      return (canvas, cb) => new TetrisEngine(canvas, cb);
    },
    width: 800,
    height: 600,
    label: "Juego TETRIS",
    skins: ["clasico"], // pendiente: neon y retro
  },
  arkanoid: {
    load: async () => {
      // Precarga spritesheet y sonidos; nunca rechaza (un asset que falla queda en null).
      const { loadArkanoidAssets } = await import("@/lib/arkanoid/assets");
      const assets = await loadArkanoidAssets();
      const { ArkanoidEngine } = await import("@/lib/arkanoid/engine");
      return (canvas, cb, options) => new ArkanoidEngine(canvas, cb, assets, options);
    },
    width: 800,
    height: 600,
    label: "Juego ARKANOID",
    skins: SKIN_IDS,
  },
  snake: {
    load: async () => {
      // Precarga fruits.png y sus variantes por skin; nunca rechaza (si falla, la fruta se
      // dibuja como círculo; si falla un recoloreado, ese skin usa la hoja original).
      const { loadSnakeAssets } = await import("@/lib/snake/assets");
      const assets = await loadSnakeAssets();
      const { SnakeEngine } = await import("@/lib/snake/engine");
      return (canvas, cb, options) => new SnakeEngine(canvas, cb, assets, options);
    },
    width: 800,
    height: 600,
    label: "Juego SNAKE",
    skins: SKIN_IDS,
  },
};

export function getPlayable(id: string): PlayableGame | undefined {
  return Object.hasOwn(PLAYABLE_GAMES, id) ? PLAYABLE_GAMES[id] : undefined;
}
