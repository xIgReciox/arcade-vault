// Registro cliente de juegos jugables. La clave es el mismo `id` de lib/games.ts
// y de la tabla `games` de Supabase. Solo se importa desde componentes cliente.

import type { GameEngineFactory } from "@/lib/game-engine";
import { SKIN_IDS, type SkinId } from "@/lib/skins";

export type TouchDirection = "left" | "right" | "up" | "down";

export interface TouchButton {
  label: "A" | "B"; // texto del botón
  code: string; // KeyboardEvent.code que se emite, p. ej. "Space"
  aria: string; // etiqueta accesible, p. ej. "Disparar"
}

export interface TouchLayout {
  directions: readonly TouchDirection[]; // flechas visibles de la cruceta
  buttons: readonly TouchButton[]; // 0, 1 o 2; los no usados no se muestran
  repeat: readonly TouchDirection[]; // direcciones con auto-repeat emulado
}

export interface PlayableGame {
  load: () => Promise<GameEngineFactory>; // import() diferido del motor
  width: number; // resolución interna del canvas
  height: number;
  label: string; // aria-label del canvas
  // Skins que el motor soporta vía setSkin. Objetivo: los tres (auditado por skin-designer).
  // Con uno solo, el reproductor no muestra selector.
  skins: readonly SkinId[];
  // Mando táctil (SPEC 11). Sin definir, el reproductor no muestra mando.
  touch?: TouchLayout;
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
    touch: {
      directions: ["left", "right", "up"], // up = empuje
      buttons: [{ label: "A", code: "Space", aria: "Disparar" }],
      repeat: [], // el motor lee la tecla mantenida
    },
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
    touch: {
      directions: ["left", "right", "up", "down"], // up = rotar
      buttons: [
        { label: "A", code: "Space", aria: "Caída" },
        { label: "B", code: "KeyX", aria: "Rotar" },
      ],
      repeat: ["left", "right", "down"], // su Input depende del auto-repeat del navegador
    },
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
    touch: {
      directions: ["left", "right"],
      buttons: [],
      repeat: [], // el motor lee la tecla mantenida
    },
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
    touch: {
      directions: ["left", "right", "up", "down"],
      buttons: [],
      repeat: [], // giro discreto: ignora e.repeat
    },
  },
};

export function getPlayable(id: string): PlayableGame | undefined {
  return Object.hasOwn(PLAYABLE_GAMES, id) ? PLAYABLE_GAMES[id] : undefined;
}
