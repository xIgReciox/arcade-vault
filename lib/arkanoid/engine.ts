// Motor del juego ARKANOID: loop, pausa, salto de nivel, sonido, game over y dibujo en un único canvas 800×600.
// Port encapsulado de references/started-games/04-arkanoid/game.js (sin globals ni DOM).
// El HUD (puntuación, vidas, nivel) y los overlays de PAUSA / GAME OVER los pone React.

import type {
  GameCallbacks,
  GameEngine,
  GameEngineOptions,
  GameSnapshot,
  GameStatus,
} from "@/lib/game-engine";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/lib/skins";
import type { ArkanoidAssets } from "./assets";
import { BLOCK_POINTS, H, LIVES, W } from "./constants";
import { Ball, Block, Explosion, Paddle, type ArkanoidLook } from "./entities";
import { Input, type Press } from "./input";
import { LEVELS } from "./levels";
import { ARKANOID_SKINS } from "./skins";
import { collideAABB } from "./utils";

export type ArkanoidStatus = GameStatus;

// ARKANOID siempre tiene vidas y nivel: ambos se estrechan a number.
export type ArkanoidSnapshot = GameSnapshot & { lives: number; level: number };

export type ArkanoidCallbacks = GameCallbacks;

const MAX_DT = 50; // ms
const LAST_LEVEL = LEVELS.length;

// Líneas de ayuda de la pausa, dibujadas en la franja libre de bloques (y < 80).
const HELP_TEXT = "1–5 SALTAR DE NIVEL · M SONIDO";
const HELP_Y = 40;
const MUTE_Y = 64;

const LEVEL_PRESS: Partial<Record<Press, number>> = {
  level1: 1,
  level2: 2,
  level3: 3,
  level4: 4,
  level5: 5,
};

export class ArkanoidEngine implements GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: ArkanoidCallbacks;
  private assets: ArkanoidAssets;
  private input: Input;

  private paddle = new Paddle();
  private ball = new Ball();
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];

  private score = 0;
  private lives = LIVES;
  private level = 1;
  private status: ArkanoidStatus = "playing";
  private muted = false;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private last: ArkanoidSnapshot | null = null;
  private look: ArkanoidLook;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: ArkanoidCallbacks,
    assets: ArkanoidAssets,
    options: GameEngineOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.assets = assets;
    this.look = this.lookFor(options.skin ?? DEFAULT_SKIN);
    this.input = new Input(canvas);
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

  // Cambia la paleta en caliente: solo afecta al dibujo (ni estado, ni puntuación, ni niveles).
  setSkin(skin: SkinId): void {
    this.look = this.lookFor(skin);
  }

  private lookFor(skin: SkinId): ArkanoidLook {
    const id = isSkinId(skin) ? skin : DEFAULT_SKIN;
    return { sheet: this.assets.sheets[id], palette: ARKANOID_SKINS[id] };
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
    this.lives = LIVES;
    this.status = "playing";
    this.paddle.reset();
    this.loadLevel(1);
  }

  // Carga un nivel conservando puntuación y vidas, y recoloca la pelota con su velocidad.
  private loadLevel(n: number): void {
    this.level = n;
    const lvl = LEVELS[n - 1];
    this.blocks = lvl.blocks.map((b) => new Block(b));
    this.explosions = [];
    this.ball.place(this.paddle, lvl.speed);
  }

  // Único punto desde el que se emite onGameOver; no-op si ya estaba terminada.
  private setGameOver(): void {
    if (this.status === "gameover") return;
    this.status = "gameover";
    this.input.clear();
    this.input.enabled = false; // con el modal abierto el motor ignora teclado y ratón
    this.emit();
    this.callbacks.onGameOver(this.score);
  }

  // Emite onChange solo si cambió score, vidas, nivel o estado.
  private emit(): void {
    const l = this.last;
    if (
      l &&
      l.score === this.score &&
      l.lives === this.lives &&
      l.level === this.level &&
      l.status === this.status
    )
      return;
    const s: ArkanoidSnapshot = {
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.status,
    };
    this.last = s;
    this.callbacks.onChange(s);
  }

  // ── Sonido ──────────────────────────────────────────────────────────────────

  // Solo se llama desde eventos de juego, que ocurren tras una interacción del jugador.
  private play(sfx: HTMLAudioElement | null): void {
    if (this.muted || !sfx) return;
    try {
      const p = (sfx.cloneNode() as HTMLAudioElement).play();
      if (p) p.catch(() => {});
    } catch {
      // un fallo de audio nunca debe romper el juego
    }
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, MAX_DT);
    this.lastTime = ts;
    this.update(dt / 1000);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private handlePresses(): void {
    for (const press of this.input.drain()) {
      if (press === "pause") {
        if (this.status === "paused") this.resume();
        else this.pause();
      } else if (press === "mute") {
        this.muted = !this.muted;
      } else if (this.status === "paused") {
        // En pausa, 1–5 saltan de nivel y reanudan; fuera de pausa no hacen nada.
        const n = LEVEL_PRESS[press];
        if (n !== undefined) {
          this.loadLevel(n);
          this.resume();
        }
      }
    }
  }

  private update(dt: number): void {
    if (this.status === "gameover") return;

    this.handlePresses();

    const mx = this.input.takeMouseX();
    if (mx !== null) this.paddle.centerAt(mx);

    if (this.status !== "playing") {
      this.emit();
      return;
    }

    const { paddle, ball } = this;

    paddle.dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    paddle.update(dt);

    if (ball.update(dt)) this.play(this.assets.bounce);
    if (ball.bounceOnPaddle(paddle)) this.play(this.assets.bounce);

    // Colisión con bloques: se destruye un solo bloque por frame.
    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        this.explosions.push(new Explosion(block));
        this.score += BLOCK_POINTS;
        ball.vy = -ball.vy;
        this.play(this.assets.breakSfx);
        if (this.blocks.every((b) => !b.alive)) {
          if (this.level < LAST_LEVEL) this.loadLevel(this.level + 1);
          else {
            this.setGameOver(); // victoria: limpiar el último nivel termina la partida
            return;
          }
        }
        break;
      }
    }

    for (const exp of this.explosions) exp.update(dt);
    this.explosions = this.explosions.filter((e) => !e.done);

    // Pelota perdida
    if (ball.y > H) {
      this.lives = Math.max(0, this.lives - 1);
      if (this.lives === 0) {
        this.setGameOver();
        return;
      }
      ball.place(paddle, LEVELS[this.level - 1].speed);
    }

    this.emit();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    const look = this.look;
    ctx.fillStyle = look.palette.bg;
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) block.draw(ctx, look);
    for (const exp of this.explosions) exp.draw(ctx, look);
    this.paddle.draw(ctx, look);
    this.ball.draw(ctx, look);

    if (this.status === "paused") this.drawPauseHelp(ctx);
  }

  // Ayuda de pausa: el overlay «EN PAUSA» es de React; el motor solo dibuja esto.
  private drawPauseHelp(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = this.look.palette.helpText;
    ctx.fillText(HELP_TEXT, W / 2, HELP_Y);
    if (this.muted) {
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = this.look.palette.muteText;
      ctx.fillText("SONIDO OFF", W / 2, MUTE_Y);
    }
    ctx.restore();
  }
}
