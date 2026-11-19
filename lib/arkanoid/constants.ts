// Constantes del juego ARKANOID. Valores copiados de references/started-games/04-arkanoid/game.js.

export const W = 800;
export const H = 600;

export const PADDLE_SPEED = 400;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;

export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

export const LIVES = 3;
export const BLOCK_POINTS = 10;
export const EXPLOSION_DURATION = 150;

export const ASSET_BASE = "/games/arkanoid";
