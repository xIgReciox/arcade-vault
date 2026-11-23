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
- Juegos aún sin skins van con `skins: ["clasico"]` en `PLAYABLE_GAMES` (sin selector) hasta implementarlos.

## Lecciones

- El navegador del MCP Playwright puede estar compartido con otros agentes en paralelo (te cambia la URL): usa un script propio con el `playwright` de la caché npx (`~/AppData/Local/npm-cache/_npx/*/node_modules/playwright`, `channel: "chrome"`).
- Juegos sin acción del jugador acaban solos: para capturas, autopiloto que lee píxeles del canvas y despacha `mousemove`.
- Contraste de sprites: medir el color medio real en el canvas, no solo el tinte; un clásico heredado bajo 3:1 se anota como ⚠️, no se corrige.
- Sprites: recolorear por rampa de luminancia [oscuro, claro] del skin; el extremo oscuro debe cumplir ≥ 3:1. Retro: hoja a escala reducida + `imageSmoothingEnabled = false` = look 8-bit.
- Validar contraste: `node --experimental-strip-types` importando `lib/skins.ts` y `lib/<id>/skins.ts` por `file:///` desde el scratchpad.
- Probar cambio en caliente: piloto automático en Playwright que lee píxeles del canvas (cabeza/fruta por color de paleta) para sumar puntos antes de cambiar.
- El hook Prettier reformatea entero cualquier CSS editado (globals.css): estilos del selector en Tailwind dentro de `components/games/skin-picker.tsx`, no en globals.css.
