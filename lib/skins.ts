// Skins compartidos por los juegos jugables (cliente). Cada juego define sus paletas en
// lib/<id>/skins.ts como Record<SkinId, <Id>Palette>; aquí viven los ids, los metadatos
// del selector, la clave de localStorage y la medida de contraste WCAG.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS = ["clasico", "neon", "retro"] as const satisfies readonly SkinId[];

export const DEFAULT_SKIN: SkinId = "clasico";

/** localStorage: `{ [gameId]: SkinId }`. */
export const SKIN_STORAGE_KEY = "av_skins";

export interface SkinMeta {
  label: string;
  description: string;
  /** Muestra de color del botón del selector (guía común, no la paleta exacta de cada juego). */
  swatch: readonly [string, string, string];
}

export const SKINS: Record<SkinId, SkinMeta> = {
  clasico: {
    label: "CLÁSICO",
    description: "Los colores originales del juego.",
    swatch: ["#00f5ff", "#f5ff00", "#ff006e"],
  },
  neon: {
    label: "NEÓN",
    description: "Colores saturados con resplandor intenso.",
    swatch: ["#00ff88", "#ff006e", "#f5ff00"],
  },
  retro: {
    label: "RETRO",
    description: "Fósforo ámbar de monitor CRT, sin resplandor.",
    swatch: ["#ffb000", "#ff6a00", "#ffe08a"],
  },
};

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
}

// ── Persistencia (solo cliente) ───────────────────────────────────────────────

function readSkinMap(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Skin guardado para un juego; un valor ausente, inválido o no soportado cae a `clasico`. */
export function readStoredSkin(gameId: string, allowed: readonly SkinId[]): SkinId {
  const value = readSkinMap()[gameId];
  return isSkinId(value) && allowed.includes(value) ? value : DEFAULT_SKIN;
}

export function writeStoredSkin(gameId: string, skin: SkinId): void {
  try {
    const map = readSkinMap();
    map[gameId] = skin;
    localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage bloqueado: el skin se aplica pero no se recuerda.
  }
}

// ── Contraste WCAG 2.x ────────────────────────────────────────────────────────

type Rgba = [number, number, number, number];

function parseColor(color: string): Rgba {
  const c = color.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c);
  if (rgb) {
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      rgb[4] === undefined ? 1 : Number(rgb[4]),
    ];
  }
  throw new Error(`Color no soportado: ${color}`);
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa WCAG de un color opaco (#rgb, #rrggbb, rgb(), rgba() con alfa 1). */
export function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Ratio de contraste WCAG 2.x entre `fg` y `bg` (1–21). Un `fg` semitransparente se
 * compone antes sobre `bg`, que debe ser opaco.
 */
export function contrastRatio(fg: string, bg: string): number {
  const [br, bgG, bb] = parseColor(bg);
  const [fr, fgG, fb, a] = parseColor(fg);
  const mix = (f: number, b: number) => f * a + b * (1 - a);
  const lf = relativeLuminance(`rgb(${mix(fr, br)}, ${mix(fgG, bgG)}, ${mix(fb, bb)})`);
  const lb = relativeLuminance(bg);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}
