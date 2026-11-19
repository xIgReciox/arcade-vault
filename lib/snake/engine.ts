// Motor del juego SNAKE: loop con acumulador, pausa, game over y dibujo en un único canvas 800×600.
// Escrito desde cero (sin globals ni DOM). El HUD (puntuación) y los overlays de PAUSA / GAME OVER
// los pone React; el canvas solo dibuja el campo, la serpiente y la fruta.

import type { GameCallbacks, GameEngine, GameSnapshot, GameStatus } from "@/lib/game-engine";
import type { SnakeAssets } from "./assets";
import { CELL, COLS, FRUIT_POINTS, H, ROWS, START_DIR, W } from "./constants";
import { Fruit, Snake } from "./entities";
import { Input } from "./input";
import { nextTickMs } from "./utils";

export type SnakeStatus = GameStatus;

// SNAKE no tiene vidas ni niveles: ambos son null y el HUD muestra «—».
export type SnakeSnapshot = GameSnapshot & { lives: null; level: null };

export type SnakeCallbacks = GameCallbacks;

const MAX_DT = 50; // ms

const BG_COLOR = "#0a0a18";
const GRID_COLOR = "rgba(120, 255, 180, 0.05)";

export class SnakeEngine implements GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: SnakeCallbacks;
  private assets: SnakeAssets;
  private input: Input;

  private snake = new Snake();
  private fruit: Fruit | null = null;

  private score = 0;
  private eaten = 0;
  private status: SnakeStatus = "playing";
  private acc = 0; // ms acumulados hacia el siguiente paso de lógica

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private last: SnakeSnapshot | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: SnakeCallbacks, assets: SnakeAssets) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.assets = assets;
    this.input = new Input();
    this.initGame();
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
    this.acc = 0;
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
    this.score = 0;
    this.eaten = 0;
    this.acc = 0;
    this.status = "playing";
    this.snake.reset();
    this.input.setDirection(START_DIR);
    this.fruit = Fruit.spawn(this.snake.cells);
  }

  // Único punto desde el que se emite onGameOver; no-op si ya estaba terminada.
  private setGameOver(): void {
    if (this.status === "gameover") return;
    this.status = "gameover";
    this.input.clear();
    this.input.enabled = false; // con el modal abierto el motor ignora el teclado
    this.emit();
    this.callbacks.onGameOver(this.score);
  }

  // Emite onChange solo si cambió score o estado.
  private emit(): void {
    const l = this.last;
    if (l && l.score === this.score && l.status === this.status) return;
    const s: SnakeSnapshot = { score: this.score, lives: null, level: null, status: this.status };
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

  private handlePresses(): void {
    for (const press of this.input.drain()) {
      if (press === "pause") {
        if (this.status === "paused") this.resume();
        else this.pause();
      }
    }
  }

  // `dt` en ms.
  private update(dt: number): void {
    if (this.status === "gameover") return;

    this.handlePresses();

    if (this.status !== "playing") {
      this.emit();
      return;
    }

    this.fruit?.step(dt / 1000);

    // Un paso de lógica cada `tick` ms; el tick se recalcula tras cada fruta.
    this.acc += dt;
    let tick = nextTickMs(this.eaten);
    while (this.acc >= tick && this.status === "playing") {
      this.acc -= tick;
      this.stepSnake();
      tick = nextTickMs(this.eaten);
    }

    this.emit();
  }

  // Un paso de lógica: aplica un giro encolado, avanza una casilla y resuelve fruta y colisiones.
  private stepSnake(): void {
    const { snake, fruit } = this;
    const dir = this.input.takeTurn() ?? snake.dir;
    const next = snake.nextHead(dir);
    const eats = fruit !== null && next.x === fruit.cell.x && next.y === fruit.cell.y;

    if (snake.collides(next, eats)) {
      this.setGameOver();
      return;
    }

    snake.step(dir, eats);
    if (!eats) return;

    this.score += FRUIT_POINTS;
    this.eaten++;
    this.fruit = Fruit.spawn(snake.cells);
    // Sin casilla libre para la fruta: la serpiente ocupa el tablero entero (victoria).
    if (this.fruit === null) this.setGameOver();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();

    this.fruit?.draw(ctx, this.assets);
    this.snake.draw(ctx);
  }
}
