// Entidades del juego SNAKE: la serpiente (cuerpo por casillas) y la fruta.

import type { FruitSheet } from "./assets";
import { CELL, COLS, ROWS, START_DIR, START_HEAD_X, START_HEAD_Y, START_LENGTH } from "./constants";
import type { SnakePalette } from "./skins";
import { FRUIT_NAMES, FRUIT_SPRITES } from "./sprites";
import { randomFreeCell, type Cell, type Direction } from "./utils";

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const SEGMENT_INSET = 3;
const SEGMENT_RADIUS = 10;
const FRUIT_SIZE = 36; // alto del sprite dentro de la casilla de 40 px

export class Snake {
  /** Casillas del cuerpo; el índice 0 es la cabeza. */
  cells: Cell[] = [];
  /** Dirección del último paso (la que usan los ojos al dibujar). */
  dir: Direction = START_DIR;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.dir = START_DIR;
    this.cells = [];
    for (let i = 0; i < START_LENGTH; i++) {
      this.cells.push({ x: START_HEAD_X - i, y: START_HEAD_Y });
    }
  }

  get head(): Cell {
    return this.cells[0];
  }

  /** Casilla a la que iría la cabeza al avanzar en `dir`. */
  nextHead(dir: Direction): Cell {
    const d = DELTA[dir];
    return { x: this.head.x + d.x, y: this.head.y + d.y };
  }

  /**
   * Colisión de `next` con pared o cuerpo. Si no crece, la cola se libera en ese mismo tick,
   * así que moverse a su casilla no cuenta como choque.
   */
  collides(next: Cell, grow: boolean): boolean {
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) return true;
    const end = grow ? this.cells.length : this.cells.length - 1;
    for (let i = 0; i < end; i++) {
      if (this.cells[i].x === next.x && this.cells[i].y === next.y) return true;
    }
    return false;
  }

  /** Avanza una casilla; si `grow` es falso la cola se retira. No comprueba colisiones. */
  step(dir: Direction, grow: boolean): void {
    this.cells.unshift(this.nextHead(dir));
    if (!grow) this.cells.pop();
    this.dir = dir;
  }

  draw(ctx: CanvasRenderingContext2D, pal: SnakePalette): void {
    ctx.save();

    // Un solo trazado para todo el cuerpo: el glow se aplica una vez por grupo, no por segmento.
    const size = CELL - SEGMENT_INSET * 2;
    ctx.beginPath();
    for (let i = this.cells.length - 1; i >= 1; i--) {
      const c = this.cells[i];
      ctx.roundRect(
        c.x * CELL + SEGMENT_INSET,
        c.y * CELL + SEGMENT_INSET,
        size,
        size,
        SEGMENT_RADIUS,
      );
      // Conector con el segmento anterior para que el cuerpo se vea continuo.
      const p = this.cells[i - 1];
      const x = Math.min(c.x, p.x) * CELL + SEGMENT_INSET;
      const y = Math.min(c.y, p.y) * CELL + SEGMENT_INSET;
      const w = Math.abs(c.x - p.x) * CELL + size;
      const h = Math.abs(c.y - p.y) * CELL + size;
      ctx.roundRect(x, y, w, h, SEGMENT_RADIUS);
    }
    ctx.shadowColor = pal.glowColor;
    ctx.shadowBlur = pal.glow;
    ctx.fillStyle = pal.body;
    ctx.fill();

    // Cabeza
    const h = this.head;
    ctx.beginPath();
    ctx.roundRect(
      h.x * CELL + SEGMENT_INSET - 1,
      h.y * CELL + SEGMENT_INSET - 1,
      size + 2,
      size + 2,
      SEGMENT_RADIUS,
    );
    ctx.fillStyle = pal.head;
    ctx.fill();

    // Ojos, sin glow
    ctx.shadowBlur = 0;
    const d = DELTA[this.dir];
    const cx = h.x * CELL + CELL / 2 + d.x * 6;
    const cy = h.y * CELL + CELL / 2 + d.y * 6;
    // Eje perpendicular a la dirección
    const px = -d.y;
    const py = d.x;
    for (const side of [-1, 1]) {
      const ex = cx + px * side * 8;
      const ey = cy + py * side * 8;
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pal.eye;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + d.x * 1.5, ey + d.y * 1.5, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = pal.pupil;
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Fruit {
  private t = 0;

  constructor(
    public cell: Cell,
    public sprite: string,
  ) {}

  /** Fruta en una casilla libre al azar con un sprite al azar; null si no queda casilla libre. */
  static spawn(snake: readonly Cell[], rng: () => number = Math.random): Fruit | null {
    const cell = randomFreeCell(snake, rng);
    if (!cell) return null;
    const sprite =
      FRUIT_NAMES[Math.min(FRUIT_NAMES.length - 1, Math.floor(rng() * FRUIT_NAMES.length))];
    return new Fruit(cell, sprite);
  }

  /** Avanza la animación (pulso suave). `dt` en segundos. */
  step(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D, sheet: FruitSheet | null, pal: SnakePalette): void {
    const cx = this.cell.x * CELL + CELL / 2;
    const cy = this.cell.y * CELL + CELL / 2;
    const pulse = 1 + Math.sin(this.t * 5) * 0.04;

    ctx.save();
    if (sheet) {
      const frame = FRUIT_SPRITES[this.sprite];
      // Escalado uniforme por la altura, centrado en la casilla: sin deformar el ancho.
      const scale = (FRUIT_SIZE / frame.h) * pulse;
      const dw = frame.w * scale;
      const dh = frame.h * scale;
      const s = sheet.scale;
      // Hoja reducida (retro): se amplía sin suavizado para que se vea pixelada.
      if (s < 1) ctx.imageSmoothingEnabled = false;
      if (pal.fruitGlow > 0) {
        ctx.shadowColor = pal.fruitGlowColor;
        ctx.shadowBlur = pal.fruitGlow;
      }
      ctx.drawImage(
        sheet.image,
        frame.x * s,
        frame.y * s,
        frame.w * s,
        frame.h * s,
        cx - dw / 2,
        cy - dh / 2,
        dw,
        dh,
      );
      ctx.shadowBlur = 0;
    } else {
      // Respaldo si fruits.png no cargó.
      ctx.shadowColor = pal.fruitGlowColor;
      ctx.shadowBlur = pal.glow;
      ctx.fillStyle = pal.fruitFallback;
      ctx.beginPath();
      ctx.arc(cx, cy, 12 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
