// Rectángulos de origen del spritesheet. Copiados de references/started-games/04-arkanoid/assets/spritesheet.js.

export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export type BlockColor = "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

const f = (sx: number, sy: number, sw = 32, sh = 16): Frame => ({ sx, sy, sw, sh });
const explosion = (sy: number): Frame[] => [256, 288, 320, 352].map((sx) => f(sx, sy));

export const SPRITES: {
  paddle: Frame;
  ball: Frame;
  blocks: Record<BlockColor, Frame>;
} = {
  paddle: f(32, 112, 162, 14),
  ball: f(32, 32, 16, 16),
  blocks: {
    gray: f(32, 288),
    red: f(32, 176),
    yellow: f(32, 240),
    cyan: f(32, 192),
    magenta: f(32, 224),
    hotpink: f(32, 256),
    green: f(32, 208),
  },
};

// El original reutiliza los frames de rojo para gray.
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
  red: explosion(176),
  cyan: explosion(192),
  green: explosion(208),
  magenta: explosion(224),
  yellow: explosion(240),
  hotpink: explosion(256),
  gray: explosion(176),
};
