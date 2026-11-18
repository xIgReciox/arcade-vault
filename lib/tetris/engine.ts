// Motor del juego TETRIS: loop, pausa, game over y dibujo en un único canvas 800×600.
// Port encapsulado de references/started-games/03-tetris/game.js (sin globals ni DOM).

import {
  BLOCK,
  BOARD_H,
  BOARD_W,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  GLOW,
  H,
  PANEL_X,
  ROWS,
  UI,
  W,
  type Matrix,
} from "./constants";
import type { GameCallbacks, GameEngine, GameSnapshot, GameStatus } from "@/lib/game-engine";
import { Input } from "./input";
import {
  createState,
  ghostY,
  gravityStep,
  hardDrop,
  move,
  softDrop,
  tryRotate,
  type TetrisState,
} from "./rules";

export type TetrisStatus = GameStatus;

// TETRIS no tiene vidas y siempre tiene nivel: `lives` es null y `level` se estrecha a number.
export type TetrisSnapshot = GameSnapshot & { lives: null; level: number };

export type TetrisCallbacks = GameCallbacks;

const MAX_DT = 50; // ms

// Posición del panel dibujado a la derecha del tablero
const NEXT_Y = 70;
const NEXT_SIZE = 4 * BLOCK;
const LINES_Y = 260;

export class TetrisEngine implements GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: TetrisCallbacks;
  private input = new Input();

  private state: TetrisState;
  private status: TetrisStatus = "playing";
  private dropAccum = 0;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private last: TetrisSnapshot | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: TetrisCallbacks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.state = createState();
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.input.attach();
    this.lastTime = null;
    this.emit();
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause(): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.input.clear();
    this.emit();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.input.clear();
    this.lastTime = null;
    this.emit();
  }

  restart(): void {
    if (this.destroyed) return;
    this.initGame();
    this.input.clear();
    this.input.enabled = true;
    this.lastTime = null;
    this.emit();
  }

  // Termina la partida (botón FIN): avisa con la puntuación actual.
  endGame(): void {
    if (this.status === "gameover") return;
    this.setGameOver();
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.input.detach();
  }

  // ── Estado ──────────────────────────────────────────────────────────────────

  private initGame(): void {
    this.state = createState();
    this.status = "playing";
    this.dropAccum = 0;
  }

  // Único punto desde el que se emite onGameOver; no-op si ya estaba terminada.
  private setGameOver(): void {
    if (this.status === "gameover") return;
    this.status = "gameover";
    this.input.clear();
    this.input.enabled = false; // con el modal abierto el motor ignora el teclado
    this.emit();
    this.callbacks.onGameOver(this.state.score);
  }

  // Emite onChange solo si cambió score, nivel o estado.
  private emit(): void {
    const s: TetrisSnapshot = {
      score: this.state.score,
      lives: null,
      level: this.state.level,
      status: this.status,
    };
    const l = this.last;
    if (l && l.score === s.score && l.level === s.level && l.status === s.status) return;
    this.last = s;
    this.callbacks.onChange(s);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, MAX_DT);
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.status === "gameover") return;

    const actions = this.input.drain();
    const s = this.state;

    for (const action of actions) {
      if (action === "pause") {
        if (this.status === "paused") this.resume();
        else this.pause();
        continue;
      }
      if (this.status !== "playing") continue; // en pausa se descartan las demás acciones

      let over = false;
      switch (action) {
        case "left":
          move(s, -1);
          break;
        case "right":
          move(s, 1);
          break;
        case "rotate":
          tryRotate(s);
          break;
        case "softDrop":
          over = softDrop(s);
          break;
        case "hardDrop":
          over = hardDrop(s);
          break;
      }
      if (over) {
        this.setGameOver();
        return;
      }
    }

    if (this.status !== "playing") return;

    // Gravedad
    this.dropAccum += dt;
    if (this.dropAccum >= s.dropInterval) {
      this.dropAccum = 0;
      if (gravityStep(s)) {
        this.setGameOver();
        return;
      }
    }

    this.emit();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    const s = this.state;

    ctx.fillStyle = UI.bg;
    ctx.fillRect(0, 0, W, H);

    this.drawGrid(ctx);
    this.drawBoardBlocks(ctx);

    // Ghost (alpha 0.2) y pieza actual
    const gy = ghostY(s);
    ctx.globalAlpha = 0.2;
    this.drawShape(ctx, s.current.shape, s.current.x, gy, BOARD_X, BOARD_Y);
    ctx.globalAlpha = 1;
    this.drawGlowShape(ctx, s.current.shape, s.current.x, s.current.y, BOARD_X, BOARD_Y);

    this.drawPanel(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = UI.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();

    // Marco del tablero
    ctx.strokeStyle = "rgba(0, 245, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_X + 0.5, BOARD_Y + 0.5, BOARD_W - 1, BOARD_H - 1);
  }

  // Bloques fijados del tablero, con glow por grupo de color (no por bloque).
  private drawBoardBlocks(ctx: CanvasRenderingContext2D): void {
    const board = this.state.board;
    for (let type = 1; type < COLORS.length; type++) {
      let any = false;
      for (let r = 0; r < ROWS && !any; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] === type) {
            any = true;
            break;
          }
        }
      }
      if (!any) continue;
      ctx.save();
      ctx.shadowColor = COLORS[type] as string;
      ctx.shadowBlur = GLOW;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] === type)
            this.drawBlock(ctx, BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, type);
        }
      }
      ctx.restore();
    }
  }

  private drawGlowShape(
    ctx: CanvasRenderingContext2D,
    shape: Matrix,
    gx: number,
    gy: number,
    ox: number,
    oy: number,
  ): void {
    ctx.save();
    ctx.shadowColor = COLORS[this.state.current.type] as string;
    ctx.shadowBlur = GLOW;
    this.drawShape(ctx, shape, gx, gy, ox, oy);
    ctx.restore();
  }

  // Dibuja una matriz con su origen en (ox, oy) píxeles y posición (gx, gy) en celdas.
  private drawShape(
    ctx: CanvasRenderingContext2D,
    shape: Matrix,
    gx: number,
    gy: number,
    ox: number,
    oy: number,
  ): void {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c])
          this.drawBlock(ctx, ox + (gx + c) * BLOCK, oy + (gy + r) * BLOCK, shape[r][c]);
      }
    }
  }

  private drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, type: number): void {
    ctx.fillStyle = COLORS[type] as string;
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
    // Brillo superior (sin glow propio)
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, 4);
    ctx.restore();
  }

  private drawPanel(ctx: CanvasRenderingContext2D): void {
    const s = this.state;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // NEXT
    ctx.fillStyle = UI.label;
    ctx.font = "16px monospace";
    ctx.fillText("NEXT", PANEL_X, NEXT_Y - 14);
    ctx.strokeStyle = "rgba(0, 245, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);

    const shape = s.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.save();
    ctx.shadowColor = COLORS[s.next.type] as string;
    ctx.shadowBlur = GLOW;
    this.drawShape(ctx, shape, offX, offY, PANEL_X, NEXT_Y);
    ctx.restore();

    // LINES
    ctx.fillStyle = UI.label;
    ctx.font = "16px monospace";
    ctx.fillText("LINES", PANEL_X, LINES_Y);
    ctx.fillStyle = UI.text;
    ctx.font = "32px monospace";
    ctx.fillText(String(s.lines), PANEL_X, LINES_Y + 40);

    ctx.restore();
  }
}
