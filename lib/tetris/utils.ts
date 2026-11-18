// Funciones puras del juego TETRIS. Portadas de references/started-games/03-tetris/game.js.

import { COLS, ROWS, type Matrix } from "./constants";

export function createBoard(): Matrix {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

export function rotateCW(shape: Matrix): Matrix {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Matrix = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

export function collide(board: Matrix, shape: Matrix, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
