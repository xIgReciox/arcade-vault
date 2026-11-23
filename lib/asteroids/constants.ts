// Constantes del juego ASTEROIDS. Valores copiados de references/started-games/02-asteroids/game.js.

export const W = 800;
export const H = 600;

// Indexados por tamaño de asteroide: 1 (pequeño), 2 (mediano), 3 (grande).
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // velocidad base
export const POINTS = [0, 100, 50, 20] as const;

// Power-up de triple disparo
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5; // segundos de disparo triple
export const POWERUP_TTL = 12; // segundos que el power-up flota antes de desaparecer
export const POWERUP_GUARANTEED_KILLS = 5; // baja garantizada tras N asteroides destruidos
export const TRIPLE_SPREAD = 0.18; // rad entre balas del disparo triple

// Colores y glow: ver lib/asteroids/skins.ts (paleta activa del motor).
