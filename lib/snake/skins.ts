// Paletas de SNAKE por skin. `clasico` reproduce exactamente los colores originales
// (antes literales en engine.ts y entities.ts). El motor y las entidades no usan ningún
// color literal: todo sale de la paleta activa.

import type { SkinId } from "@/lib/skins";

/** Recoloreado de fruits.png en un canvas offscreen (ver assets.ts). */
export interface FruitRecolor {
  /** Rampa por luminancia del píxel original: [oscuro, claro]. */
  ramp: readonly [string, string];
  /** Niveles de cuantización (0 = continuo). */
  levels: number;
  /** Escala de la hoja recoloreada (<1 pixela el sprite al ampliarlo sin suavizado). */
  scale: number;
  /** Alfa binario (bordes duros, estilo 8-bit). */
  hardAlpha: boolean;
}

export interface SnakePalette {
  bg: string; // fondo del canvas
  grid: string; // líneas de la cuadrícula
  body: string; // cuerpo de la serpiente (jugador)
  head: string; // cabeza
  glowColor: string; // shadowColor de la serpiente
  glow: number; // shadowBlur de la serpiente (y de la fruta de respaldo)
  eye: string; // blanco de los ojos
  pupil: string; // pupila
  fruitFallback: string; // fruta si fruits.png no cargó (recolectable)
  fruitGlowColor: string; // shadowColor de la fruta
  fruitGlow: number; // shadowBlur del sprite de fruta
  fruitRecolor: FruitRecolor | null; // null = sprite original
}

export const SNAKE_SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    bg: "#0a0a18",
    grid: "rgba(120, 255, 180, 0.05)",
    body: "#2bd96b",
    head: "#7dffa8",
    glowColor: "#39ff88",
    glow: 12,
    eye: "#ffffff",
    pupil: "#0a0a18",
    fruitFallback: "#ff2bd6",
    fruitGlowColor: "#ff2bd6",
    fruitGlow: 0,
    fruitRecolor: null,
  },
  neon: {
    bg: "#05050a",
    grid: "rgba(0, 245, 255, 0.07)",
    body: "#00ff88",
    head: "#aefcff",
    glowColor: "#00ff88",
    glow: 22,
    eye: "#ffffff",
    pupil: "#05050a",
    fruitFallback: "#ff006e",
    fruitGlowColor: "#ff006e",
    fruitGlow: 18,
    fruitRecolor: { ramp: ["#ff006e", "#f5ff00"], levels: 0, scale: 1, hardAlpha: false },
  },
  retro: {
    bg: "#0d0a05",
    grid: "rgba(255, 176, 0, 0.06)",
    body: "#7fd35f",
    head: "#b8f28c",
    glowColor: "#7fd35f",
    glow: 0,
    eye: "#ffe08a",
    pupil: "#0d0a05",
    fruitFallback: "#ffb000",
    fruitGlowColor: "#ffb000",
    fruitGlow: 0,
    fruitRecolor: { ramp: ["#ff6a00", "#ffe08a"], levels: 3, scale: 0.1, hardAlpha: true },
  },
};
