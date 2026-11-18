// Estado y reglas del juego TETRIS. Portado de references/started-games/03-tetris/game.js
// sin globals ni DOM: todas las funciones reciben el estado explícitamente.

import { COLS, LINE_SCORES, PIECES, PIECE_COUNT, ROWS, type Matrix } from "./constants";
import { collide, createBoard, rotateCW } from "./utils";

export interface Piece {
  type: number;
  shape: Matrix;
  x: number;
  y: number;
}

export interface TetrisState {
  board: Matrix;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropInterval: number; // ms entre caídas automáticas
}

const KICKS = [0, -1, 1, -2, 2] as const;

export function levelFor(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

export function dropIntervalFor(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 90);
}

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_COUNT) + 1;
  const shape = (PIECES[type] as Matrix).map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

// Estado inicial. Si la primera pieza colisionara (imposible con tablero vacío) no se avisa.
export function createState(): TetrisState {
  const board = createBoard();
  return {
    board,
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: dropIntervalFor(1),
  };
}

export function move(s: TetrisState, dx: number): void {
  if (!collide(s.board, s.current.shape, s.current.x + dx, s.current.y)) s.current.x += dx;
}

export function tryRotate(s: TetrisState): void {
  const rotated = rotateCW(s.current.shape);
  for (const kick of KICKS) {
    if (!collide(s.board, rotated, s.current.x + kick, s.current.y)) {
      s.current.shape = rotated;
      s.current.x += kick;
      return;
    }
  }
}

export function merge(s: TetrisState): void {
  const { shape, x, y } = s.current;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) s.board[y + r][x + c] = shape[r][c];
    }
  }
}

export function clearLines(s: TetrisState): void {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (s.board[r].every((v) => v !== 0)) {
      s.board.splice(r, 1);
      s.board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    s.lines += cleared;
    // La puntuación usa el nivel anterior a recalcularlo.
    s.score += (LINE_SCORES[cleared] ?? 0) * s.level;
    s.level = levelFor(s.lines);
    s.dropInterval = dropIntervalFor(s.level);
  }
}

export function ghostY(s: TetrisState): number {
  let gy = s.current.y;
  while (!collide(s.board, s.current.shape, s.current.x, gy + 1)) gy++;
  return gy;
}

// Pasa la siguiente pieza a actual. Devuelve true si colisiona al aparecer (fin de partida).
export function spawn(s: TetrisState): boolean {
  s.current = s.next;
  s.next = randomPiece();
  return collide(s.board, s.current.shape, s.current.x, s.current.y);
}

// Fija la pieza, limpia líneas y genera la siguiente. Devuelve true si es fin de partida.
export function lockPiece(s: TetrisState): boolean {
  merge(s);
  clearLines(s);
  return spawn(s);
}

// Hard drop: +2 por celda recorrida. Devuelve true si es fin de partida.
export function hardDrop(s: TetrisState): boolean {
  const gy = ghostY(s);
  s.score += (gy - s.current.y) * 2;
  s.current.y = gy;
  return lockPiece(s);
}

// Soft drop: +1 por fila bajada; si no puede bajar, fija la pieza sin sumar.
// Devuelve true si es fin de partida.
export function softDrop(s: TetrisState): boolean {
  if (!collide(s.board, s.current.shape, s.current.x, s.current.y + 1)) {
    s.current.y++;
    s.score += 1;
    return false;
  }
  return lockPiece(s);
}

// Caída automática por gravedad (sin puntos). Devuelve true si es fin de partida.
export function gravityStep(s: TetrisState): boolean {
  if (!collide(s.board, s.current.shape, s.current.x, s.current.y + 1)) {
    s.current.y++;
    return false;
  }
  return lockPiece(s);
}
