// Funciones puras del juego SNAKE.

import { COLS, FRUITS_PER_STEP, ROWS, TICK_MIN_MS, TICK_START_MS, TICK_STEP_MS } from "./constants";

export type Direction = "up" | "down" | "left" | "right";

export interface Cell {
  x: number;
  y: number;
}

/** Intervalo de tick en ms según las frutas comidas: max(60, 140 − 10 × floor(frutas / 5)). */
export function nextTickMs(eaten: number): number {
  return Math.max(TICK_MIN_MS, TICK_START_MS - TICK_STEP_MS * Math.floor(eaten / FRUITS_PER_STEP));
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

/**
 * Casilla libre al azar entre las que no ocupa la serpiente.
 * Devuelve null si el tablero está lleno. `rng` devuelve un número en [0, 1).
 */
export function randomFreeCell(
  snake: readonly Cell[],
  rng: () => number = Math.random,
): Cell | null {
  const occupied = new Set<number>();
  for (const c of snake) occupied.add(c.y * COLS + c.x);
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(y * COLS + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
}
