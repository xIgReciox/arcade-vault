// Carga de assets del juego ARKANOID. Nunca rechaza: un asset que falla queda en null.
// Las variantes de skin del spritesheet se generan aquí en canvas offscreen; si algo
// falla, ese skin usa el spritesheet clásico.

import { SKIN_IDS, type SkinId } from "@/lib/skins";
import { ASSET_BASE } from "./constants";
import { ARKANOID_SKINS, type ArkanoidTints } from "./skins";
import { EXPLOSION_FRAMES, SPRITES, type BlockColor, type Frame } from "./sprites";

const AUDIO_TIMEOUT_MS = 3000;

export interface ArkanoidAssets {
  /** Spritesheet por skin (`clasico` = original). null si el sheet no cargó. */
  sheets: Record<SkinId, CanvasImageSource | null>;
  bounce: HTMLAudioElement | null;
  breakSfx: HTMLAudioElement | null;
}

// ── Recoloreado ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Rectángulo que cubre todos los frames de un bloque y de su explosión (misma fila).
function rowRect(color: BlockColor): Frame {
  const frames = [SPRITES.blocks[color], ...EXPLOSION_FRAMES[color]];
  const sx = Math.min(...frames.map((f) => f.sx));
  const end = Math.max(...frames.map((f) => f.sx + f.sw));
  const sy = SPRITES.blocks[color].sy;
  return { sx, sy, sw: end - sx, sh: SPRITES.blocks[color].sh };
}

// Mapa de degradado: el brillo del pixel (normalizado en la región) escala el tinte.
// "smooth": 0.45–1.15 (por encima de 1 aclara hacia blanco); "flat": 3 tonos planos.
function tintRegion(
  ctx: CanvasRenderingContext2D,
  rect: Frame,
  tint: string,
  shading: ArkanoidTints["shading"],
): void {
  const img = ctx.getImageData(rect.sx, rect.sy, rect.sw, rect.sh);
  const d = img.data;
  const [tr, tg, tb] = hexToRgb(tint);
  let min = 1;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const y = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const span = max - min || 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const t = ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 - min) / span;
    const k = shading === "flat" ? (t < 0.33 ? 0.5 : t < 0.7 ? 0.8 : 1) : 0.45 + 0.7 * t;
    const base = Math.min(k, 1);
    const white = k > 1 ? ((k - 1) / 0.15) * 0.5 : 0;
    d[i] = Math.round(tr * base + (255 - tr * base) * white);
    d[i + 1] = Math.round(tg * base + (255 - tg * base) * white);
    d[i + 2] = Math.round(tb * base + (255 - tb * base) * white);
  }
  ctx.putImageData(img, rect.sx, rect.sy);
}

function buildVariant(sheet: CanvasImageSource, tints: ArkanoidTints): CanvasImageSource {
  try {
    const src = sheet as HTMLCanvasElement | HTMLImageElement;
    const oc = document.createElement("canvas");
    oc.width = src.width;
    oc.height = src.height;
    const octx = oc.getContext("2d", { willReadFrequently: true });
    if (!octx) return sheet;
    octx.drawImage(sheet, 0, 0);
    tintRegion(octx, SPRITES.paddle, tints.paddle, tints.shading);
    tintRegion(octx, SPRITES.ball, tints.ball, tints.shading);
    // gray reutiliza las explosiones de red (como el original): esa fila se tiñe de red.
    for (const color of Object.keys(SPRITES.blocks) as BlockColor[]) {
      tintRegion(octx, rowRect(color), tints.blocks[color], tints.shading);
    }
    return oc;
  } catch (err) {
    console.warn("[arkanoid] no se pudo generar una variante de skin", err);
    return sheet;
  }
}

function buildSheets(sheet: CanvasImageSource | null): Record<SkinId, CanvasImageSource | null> {
  const out = {} as Record<SkinId, CanvasImageSource | null>;
  for (const id of SKIN_IDS) {
    const tints = ARKANOID_SKINS[id].tints;
    out[id] = sheet && tints ? buildVariant(sheet, tints) : sheet;
  }
  return out;
}

function loadSheet(): Promise<CanvasImageSource | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          // Copia a un canvas auxiliar, como hace el original.
          const oc = document.createElement("canvas");
          oc.width = img.width;
          oc.height = img.height;
          const octx = oc.getContext("2d");
          if (!octx) return resolve(img);
          octx.drawImage(img, 0, 0);
          resolve(oc);
        } catch (err) {
          console.warn("[arkanoid] no se pudo preparar el spritesheet", err);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn("[arkanoid] no se pudo cargar el spritesheet");
        resolve(null);
      };
      img.src = `${ASSET_BASE}/spritesheet-breakout.png`;
    } catch (err) {
      console.warn("[arkanoid] no se pudo cargar el spritesheet", err);
      resolve(null);
    }
  });
}

function loadAudio(name: string): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.preload = "auto";
      // Algunos navegadores no disparan canplaythrough: tras el tope se usa el audio tal cual.
      const timer = setTimeout(() => resolve(audio), AUDIO_TIMEOUT_MS);
      audio.addEventListener(
        "canplaythrough",
        () => {
          clearTimeout(timer);
          resolve(audio);
        },
        { once: true },
      );
      audio.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          console.warn(`[arkanoid] no se pudo cargar el sonido ${name}`);
          resolve(null);
        },
        { once: true },
      );
      audio.src = `${ASSET_BASE}/sounds/${name}`;
      audio.load();
    } catch (err) {
      console.warn(`[arkanoid] no se pudo cargar el sonido ${name}`, err);
      resolve(null);
    }
  });
}

export async function loadArkanoidAssets(): Promise<ArkanoidAssets> {
  const [sheet, bounce, breakSfx] = await Promise.all([
    loadSheet(),
    loadAudio("ball-bounce.mp3"),
    loadAudio("break-sound.mp3"),
  ]);
  return { sheets: buildSheets(sheet), bounce, breakSfx };
}
