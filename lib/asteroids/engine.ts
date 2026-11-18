// Motor del juego ASTEROIDS: estado, colisiones, niveles, dibujo y loop.
// Port encapsulado de references/started-games/02-asteroids/game.js (sin globals).

import {
  COLORS,
  GLOW,
  H,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  W,
} from "./constants";
import { Asteroid, Bullet, Particle, PowerUp, Ship } from "./entities";
import { Input } from "./input";
import { dist, rand } from "./utils";

export type AsteroidsStatus = "playing" | "dead" | "paused" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  status: AsteroidsStatus;
}

export interface AsteroidsCallbacks {
  onChange: (s: AsteroidsSnapshot) => void; // solo cuando cambia score/lives/level/status
  onGameOver: (finalScore: number) => void;
}

const MAX_DT = 0.05; // 50 ms
const RESPAWN_DELAY = 2;
const SAFE_DIST = 130;

export class AsteroidsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: AsteroidsCallbacks;
  private input = new Input();

  private ship: Ship;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];

  private score = 0;
  private lives = 3;
  private level = 1;
  private status: AsteroidsStatus = "playing";
  private pausedFrom: "playing" | "dead" = "playing"; // estado al que vuelve resume()
  private deadTimer = 0;
  private powerUpSpawned = false;
  private killsSinceSpawn = 0;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private last: AsteroidsSnapshot | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: AsteroidsCallbacks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.ship = new Ship(this.input);
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
    if (this.status !== "playing" && this.status !== "dead") return;
    this.pausedFrom = this.status;
    this.status = "paused";
    this.input.clear();
    this.emit();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = this.pausedFrom;
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
    this.ship = new Ship(this.input);
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = "playing";
    this.spawnAsteroids(4);
  }

  private spawnAsteroids(count: number): void {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private nextLevel(): void {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, color: string, count = 8): void {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color));
  }

  private killShip(): void {
    this.explode(this.ship.x, this.ship.y, COLORS.cyan, 14);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.setGameOver();
    } else {
      this.status = "dead";
      this.deadTimer = RESPAWN_DELAY;
    }
  }

  private setGameOver(): void {
    this.status = "gameover";
    this.input.clear();
    this.input.enabled = false; // con el modal abierto el motor ignora el teclado
    this.emit();
    this.callbacks.onGameOver(this.score);
  }

  // Emite onChange solo si cambió score, vidas, nivel o estado.
  private emit(): void {
    const s: AsteroidsSnapshot = {
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.status,
    };
    const l = this.last;
    if (
      l &&
      l.score === s.score &&
      l.lives === s.lives &&
      l.level === s.level &&
      l.status === s.status
    )
      return;
    this.last = s;
    this.callbacks.onChange(s);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, MAX_DT);
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    // P / Escape alternan pausa (se consumen ambas teclas).
    const p = this.input.pressed("KeyP");
    const esc = this.input.pressed("Escape");
    if (p || esc) {
      if (this.status === "paused") this.resume();
      else this.pause();
    }

    if (this.status === "paused") return;

    if (this.status === "gameover") {
      this.updateParticles(dt);
      return;
    }

    if (this.status === "dead") {
      this.input.pressed("Space"); // descarta disparos acumulados mientras no hay nave
      this.deadTimer -= dt;
      this.updateParticles(dt);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.status = "playing";
        this.ship.reset();
        this.emit();
      }
      return;
    }

    // Disparar
    if (this.input.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.particles.forEach((q) => q.update(dt));
    this.powerUps.forEach((u) => u.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((q) => !q.dead);
    this.powerUps = this.powerUps.filter((u) => !u.dead);

    for (const u of this.powerUps) {
      if (!u.dead && dist(this.ship, u) < this.ship.radius + u.radius) {
        u.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += a.points;
          this.explode(a.x, a.y, COLORS.yellow, a.size * 5);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.status === "playing" && this.asteroids.length === 0) this.nextLevel();

    this.emit();
  }

  private updateParticles(dt: number): void {
    this.particles.forEach((q) => q.update(dt));
    this.particles = this.particles.filter((q) => !q.dead);
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    this.drawParticles(ctx);
    this.asteroids.forEach((a) => a.draw(ctx));
    this.powerUps.forEach((u) => u.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.ship.draw(ctx);

    // Indicador de triple disparo (el resto del HUD es React)
    if (this.ship.tripleShot > 0) {
      ctx.save();
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = GLOW;
      ctx.fillStyle = COLORS.magenta;
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`3x  ${this.ship.tripleShot.toFixed(1)}s`, 14, 26);
      ctx.restore();
    }
  }

  // Glow por grupo de color (no por partícula).
  private drawParticles(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0) return;
    for (const color of [COLORS.yellow, COLORS.cyan]) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = GLOW / 2;
      for (const q of this.particles) if (q.color === color) q.draw(ctx);
      ctx.restore();
    }
  }
}
