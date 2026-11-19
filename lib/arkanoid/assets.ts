// Carga de assets del juego ARKANOID. Nunca rechaza: un asset que falla queda en null.

import { ASSET_BASE } from "./constants";

const AUDIO_TIMEOUT_MS = 3000;

export interface ArkanoidAssets {
  sheet: CanvasImageSource | null;
  bounce: HTMLAudioElement | null;
  breakSfx: HTMLAudioElement | null;
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
  return { sheet, bounce, breakSfx };
}
