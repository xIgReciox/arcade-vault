// Constantes del juego TETRIS. Valores copiados de references/started-games/03-tetris/game.js.

export type Matrix = number[][];

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Canvas completo (misma resolución que ASTEROIDS)
export const W = 800;
export const H = 600;

// Tablero 300×600 a la izquierda, sin escalar
export const BOARD_X = 0;
export const BOARD_Y = 0;
export const BOARD_W = COLS * BLOCK;
export const BOARD_H = ROWS * BLOCK;

// Panel (NEXT y LINES) a la derecha del tablero
export const PANEL_X = BOARD_W + 40;
export const PANEL_W = W - PANEL_X - 40;

// Índice 0 vacío; 1..8 = I, O, T, S, Z, J, L, N (tuerca)
export const PIECES: readonly (Matrix | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

export const PIECE_COUNT = 8;

export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

// Colores neón (valores de la plataforma en app/globals.css), indexados como PIECES
export const COLORS: readonly (string | null)[] = [
  null,
  "#00f5ff", // I - cian
  "#f5ff00", // O - amarillo
  "#ff006e", // T - magenta
  "#00ff88", // S - verde
  "#ff6ec7", // Z - rosa (variante de magenta)
  "#3d8bff", // J - azul (variante de cian)
  "#ff9500", // L - naranja (variante de amarillo)
  "#ffffff", // N - blanco
];

export const UI = {
  bg: "#000000",
  grid: "rgba(255, 255, 255, 0.07)",
  text: "#ffffff",
  label: "#00f5ff",
} as const;

// Intensidad base del glow (shadowBlur), moderada
export const GLOW = 8;
