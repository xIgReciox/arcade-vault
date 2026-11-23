# Memoria de skin-designer

Historial de cumplimiento: [skins.md](skins.md).

## Skins obligatorios por juego

- `clasico` (default): paleta actual del juego, sin cambios.
- `neon`: fondo casi negro, colores de marca saturados, `shadowBlur` alto.
- `retro`: paleta limitada tipo fósforo/8-bit, rellenos planos, sin glow.

## Paletas base (guía; cada juego las adapta a sus entidades)

| Token         | Clásico   | Neón      | Retro (ámbar CRT) |
| ------------- | --------- | --------- | ----------------- |
| fondo         | el actual | `#05050a` | `#0d0a05`         |
| principal     | el actual | `#00f5ff` | `#ffb000`         |
| peligro       | el actual | `#ff006e` | `#ff6a00`         |
| recolectable  | el actual | `#f5ff00` | `#ffe08a`         |
| bueno/jugador | el actual | `#00ff88` | `#7fd35f`         |
| texto canvas  | el actual | `#e6e9ff` | `#ffd98a`         |

## Umbrales de contraste (WCAG)

- Fondo: luminancia relativa ≤ 0.05.
- Entidades vs fondo ≥ 3:1; texto en canvas ≥ 4.5:1.

## Preferencias del equipo

- Web solo oscura: «modo oscuro» = contraste sobre fondo oscuro, sin modo claro.
- Selector de skin en `/games/[id]/jugar`, recordado por juego en `localStorage["av_skins"]`.
- Screenshots en `.playwright-screenshots/`.
