// Motor del juego ASTEROIDS: estado, colisiones, niveles, dibujo y loop.
// Port encapsulado de references/started-games/02-asteroids/game.js (sin globals).

import { H, POWERUP_DROP_CHANCE, POWERUP_DURATION, POWERUP_GUARANTEED_KILLS, W } from "./constants";
import type {
  GameCallbacks,
  GameEngine,
  GameEngineOptions,
  GameSnapshot,
  GameStatus,
} from "@/lib/game-engine";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/lib/skins";
import { Asteroid, Bullet, Particle, type ParticleKind, PowerUp, Ship } from "./entities";
import { Input } from "./input";
import { ASTEROIDS_SKINS, type AsteroidsPalette } from "./skins";
import { dist, rand } from "./utils";

export type AsteroidsStatus = GameStatus;

// ASTEROIDS siempre tiene vidas y nivel: se estrechan `lives` y `level` a number.
export type AsteroidsSnapshot = GameSnapshot & { lives: number; level: number };

export type AsteroidsCallbacks = GameCallbacks;

const MAX_DT = 0.05; // 50 ms
const RESPAWN_DELAY = 2;
const SAFE_DIST = 130;

export class AsteroidsEngine implements GameEngine {
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
  private palette: AsteroidsPalette = ASTEROIDS_SKINS[DEFAULT_SKIN];

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: AsteroidsCallbacks,
    options: GameEngineOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = ctx;
    this.callbacks = callbacks;
    if (options.skin) this.setSkin(options.skin);
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

  // Cambia la paleta en caliente: solo afecta al dibujo (ni estado, ni puntuación, ni RNG).
  setSkin(skin: SkinId): void {
    this.palette = ASTEROIDS_SKINS[isSkinId(skin) ? skin : DEFAULT_SKIN];
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

  private explode(x: number, y: number, kind: ParticleKind, count = 8): void {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, kind));
  }

  private killShip(): void {
    this.explode(this.ship.x, this.ship.y, "ship", 14);
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
          this.explode(a.x, a.y, "asteroid", a.size * 5);
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
    const pal = this.palette;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    this.drawParticles(ctx, pal);
    this.asteroids.forEach((a) => a.draw(ctx, pal));
    this.powerUps.forEach((u) => u.draw(ctx, pal));
    this.bullets.forEach((b) => b.draw(ctx, pal));
    this.ship.draw(ctx, pal);

    // Indicador de triple disparo (el resto del HUD es React)
    if (this.ship.tripleShot > 0) {
      ctx.save();
      ctx.shadowColor = pal.hudText;
      ctx.shadowBlur = pal.glow;
      ctx.fillStyle = pal.hudText;
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`3x  ${this.ship.tripleShot.toFixed(1)}s`, 14, 26);
      ctx.restore();
    }
  }

  // Glow por grupo de color (no por partícula).
  private drawParticles(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette): void {
    if (this.particles.length === 0) return;
    const groups: [ParticleKind, string][] = [
      ["asteroid", pal.asteroid],
      ["ship", pal.ship],
    ];
    for (const [kind, color] of groups) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = pal.glow / 2;
      for (const q of this.particles) if (q.kind === kind) q.draw(ctx, color);
      ctx.restore();
    }
  }
}
