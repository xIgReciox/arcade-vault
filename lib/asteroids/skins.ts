// Paletas de ASTEROIDS por skin. `clasico` reproduce exactamente los colores originales
// (antes `COLORS` + `GLOW = 8` en constants.ts). El motor y las entidades no usan
// ningún color literal: todo sale de la paleta activa.

import type { SkinId } from "@/lib/skins";

export interface AsteroidsPalette {
  bg: string; // fondo del canvas
  ship: string; // nave (y su explosión)
  thrust: string; // llama del propulsor
  asteroid: string; // asteroides (y sus explosiones)
  bullet: string; // balas
  powerUp: string; // rombo del power-up y su texto "3x"
  hudText: string; // indicador de triple disparo en el canvas
  glow: number; // shadowBlur de las entidades (las partículas usan glow / 2)
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    bg: "#000000",
    ship: "#00f5ff",
    thrust: "rgba(255, 130, 0, 0.85)",
    asteroid: "#f5ff00",
    bullet: "#ffffff",
    powerUp: "#ff006e",
    hudText: "#ff006e",
    glow: 8,
  },
  neon: {
    bg: "#05050a",
    ship: "#00ff88",
    thrust: "#00f5ff",
    asteroid: "#ff006e",
    bullet: "#00f5ff",
    powerUp: "#f5ff00",
    hudText: "#f5ff00",
    glow: 18,
  },
  retro: {
    bg: "#0d0a05",
    ship: "#7fd35f",
    thrust: "#ffb000",
    asteroid: "#ff6a00",
    bullet: "#ffb000",
    powerUp: "#ffe08a",
    hudText: "#ffd98a",
    glow: 0,
  },
};
