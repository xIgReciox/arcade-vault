// Carga de assets del juego SNAKE. Nunca rechaza: si la imagen falla, no hay hoja de frutas
// (la fruta se dibuja como círculo). Las variantes por skin se recolorean en un canvas
// offscreen; si el recoloreado falla, ese skin usa la hoja original.

import { SKIN_IDS, type SkinId } from "@/lib/skins";
import { ASSET_BASE } from "./constants";
import { SNAKE_SKINS, type FruitRecolor } from "./skins";

export interface FruitSheet {
  image: CanvasImageSource;
  /** Escala de la hoja respecto a fruits.png (los recortes de sprites.ts se multiplican por ella). */
  scale: number;
}

export interface SnakeAssets {
  /** Hoja de frutas por skin; null si fruits.png no cargó. */
  fruits: Record<SkinId, FruitSheet | null>;
}

function loadFruits(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn("[snake] no se pudo cargar fruits.png");
        resolve(null);
      };
      img.src = `${ASSET_BASE}/fruits.png`;
    } catch (err) {
      console.warn("[snake] no se pudo cargar fruits.png", err);
      resolve(null);
    }
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Recolorea la hoja según la rampa por luminancia del skin. Lanza si el canvas no está disponible. */
function recolor(img: HTMLImageElement, opts: FruitRecolor): FruitSheet {
  const w = Math.max(1, Math.round(img.naturalWidth * opts.scale));
  const h = Math.max(1, Math.round(img.naturalHeight * opts.scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const [dr, dg, db] = hexToRgb(opts.ramp[0]);
  const [lr, lg, lb] = hexToRgb(opts.ramp[1]);
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0) continue;
    let t = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    if (opts.levels > 1) t = Math.round(t * (opts.levels - 1)) / (opts.levels - 1);
    px[i] = dr + (lr - dr) * t;
    px[i + 1] = dg + (lg - dg) * t;
    px[i + 2] = db + (lb - db) * t;
    if (opts.hardAlpha) px[i + 3] = a >= 128 ? 255 : 0;
  }
  ctx.putImageData(data, 0, 0);
  return { image: canvas, scale: opts.scale };
}

export async function loadSnakeAssets(): Promise<SnakeAssets> {
  const img = await loadFruits();
  const original: FruitSheet | null = img ? { image: img, scale: 1 } : null;
  const fruits = {} as Record<SkinId, FruitSheet | null>;
  for (const skin of SKIN_IDS) {
    const opts = SNAKE_SKINS[skin].fruitRecolor;
    if (!img || !opts) {
      fruits[skin] = original;
      continue;
    }
    try {
      fruits[skin] = recolor(img, opts);
    } catch (err) {
      console.warn(`[snake] no se pudo recolorear fruits.png (${skin}); se usa el original`, err);
      fruits[skin] = original;
    }
  }
  return { fruits };
}
