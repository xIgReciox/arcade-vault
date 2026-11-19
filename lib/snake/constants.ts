// Constantes del juego SNAKE. Valores definidos en specs/10-snake-juego.md.

export const W = 800;
export const H = 600;

export const CELL = 40;
export const COLS = 20;
export const ROWS = 15;

export const START_LENGTH = 3;
export const START_HEAD_X = 5;
export const START_HEAD_Y = 7;
export const START_DIR = "right" as const;

export const FRUIT_POINTS = 10;

export const TICK_START_MS = 140;
export const TICK_MIN_MS = 60;
export const TICK_STEP_MS = 10;
export const FRUITS_PER_STEP = 5;

export const INPUT_QUEUE_MAX = 2;

export const ASSET_BASE = "/games/snake";
