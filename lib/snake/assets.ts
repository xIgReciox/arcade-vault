// Carga de assets del juego SNAKE. Nunca rechaza: si la imagen falla, `fruits` queda en null.

import { ASSET_BASE } from "./constants";

export interface SnakeAssets {
  fruits: CanvasImageSource | null;
}

function loadFruits(): Promise<CanvasImageSource | null> {
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

export async function loadSnakeAssets(): Promise<SnakeAssets> {
  return { fruits: await loadFruits() };
}
