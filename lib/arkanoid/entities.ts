// Entidades del juego ARKANOID. Portadas de references/started-games/04-arkanoid/game.js.
// Dibujan con drawImage desde el spritesheet del skin activo y no dibujan nada si `sheet` es null.

import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  W,
} from "./constants";
import type { LevelBlock } from "./levels";
import type { ArkanoidPalette } from "./skins";
import { EXPLOSION_FRAMES, SPRITES, type BlockColor, type Frame } from "./sprites";
import { clamp, type Rect } from "./utils";

/** Aspecto activo: spritesheet del skin y su paleta (glow y tintes). */
export interface ArkanoidLook {
  sheet: CanvasImageSource | null;
  palette: ArkanoidPalette;
}

// Dibuja un frame; con `blur` > 0 aplica resplandor del color dado y lo resetea a 0.
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  look: ArkanoidLook,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
  blur = 0,
  glowColor?: string,
): void {
  if (!look.sheet) return;
  const glow = blur > 0 && glowColor !== undefined;
  if (glow) {
    ctx.shadowBlur = blur;
    ctx.shadowColor = glowColor;
  }
  ctx.drawImage(look.sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  if (glow) ctx.shadowBlur = 0;
}

export class Paddle implements Rect {
  x = (W - PADDLE_W) / 2;
  y = PADDLE_Y;
  w = PADDLE_W;
  h = PADDLE_H;
  // -1 izquierda, 0 quieta, 1 derecha. La fija el motor desde el teclado.
  dir = 0;

  update(dt: number): void {
    if (this.dir === 0) return;
    this.x = clamp(this.x + this.dir * PADDLE_SPEED * dt, 0, W - this.w);
  }

  // Centra la paleta en una posición X (ratón).
  centerAt(x: number): void {
    this.x = clamp(x - this.w / 2, 0, W - this.w);
  }

  reset(): void {
    this.x = (W - this.w) / 2;
    this.dir = 0;
  }

  draw(ctx: CanvasRenderingContext2D, look: ArkanoidLook): void {
    const { glow, tints } = look.palette;
    drawFrame(ctx, look, SPRITES.paddle, this.x, this.y, this.w, this.h, glow, tints?.paddle);
  }
}

export class Ball implements Rect {
  x = 0;
  y = 0;
  w = BALL_SIZE;
  h = BALL_SIZE;
  vx = BASE_BALL_VX;
  vy = BASE_BALL_VY;

  // Recoloca la pelota sobre la paleta con la velocidad del nivel.
  place(paddle: Paddle, speed: number): void {
    this.x = paddle.x + (paddle.w - this.w) / 2;
    this.y = paddle.y - this.h;
    this.vx = BASE_BALL_VX * speed;
    this.vy = BASE_BALL_VY * speed;
  }

  // Avanza y rebota en paredes y techo. Devuelve true si rebotó (para el sonido).
  update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    let bounced = false;
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      bounced = true;
    }
    if (this.x + this.w >= W) {
      this.x = W - this.w;
      this.vx = -Math.abs(this.vx);
      bounced = true;
    }
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
      bounced = true;
    }
    return bounced;
  }

  // Rebote en la paleta: solo con vy > 0 y margen de 8 px bajo la paleta. Devuelve true si rebotó.
  bounceOnPaddle(paddle: Paddle): boolean {
    if (
      this.vy > 0 &&
      this.x + this.w > paddle.x &&
      this.x < paddle.x + paddle.w &&
      this.y + this.h >= paddle.y &&
      this.y + this.h <= paddle.y + paddle.h + 8
    ) {
      this.y = paddle.y - this.h;
      this.vy = -Math.abs(this.vy);
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, look: ArkanoidLook): void {
    const { glow, tints } = look.palette;
    drawFrame(ctx, look, SPRITES.ball, this.x, this.y, this.w, this.h, glow, tints?.ball);
  }
}

export class Block implements Rect {
  x: number;
  y: number;
  w = BLOCK_W;
  h = BLOCK_H;
  color: BlockColor;
  alive = true;

  constructor(b: LevelBlock) {
    this.x = BLOCKS_ORIGIN_X + b.col * BLOCK_W;
    this.y = BLOCKS_ORIGIN_Y + b.row * BLOCK_H;
    this.color = b.color;
  }

  update(): void {
    // Los bloques son estáticos.
  }

  draw(ctx: CanvasRenderingContext2D, look: ArkanoidLook): void {
    if (!this.alive) return;
    const { glow, tints } = look.palette;
    drawFrame(
      ctx,
      look,
      SPRITES.blocks[this.color],
      this.x,
      this.y,
      this.w,
      this.h,
      glow / 2,
      tints?.blocks[this.color],
    );
  }
}

export class Explosion implements Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed = 0; // ms

  constructor(block: Block) {
    this.x = block.x;
    this.y = block.y;
    this.w = block.w;
    this.h = block.h;
    this.color = block.color;
  }

  get done(): boolean {
    return this.elapsed >= EXPLOSION_DURATION;
  }

  update(dt: number): void {
    this.elapsed += dt * 1000;
  }

  draw(ctx: CanvasRenderingContext2D, look: ArkanoidLook): void {
    const frames = EXPLOSION_FRAMES[this.color];
    const i = Math.min(
      Math.floor((this.elapsed / EXPLOSION_DURATION) * frames.length),
      frames.length - 1,
    );
    drawFrame(ctx, look, frames[i], this.x, this.y, this.w, this.h);
  }
}
