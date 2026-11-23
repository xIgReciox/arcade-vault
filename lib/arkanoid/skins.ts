// Paletas de ARKANOID por skin. `clasico` reproduce exactamente el aspecto original
// (spritesheet sin tocar, fondo "#000", ayuda "#fff", "SONIDO OFF" "#f0c040", sin glow).
// Neón y retro recolorean el spritesheet en un canvas offscreen (ver assets.ts): cada
// región del sheet se tiñe con su color conservando el sombreado del pixel art.
// El motor y las entidades no usan ningún color literal: todo sale de la paleta activa.

import type { SkinId } from "@/lib/skins";
import type { BlockColor } from "./sprites";

/** Tintes con los que se recolorea el spritesheet; `null` = sprite original. */
export interface ArkanoidTints {
  paddle: string; // jugador
  ball: string; // pelota
  blocks: Record<BlockColor, string>; // bloque y sus frames de explosión
  /** "smooth" conserva el degradado del sprite; "flat" lo reduce a 3 tonos planos. */
  shading: "smooth" | "flat";
}

export interface ArkanoidPalette {
  bg: string; // fondo del canvas
  helpText: string; // ayuda de pausa "1–5 SALTAR DE NIVEL · M SONIDO"
  muteText: string; // aviso "SONIDO OFF"
  tints: ArkanoidTints | null;
  glow: number; // shadowBlur de paleta y pelota (los bloques usan glow / 2)
}

export const ARKANOID_SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    bg: "#000000",
    helpText: "#ffffff",
    muteText: "#f0c040",
    tints: null,
    glow: 0,
  },
  neon: {
    bg: "#05050a",
    helpText: "#e6e9ff",
    muteText: "#f5ff00",
    tints: {
      paddle: "#00ff88",
      ball: "#e6e9ff",
      blocks: {
        gray: "#b8c0ff",
        red: "#ff006e",
        yellow: "#f5ff00",
        cyan: "#00f5ff",
        magenta: "#c04dff",
        hotpink: "#ff4fd8",
        green: "#00ff88",
      },
      shading: "smooth",
    },
    glow: 18,
  },
  retro: {
    bg: "#0d0a05",
    helpText: "#ffd98a",
    muteText: "#ffb000",
    tints: {
      paddle: "#7fd35f",
      ball: "#fff4d6",
      blocks: {
        gray: "#d9c79a",
        red: "#ff6a00",
        yellow: "#ffe08a",
        cyan: "#ffb000",
        magenta: "#e08a3c",
        hotpink: "#ff8c4a",
        green: "#c9a227",
      },
      shading: "flat",
    },
    glow: 0,
  },
};
