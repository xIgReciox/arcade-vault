# SPEC 11 — Controles táctiles para jugar en móvil

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, SPEC 10
> **Date:** 2026-11-24
> **Objective:** Hacer jugables en un móvil con pantalla táctil los 4 juegos reales (ASTEROIDS, TETRIS, ARKANOID y SNAKE) con un layout vertical de canvas arriba y un mando virtual (cruceta + hasta 2 botones) abajo, sin cambiar ningún motor.

---

## Por qué existe este spec

Hoy los 4 motores solo leen teclado en `window`, así que en un móvil no hay forma de jugar. Además, la captura tomada en un Samsung real (`idea-canvas-controls.png`, servidor de desarrollo por red local) muestra que `/games/[id]/jugar` no cabe en vertical: la cabecera del HUD ocupa media pantalla (JUGADOR, PUNTUACIÓN, VIDAS, NIVEL, SKIN y tres botones en filas separadas) y el canvas queda pequeño, dentro de un marco CRT con 24 px de padding.

La idea cerrada es un único diseño de controles para todos los juegos: canvas exclusivamente arriba y, debajo, una cruceta direccional y un par de botones, como un mando de arcade. Los motores no se tocan: el mando emite `KeyboardEvent` sintéticos en `window` con los mismos `code` que ya entienden (`ArrowLeft`, `Space`…), así que el contrato de motor de SPEC 07 no cambia.

---

## Alcance

**Dentro:**

- Componente cliente `components/games/touch-controls.tsx`: cruceta de 4 direcciones a la izquierda y hasta 2 botones (A y B) a la derecha, con Pointer Events y multitoque (cruceta + botón a la vez).
- Teclas sintéticas en `window` (`keydown`/`keyup` con `code`), con auto-repeat emulado para las direcciones donde el motor depende del repeat del navegador (TETRIS).
- Configuración táctil por juego en `PLAYABLE_GAMES` (`touch`): qué direcciones y qué botones se muestran y qué tecla envía cada uno.
- Mando visible solo en dispositivos táctiles (`(hover: none) and (pointer: coarse)`); en escritorio no cambia nada.
- Layout móvil de `/games/[id]/jugar` (≤ 720 px de ancho): HUD compacto en una sola fila, sin marco CRT, canvas 4:3 a todo el ancho pegado arriba, mando debajo, todo visible sin scroll.
- Evitar gestos del navegador sobre el mando y el canvas: scroll, zoom por doble toque, selección de texto y menú contextual por pulsación larga.
- `viewport` con `viewportFit: "cover"` y relleno por `env(safe-area-inset-*)` para el mando.
- Campo de nombre del modal de fin con `font-size` ≥ 16 px en móvil (evita el zoom automático de iOS).

**Fuera de alcance (para specs futuros):**

- Gestos sobre el canvas (swipe en SNAKE, arrastre en ARKANOID, toques por zonas). ARKANOID conserva el ratón solo para escritorio.
- Modo apaisado dedicado (mando a los lados), aviso de «gira el dispositivo» y Fullscreen API / bloqueo de orientación.
- Vibración háptica y sonido.
- Juegos mock (simulados) y juegos futuros: el contrato táctil para `/add-game` y `game-jam` se define en otro spec.
- Cambios en `lib/<id>/` de cualquier motor y en el contrato `GameEngine`.
- Resto de pantallas (`/`, `/games`, `/salon`, `/about`, `/auth`) más allá de lo que ya funcione hoy.
- PWA, instalación en pantalla de inicio y modo sin conexión.
- Tests automatizados.

---

## Modelo de datos

Configuración táctil en el registro jugable (`lib/playable-games.ts`), con campo opcional para no romper juegos sin definir:

```ts
export type TouchDirection = "left" | "right" | "up" | "down";

export interface TouchButton {
  label: "A" | "B"; // texto del botón
  code: string; // KeyboardEvent.code que se emite, p. ej. "Space"
  aria: string; // etiqueta accesible, p. ej. "Disparar"
}

export interface TouchLayout {
  directions: readonly TouchDirection[]; // flechas visibles de la cruceta
  buttons: readonly TouchButton[]; // 0, 1 o 2; los no usados no se muestran
  repeat: readonly TouchDirection[]; // direcciones con auto-repeat emulado
}

// En PlayableGame:
touch?: TouchLayout;
```

Mapa por juego (derivado de los `input.ts` actuales):

| Juego     | Cruceta                        | Botón A              | Botón B          | Repeat                  |
| --------- | ------------------------------ | -------------------- | ---------------- | ----------------------- |
| ASTEROIDS | `left`, `right`, `up` (empuje) | `Space` — «Disparar» | —                | ninguno (tecla fija)    |
| TETRIS    | `left`, `right`, `up`, `down`  | `Space` — «Caída»    | `KeyX` — «Rotar» | `left`, `right`, `down` |
| ARKANOID  | `left`, `right`                | —                    | —                | ninguno (tecla fija)    |
| SNAKE     | `left`, `right`, `up`, `down`  | —                    | —                | ninguno (giro discreto) |

La cruceta mantiene su forma de cruz; las direcciones que el juego no usa no se dibujan. La pausa sigue en el HUD (`PAUSA`), no en el mando.

Módulo de teclas sintéticas, `lib/touch-input.ts` (solo cliente), con esta forma pública:

```ts
export interface KeyHold {
  press(code: string, repeat: boolean): void; // keydown inmediato; con repeat, keydown { repeat: true } tras 170 ms y cada 50 ms
  release(code: string): void; // keyup y cancela el temporizador
  releaseAll(): void; // keyup de todo lo pulsado
}
export function createKeyHold(target?: Window): KeyHold;
```

Convenciones:

- Los eventos se crean con `new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true, repeat })` y se despachan en `window`.
- Un `code` pulsado dos veces seguidas sin `release` no emite un segundo `keydown` inicial.
- Constantes de auto-repeat (`REPEAT_DELAY_MS = 170`, `REPEAT_INTERVAL_MS = 50`) viven en este módulo.

Sin cambios en `Game`, `GameSnapshot`, `GameEngine`, `scores`, `av_scores`, `av_player_name` ni `av_skins`. Este spec no introduce persistencia nueva ni migraciones de Supabase.

---

## Plan de implementación

1. **Teclas sintéticas.** Crear `lib/touch-input.ts` con `createKeyHold` (sin DOM fuera de `window`, sin globals). Antes, `Grep` de `repeat` en los 4 `input.ts` para confirmar que el repeat solo importa en TETRIS (`left`/`right`/`down`) y que `hardDrop`/`pause` lo ignoran. Verificación: `npx tsc --noEmit`.
2. **Configuración por juego.** Añadir los tipos `TouchDirection`, `TouchButton`, `TouchLayout` y el campo `touch` a `lib/playable-games.ts`, y rellenarlo para `asteroids`, `tetris`, `arkanoid` y `snake` según el mapa del Modelo de datos. Antes, comprobar en cada `input.ts` los `code` reales. Verificación: `tsc`; `/games/*/jugar` en escritorio sin cambios.
3. **Componente del mando.** Crear `components/games/touch-controls.tsx` (`"use client"`): cruceta y botones con `onPointerDown`/`onPointerUp`/`onPointerCancel`/`onLostPointerCapture`, `setPointerCapture`, `aria-label` por botón y `releaseAll()` al desmontar, con `window` en `blur` y cuando `paused` o `over` pasan a `true`. Un puntero por control (multitoque). Verificación: `tsc` y `eslint` sobre el archivo.
4. **Integración en el reproductor.** En `components/game-player.tsx`, renderizar `<TouchControls />` debajo del bloque `.crt` solo si `playable?.touch` existe; recibir `paused` y `over` para soltar teclas. En escritorio el bloque queda `display: none` por CSS. Verificación: en escritorio no aparece; con un contexto táctil (paso 8) aparece y mueve la nave de ASTEROIDS.
5. **Estilos del mando.** En `app/globals.css`: `.touch-pad` (cruceta en grilla 3×3, objetivos ≥ 56 px), `.touch-btn` (botones circulares ≥ 64 px), estados `:active`, `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`, y `@media (hover: none) and (pointer: coarse)` para mostrarlo. Estética neón coherente con el sitio (cyan/magenta), aplicando `/frontend-design`. Verificación: captura en `.playwright-screenshots/`.
6. **Layout móvil.** En `app/globals.css` (≤ 720 px): `.crt` sin padding, sin `box-shadow` de marco ni `border-radius`; `.crt-bottom` oculto; `.av-player` con padding lateral 0 y margen superior mínimo; `.crt-screen` a ancho completo con `aspect-ratio: 4 / 3`; `touch-action: none` sobre el canvas. Verificación: a 390×844 y 360×740 el canvas ocupa todo el ancho y está inmediatamente bajo el HUD.
7. **HUD compacto y viewport.** En `components/game-player.tsx` y `app/globals.css` (≤ 720 px): una sola fila con PUNTUACIÓN, VIDAS y NIVEL (los que no son `null`), JUGADOR oculto, `PAUSA` / `FIN` / `SALIR` en una fila mínima y el selector de skin movido bajo el mando. En `app/layout.tsx`, exportar `viewport` con `viewportFit: "cover"` y añadir `padding-bottom: env(safe-area-inset-bottom)` al mando. Antes, leer la guía de `viewport` en `node_modules/next/dist/docs/`. Verificación: HUD, canvas y mando visibles sin scroll vertical a 390×844 y 360×740.
8. **Verificación por juego.** Con Playwright, abrir un contexto nuevo con `hasTouch: true` e `isMobile: true` (vía `browser_run_code_unsafe`, porque `browser_resize` no emula `pointer: coarse`) y comprobar los 4 juegos: ASTEROIDS gira, empuja y dispara a la vez; TETRIS mueve con repeat al mantener, rota y hace caída; ARKANOID mueve la pala; SNAKE gira sin invertir 180°. Verificación: capturas en `.playwright-screenshots/` (`11-step8-<id>.png`).
9. **Modal y guardado en móvil.** Comprobar que el modal «FIN DEL JUEGO» se ve entero, que el campo de nombre usa ≥ 16 px y que GUARDAR PUNTUACIÓN crea la fila; limpiar las filas de prueba con `delete from public.scores where user_id is null and player_name = '<nombre de prueba>'`. Verificación: fila visible en `/games/<id>` y `/salon`.
10. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; actualizar la sección «Current state» y «Game engine contract» de `CLAUDE.md` con el mando táctil; prueba en un móvil real por red local (requiere `allowedDevOrigins` con la IP del equipo en `next.config.ts`, cambio local que no se commitea con este spec).

---

## Criterios de aceptación

- [ ] Existen `lib/touch-input.ts` y `components/games/touch-controls.tsx`, y ningún archivo de `lib/asteroids/`, `lib/tetris/`, `lib/arkanoid/` ni `lib/snake/` ha cambiado.
- [ ] `PLAYABLE_GAMES` tiene `touch` en `asteroids`, `tetris`, `arkanoid` y `snake` con el mapa del Modelo de datos.
- [ ] En escritorio (`pointer: fine`) el mando no se muestra y `/games/*/jugar` se ve y se comporta igual que antes.
- [ ] Con un contexto táctil (`hasTouch`, `isMobile`) a 390×844, `/games/asteroids/jugar` muestra, de arriba abajo: HUD compacto, canvas 4:3 a todo el ancho y mando, sin scroll vertical.
- [ ] Lo mismo a 360×740 en los 4 juegos.
- [ ] El layout móvil no muestra marco CRT, barra «SEÑAL OK» ni el campo JUGADOR; PUNTUACIÓN, VIDAS y NIVEL aparecen en una sola fila (los `null` se omiten).
- [ ] El mando de cada juego muestra solo las direcciones y botones de su `touch`: ASTEROIDS cruceta de 3 + A; TETRIS cruceta de 4 + A y B; ARKANOID cruceta de 2 y sin botones; SNAKE cruceta de 4 y sin botones.
- [ ] Cada botón del mando mide al menos 56×56 px y tiene `aria-label`.
- [ ] ASTEROIDS: mantener `←` gira, mantener `↑` empuja y pulsar A dispara; se puede girar y disparar a la vez (multitoque).
- [ ] TETRIS: tocar `←`/`→` mueve una columna; mantenerlos repite tras ~170 ms cada ~50 ms; `↓` repite; A hace caída dura una sola vez por toque; B rota una pieza por toque.
- [ ] ARKANOID: mantener `←` o `→` mueve la pala mientras dure el toque y se detiene al soltar.
- [ ] SNAKE: los toques giran la serpiente; un toque opuesto a la dirección actual se ignora (lógica del motor, no del mando).
- [ ] Al soltar un control, el cancelar el toque (`pointercancel`), pausar, terminar la partida, perder el foco o salir de la página, se emite `keyup` de todo lo pulsado y no queda ninguna tecla pegada.
- [ ] Mantener pulsado un control no hace scroll, zoom, selección de texto ni abre el menú contextual del navegador.
- [ ] PAUSA, FIN, SALIR y JUGAR DE NUEVO siguen funcionando con el dedo; con la partida terminada el mando no mueve nada (el `Input` del motor está deshabilitado).
- [ ] El campo de nombre del modal tiene `font-size` ≥ 16 px en móvil; GUARDAR PUNTUACIÓN crea una fila en `scores` con `user_id = NULL` y la puntuación mostrada.
- [ ] `app/layout.tsx` exporta `viewport` con `viewportFit: "cover"` y el mando respeta `env(safe-area-inset-bottom)`.
- [ ] Sin errores en consola en `/games/<id>/jugar` de los 4 juegos con contexto táctil; al salir no quedan `requestAnimationFrame`, temporizadores de repeat ni listeners activos.
- [ ] Los juegos mock (p. ej. `/games/rocas/jugar`) y el resto de pantallas se comportan como antes.
- [ ] Las filas de prueba se eliminan de `scores`; `references/` no se modifica.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** mando virtual único (cruceta + hasta 2 botones) idéntico en los 4 juegos. Lo pidió el usuario: la mayoría de juegos de arcade necesitan dos botones como máximo y una UI igual se aprende una vez.
- **No:** gestos por juego (swipe, arrastre, zonas) y modelo híbrido. Cada juego tendría su propio código y serían menos descubribles; el spec de SNAKE ya los dejó fuera.
- **Sí:** teclas sintéticas en `window` con los mismos `code` que el teclado. Los 4 `Input` ya escuchan `window` y respetan `enabled`; cero cambios en motores y en el contrato `GameEngine`.
- **No:** añadir `setControl(action, down)` al contrato `GameEngine`. Es más limpio pero obliga a tocar los 4 motores y cada juego futuro; se reevaluará si los eventos sintéticos dan problemas.
- **Sí:** layout vertical con canvas arriba y controles abajo (HUD → canvas → mando). Lo pidió el usuario; el canvas 4:3 a ancho completo deja la mitad inferior para los pulgares.
- **No:** controles superpuestos sobre el canvas. Tapan el juego en 4:3 vertical.
- **Sí:** mostrar solo las direcciones y botones que cada juego usa. Un botón sin efecto confunde; la cruz mantiene su forma, por lo que sigue siendo uniforme.
- **No:** botones A y B siempre visibles. UI idéntica pero con botones muertos.
- **Sí:** HUD compacto en una fila y JUGADOR oculto en móvil. Lo pidió el usuario con los trazos sobre la captura; la información que importa durante la partida es puntuación, vidas y nivel.
- **Sí:** auto-repeat emulado (170 ms / 50 ms) solo en TETRIS. Su `Input` depende del repeat del navegador (`left`/`right`/`down` sin filtro); ASTEROIDS y ARKANOID leen la tecla mantenida, y SNAKE usa giros discretos.
- **Sí:** TETRIS con A = caída dura (`Space`) y B = rotar (`KeyX`), además de `↑` en la cruceta (rota). `KeyX` ya existe en su mapa de teclas y deja la rotación bajo el pulgar derecho.
- **Sí:** ASTEROIDS sin botón B ni flecha abajo, ARKANOID sin botones (la bola no necesita lanzamiento: no hay acción en su `Input`) y SNAKE solo con cruceta.
- **Sí:** detección por CSS `(hover: none) and (pointer: coarse)`. Evita desajustes de hidratación al no leer `matchMedia` en el primer render y no muestra el mando en portátiles con pantalla táctil y ratón.
- **No:** `matchMedia` en React ni parámetro `?touch=1` para forzarlo. Más superficie y estado; la verificación usa un contexto de Playwright con `hasTouch`/`isMobile`.
- **Sí:** solo ARKANOID con D-pad, sin arrastre táctil. Mantiene la uniformidad y deja el motor intacto; el arrastre es un spec futuro.
- **Sí:** Pointer Events con `setPointerCapture`. Unifican toque y lápiz, permiten multitoque y garantizan el `pointerup` aunque el dedo salga del botón.
- **No:** Fullscreen API, orientación bloqueada y modo apaisado. iOS Safari no soporta Fullscreen en iPhone y el layout vertical es el caso pedido.
- **Sí:** umbral de layout móvil ≤ 720 px, el mismo que ya usa `app/globals.css` en otros bloques.
- **Sí:** sin cambio de esquema ni persistencia. El mando no guarda nada y la puntuación sigue el flujo existente.

---

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tecla pegada si el toque se cancela (llamada, gesto del sistema, cambio de app) | `pointercancel`, `lostpointercapture`, `blur` de la ventana y desmontaje llaman a `releaseAll()`; también al pausar o terminar la partida.        |
| El navegador hace scroll o zoom al mantener o doble tocar el mando              | `touch-action: none` en el mando y el canvas; `preventDefault` en `pointerdown`; `user-select: none` y `-webkit-touch-callout: none`.             |
| Menú contextual por pulsación larga sobre botones                               | `onContextMenu` con `preventDefault` en el mando.                                                                                                 |
| Dos dedos (cruceta + botón) se pisan y se pierde uno                            | Estado por `pointerId`; cada control gestiona su propio puntero con `setPointerCapture`.                                                          |
| TETRIS pierde sensación de repeat con timers imprecisos                         | El repeat vive en `createKeyHold` con `setTimeout`/`setInterval` y se cancela en `release`; validado manualmente en el paso 8 y en un móvil real. |
| Un motor futuro lee el evento por `e.key` en vez de `e.code`                    | El mando envía `code` y `key` coherentes; el contrato del checklist de `/add-game` queda para un spec propio.                                     |
| `isMobile` de Playwright no refleja `pointer: coarse` en el `browser_resize`    | Verificación con contexto nuevo (`hasTouch`, `isMobile`) vía `browser_run_code_unsafe` y prueba final en un móvil real.                           |
| El mando no cabe en pantallas muy bajas (≤ 640 px de alto)                      | Criterio de aceptación a 360×740; en pantallas menores el scroll vertical es aceptable fuera de la partida y el mando mantiene tamaños mínimos.   |
| Barra de direcciones y safe area de iOS tapan el mando                          | `viewportFit: "cover"` y `env(safe-area-inset-bottom)`; en el layout móvil el bloque del mando usa `padding-bottom` explícito.                    |
| El servidor de desarrollo rechaza la IP del móvil (`allowedDevOrigins`)         | Prueba real por red local con la IP del equipo en `next.config.ts` (cambio local, no se commitea con este spec).                                  |
| APIs distintas en Next 16 / React 19.3 (`viewport`, Pointer Events en React)    | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar `app/layout.tsx`.                                                   |

---

## Qué **no** entra en este spec

- Gestos sobre el canvas (swipe, arrastre, zonas) y arrastre táctil en ARKANOID.
- Modo apaisado dedicado, aviso de rotación y Fullscreen API.
- Vibración háptica y sonido.
- Cambios en los motores `lib/<id>/` y en el contrato `GameEngine`.
- Contrato táctil obligatorio para juegos futuros (`/add-game`, `game-jam`) y juegos mock.
- Cambios en `/`, `/games`, `/salon`, `/about` y `/auth`.
- PWA e instalación.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
