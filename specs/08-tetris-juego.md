# SPEC 08 — Juego TETRIS jugable con leaderboard real

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-18
> **Objective:** Portar `references/started-games/03-tetris` a un motor TypeScript encapsulado, hacerlo jugable en `/games/tetris/jugar` y registrarlo en el leaderboard real, sustituyendo al mock CAÍDA.

---

## Por qué existe este spec

El segundo juego real de la plataforma sale de `references/started-games/03-tetris`: un Tetris en JavaScript vanilla con globals, listeners en `document`, dos canvas (tablero 300×600 y vista NEXT 120×120), HUD en el DOM y un overlay propio de PAUSA/GAME OVER. SPEC 07 dejó el reproductor y el registro listos, así que este spec solo aporta el motor, su entrada en `PLAYABLE_GAMES`, la fila en `games` y el cambio de catálogo.

Sustituye al mock CAÍDA (`id: "caida"`, PUZZLE, magenta), que hoy tiene un ranking sembrado y no es jugable. El original incluye una 8.ª pieza «N» (tuerca 3×3) que se conserva.

---

## Alcance

**Dentro:**

- Catálogo (`lib/games.ts`): se **elimina** el mock `caida` y entra `tetris` en su misma posición (3.ª de `GAMES`): título `TETRIS`, categoría `PUZZLE`, color `magenta`, portada `.cover-tetris`.
- `app/globals.css`: la clase `.cover-tetro` (y su `::after`) se renombra a `.cover-tetris` sin cambiar su aspecto. Hoy solo la usa `lib/games.ts`.
- Motor `TetrisEngine` en `lib/tetris/` que implementa `GameEngine`, portado de `game.js` **sin cambios de gameplay** (incluida la pieza N).
- Entrada `tetris` en `PLAYABLE_GAMES` (`lib/playable-games.ts`): 800×600.
- Migración `supabase/migrations/<timestamp>_register_tetris.sql` que inserta `tetris` en `games`.
- Ranking real en `/games/tetris` (top 10) y `/salon` (top 12) sin cambios de código: ya es genérico desde SPEC 06.
- Composición del canvas 800×600: tablero 300×600 (bloque 30 px, sin escalar) en la izquierda y panel dibujado a su derecha con NEXT (4×4 bloques) y LINES.
- HUD React: puntuación, vidas `—` (`lives: null`) y nivel real.
- Controles: `←` `→` mover, `↑` o `X` rotar, `↓` soft drop, `Espacio` hard drop, `P`/`Escape` pausa; auto-pausa al perder foco.
- Paleta neón de la plataforma con glow moderado (ver Modelo de datos).
- Sin assets ni sonido: todo se dibuja en el canvas, no se crea `public/games/tetris/`.

**Fuera de alcance (para specs futuros):**

- Sonido y música.
- Tema claro/oscuro del original (`#theme-toggle`, `localStorage["tetris-theme"]`): se elimina.
- Lista de controles dibujada en el canvas (el original la muestra en su panel).
- Hold, 7-bag, SRS, DAS/ARR propios u otras mecánicas modernas.
- Auth, "TU MEJOR MARCA", mejor marca por jugador.
- Antitrampas, rate limiting, moderación.
- Controles táctiles.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Registro en `GAMES` (sustituye al de `caida`; `best` y `plays` conservan los valores mock actuales):

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja las piezas antes de que el techo te aplaste.",
  long: "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.",
  cat: "PUZZLE",
  cover: "cover-tetris",
  color: "magenta",
  best: 184220,
  plays: "31.8K",
}
```

Entrada del registro jugable:

```ts
tetris: {
  load: async () => {
    const { TetrisEngine } = await import("@/lib/tetris/engine");
    return (canvas, cb) => new TetrisEngine(canvas, cb);
  },
  width: 800,
  height: 600,
  label: "Juego TETRIS",
}
```

Migración:

```sql
insert into public.games (id, title) values ('tetris', 'TETRIS');
```

Estructura de archivos (juego de cuadrícula: `rules.ts` en lugar de `entities.ts`):

- `lib/tetris/constants.ts` — `COLS` 10, `ROWS` 20, `BLOCK` 30, `W` 800, `H` 600, origen del tablero y del panel dentro del canvas, `PIECES` (8 matrices), `LINE_SCORES` `[0,100,300,500,800]`, colores neón y `GLOW`.
- `lib/tetris/utils.ts` — funciones puras: `createBoard`, `rotateCW`, `collide`.
- `lib/tetris/input.ts` — clase `Input`: `attach()`/`detach()`, cola de acciones discretas (mover, rotar, soft drop, hard drop, pausa).
- `lib/tetris/rules.ts` — estado y reglas: `randomPiece`, `tryRotate` (wall kicks `[0,-1,1,-2,2]`), `merge`, `clearLines`, `ghostY`, `lockPiece`, `spawn`, intervalo de caída.
- `lib/tetris/engine.ts` — `TetrisEngine implements GameEngine`: loop, pausa, game over, dibujo del tablero, ghost, panel y emisión de `onChange`.

Paleta neón por pieza (colores de `COLORS` de ASTEROIDS y variantes de tono):

| Pieza | Color                          |
| ----- | ------------------------------ |
| I     | cian                           |
| O     | amarillo                       |
| T     | magenta                        |
| S     | verde                          |
| Z     | rosa (variante de magenta)     |
| J     | azul (variante de cian)        |
| L     | naranja (variante de amarillo) |
| N     | blanco                         |

Reglas de puntuación y velocidad (copiadas del original):

- Limpiar 1/2/3/4 líneas a la vez: `LINE_SCORES[n] × nivel` = 100/300/500/800 × nivel, con el nivel anterior a recalcularlo.
- Hard drop: +2 por celda recorrida.
- Soft drop (`↓`): +1 por fila bajada; si la pieza no puede bajar, se fija sin sumar.
- Nivel = `floor(líneas / 10) + 1`.
- Intervalo de caída = `max(100, 1000 − (nivel − 1) × 90)` ms.
- Fin de partida: la pieza recién generada colisiona al aparecer.
- Ghost: proyección de la pieza actual dibujada con alpha 0.2.

Contrato con el reproductor: `GameSnapshot` con `lives: null` y `level` numérico; `onChange` solo cuando cambia `score`, `level` o `status`. LINES no forma parte del snapshot: se dibuja en cada frame en el canvas.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

1. **Catálogo y portada.** En `lib/games.ts`, sustituir el registro `caida` por el de `tetris` en la misma posición; en `app/globals.css`, renombrar `.cover-tetro` a `.cover-tetris` (regla y `::after`). Antes, `Grep` de `cover-tetro` y `caida` para confirmar que no quedan otras referencias. Verificación: `/games` muestra la tarjeta TETRIS con su portada y no CAÍDA; `/games/tetris` carga; `/games/caida` devuelve 404.
2. **Constantes y utilidades.** Crear `lib/tetris/constants.ts` y `lib/tetris/utils.ts` con valores y funciones copiados del original (sin globals ni DOM). Verificación: `npx tsc --noEmit`.
3. **Entrada.** Crear `lib/tetris/input.ts`: listeners `keydown` en `window` registrados en `attach()` y eliminados en `detach()`; `preventDefault` en flechas y Espacio; las flechas, `X` y `↑` conservan el auto-repeat del navegador; Espacio, `P` y `Escape` ignoran `event.repeat`; se ignoran las teclas si `enabled` es falso. Verificación: `tsc`.
4. **Estado y reglas.** Crear `lib/tetris/rules.ts` con tablero, pieza actual, siguiente, líneas, nivel, puntuación e intervalo de caída, y las reglas del original. Verificación: `tsc`.
5. **Motor.** Crear `lib/tetris/engine.ts` con `TetrisEngine implements GameEngine`: `start`, `pause`, `resume`, `restart`, `endGame`, `destroy`; `dt` capado a 50 ms y `lastTime` reiniciado al reanudar; `P`/`Escape` alternan pausa; sin overlays de PAUSA ni GAME OVER; dibujo en un único canvas de 800×600 (fondo, cuadrícula tenue, tablero, ghost, pieza actual, panel NEXT y LINES); `onChange` solo cuando cambia score, nivel o estado; `onGameOver(finalScore)` una sola vez; con la partida terminada el motor ignora el teclado. Verificación: `tsc`.
6. **Registro jugable.** Añadir `tetris` a `PLAYABLE_GAMES` en `lib/playable-games.ts`. Antes, leer la guía de Client Components en `node_modules/next/dist/docs/` si se toca código de Next. Verificación: `/games/tetris/jugar` carga el juego con el canvas 800×600; `/games/asteroids/jugar` y `/games/rocas/jugar` siguen igual.
7. **Leaderboard real.** Escribir `supabase/migrations/<timestamp>_register_tetris.sql` con el `insert` anterior y aplicarla con `apply_migration`. Verificación: `list_migrations` la muestra; `select id, title from public.games` devuelve `asteroids` y `tetris`; `get_advisors` (security) sin avisos nuevos.
8. **Ranking visible.** Sin código: comprobar que `/games/tetris` muestra el panel real con estado vacío y que `/salon` con la pestaña TETRIS muestra podio con `—` y tabla vacía. Verificación: no aparece ningún ranking sembrado de CAÍDA.
9. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): jugar, llegar a GAME OVER, guardar y ver la fila en detalle y Salón; limpiar las filas de prueba con `delete from public.scores where game_id = 'tetris'`.

---

## Criterios de aceptación

- [ ] `GAMES` contiene `tetris` en la 3.ª posición, sin `caida`, y la tarjeta usa `.cover-tetris`; `.cover-tetro` ya no existe en `app/globals.css`.
- [ ] `PLAYABLE_GAMES` tiene la clave `tetris` con `width: 800`, `height: 600` y `label: "Juego TETRIS"`.
- [ ] `TetrisEngine` declara `implements GameEngine` y no usa globals ni `document`/`getElementById`.
- [ ] El motor se carga con `import()` diferido: no está en el bundle de `/games` ni de `/salon`.
- [ ] En `/games/tetris/jugar` hay un `<canvas>` de 800×600 dentro de `.crt-screen` con `aria-label="Juego TETRIS"` y no existe `.game-arena`.
- [ ] `←` `→` mueven la pieza, `↑` y `X` rotan con wall kicks, `↓` baja una fila, `Espacio` la deja caer; la página no hace scroll con flechas ni Espacio.
- [ ] El tablero es de 10×20 con bloques de 30 px; el panel muestra NEXT con la pieza siguiente y LINES con las líneas acumuladas.
- [ ] Salen las 8 piezas, incluida la N (tuerca), con los colores de la tabla; el ghost se dibuja con alpha 0.2.
- [ ] Limpiar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 multiplicado por el nivel; el HUD React lo refleja.
- [ ] Hard drop suma 2 puntos por celda recorrida y soft drop 1 punto por fila bajada.
- [ ] El nivel sube cada 10 líneas y el intervalo de caída sigue `max(100, 1000 − (nivel − 1) × 90)` ms.
- [ ] El HUD muestra la puntuación, `—` en vidas y el nivel real.
- [ ] Mantener pulsada `←`, `→` o `↓` repite la acción; mantener pulsado `Espacio` produce un solo hard drop.
- [ ] PAUSA, `P` y `Escape` detienen la caída y muestran "EN PAUSA"; REANUDAR o la misma tecla la reanuda sin saltos de caída.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] Cuando la pieza nueva colisiona al aparecer se abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez; FIN lo abre con la puntuación actual.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 0 líneas, nivel 1, tablero vacío y estado de guardado limpio.
- [ ] `games` contiene `tetris` y la migración aparece en `list_migrations`.
- [ ] GUARDAR con un nombre `^[A-Z0-9_]{3,12}$` crea una fila en `scores` con `game_id = 'tetris'`, `user_id = NULL` y la puntuación mostrada; la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación guardada aparece en `/games/tetris` y en `/salon` (pestaña TETRIS) sin redeploy.
- [ ] Con 0 filas, `/games/tetris` y `/salon` muestran el estado vacío y el podio muestra `—` en los puestos sin fila.
- [ ] ASTEROIDS, `/games/rocas/jugar` y el resto de juegos existentes se comportan exactamente como antes.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos; sin errores en consola en `/games/tetris`, `/games/tetris/jugar` ni `/salon`.
- [ ] `references/started-games/03-tetris/` no se modifica.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** sustituir CAÍDA por `tetris` con `id` y título nuevos, en la misma posición. Decisión del usuario; el id y el título reflejan el juego real y el mock deja de existir.
- **No:** conservar el `id` `caida` ni mantener CAÍDA junto a TETRIS. Dejaría dos juegos del mismo concepto, uno de ellos falso.
- **Sí:** reutilizar la portada del mock renombrada a `.cover-tetris` y los textos y `best`/`plays` mock. Evita diseñar una portada nueva; `best` y `plays` siguen mock hasta el spec de catálogo desde BD.
- **Sí:** canvas 800×600 con tablero 300×600 sin escalar y panel dibujado a su derecha. Mantiene el bloque de 30 px del original y la misma resolución que ASTEROIDS; encaja en el 4:3 de `.crt-screen`.
- **No:** 640×480 con bloque de 24 px. Cambia las proporciones del original sin ganar nada.
- **Sí:** nivel en el HUD React, `lives: null`, y NEXT y LINES en el canvas. El snapshot solo tiene score/vidas/nivel; usar `lives` para las líneas falsearía el campo.
- **Sí:** paleta neón de la plataforma con tres variantes de tono para distinguir las 8 piezas, y glow moderado por grupo. Coherencia visual con ASTEROIDS.
- **No:** colores originales. Más fieles, pero rompen el estilo neón.
- **Sí:** gameplay idéntico al original, incluida la 8.ª pieza N y el sorteo uniforme `random × 8`. Es la regla por defecto de un port.
- **No:** quitar la pieza N ni añadir 7-bag, hold o SRS. Son cambios de reglas.
- **Sí:** soft drop con pieza bloqueada fija la pieza al instante, como en el original. Es parte de su comportamiento actual.
- **Sí:** auto-repeat del navegador en `←` `→` `↓` `↑` `X`, y `Espacio` sin repeat. Decisión del usuario; excepción al original (donde mantener Espacio encadenaba hard drops) para evitar perder varias piezas por una pulsación larga.
- **No:** DAS/ARR propios. Cambian la sensación de juego.
- **Sí:** `Escape` además de `P` para pausar, y `preventDefault` en flechas y Espacio. Es el contrato de controles de la plataforma.
- **Sí:** `dt` capado a 50 ms. Excepción menor al original (que usa el `dt` sin tope) para evitar saltos al volver de una pestaña oculta; el intervalo mínimo de caída (100 ms) es mayor que el tope.
- **Sí:** sin assets ni sonido. El original no tiene ninguno; el sonido va en otro spec.
- **No:** copiar la lista de controles ni el selector de tema al canvas. No existen en la plataforma y el tema claro no encaja con el CRT.
- **Sí:** sin cambio de esquema: se asume que la puntuación máxima de Tetris cabe en `MAX_SCORE` (10 000 000). _Supuesto: el récord mock es 184 220; llegar al límite exigiría cientos de miles de líneas._
- **Sí:** migración de registro propia (`insert` en `games`) sin tocar tablas, políticas ni tipos generados. SPEC 06 ya dejó el flujo genérico.
- **Sí:** eliminar la persistencia propia del original (`tetris-theme`). La única fuente de verdad de puntuaciones es Supabase.

---

## Riesgos identificados

| Riesgo                                                                    | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners          | `GameCanvas` crea el motor en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners.                                        |
| Flechas/Espacio hacen scroll o activan el botón con foco                  | `preventDefault` en esas teclas; los botones hacen `blur()` tras el click.                                                                  |
| Pausa desincronizada entre el botón React y `P`/`Escape`                  | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él.                                                              |
| Callbacks en cada frame provocan re-renders excesivos                     | `onChange` solo cuando cambia score, nivel o estado; LINES se dibuja en canvas sin pasar por React.                                         |
| Salto de `dt` al volver de una pestaña oculta o al reanudar               | `dt` capado a 50 ms y `lastTime` reiniciado al reanudar; el acumulador de caída no crece durante la pausa.                                  |
| `shadowBlur` caro en equipos lentos                                       | Glow moderado, aplicado por grupo de color y no por bloque (hasta 200 bloques en pantalla).                                                 |
| Teclas acumuladas durante la pausa o el game over se ejecutan al reanudar | `Input.clear()` al pausar y al terminar; `enabled = false` con la partida terminada, igual que `AsteroidsEngine`.                           |
| Con el modal abierto Espacio hace un hard drop o activa un botón          | El motor ignora el teclado en `gameover`; los botones hacen `blur()` tras el click.                                                         |
| Doble `onGameOver` (hard drop que fija y genera una pieza que colisiona)  | Se emite desde un único punto (`setGameOver`), no-op si el estado ya es `gameover`.                                                         |
| Auto-repeat de `↑`/`X` hace girar la pieza sin control                    | Se conserva a propósito (comportamiento del original); si molesta, se ajusta en un spec posterior.                                          |
| Fondo oscuro del tablero se confunde con `.crt-screen`                    | Fondo `#000`/oscuro y cuadrícula tenue dibujados por el motor; verificar con captura en el cierre.                                          |
| Entradas antiguas con `game: "caida"` en `localStorage["av_scores"]`      | Los datos son locales; `getGame("caida")` devuelve `undefined`. Comprobar en el cierre que home y Salón no fallan con una entrada huérfana. |
| `games.id` no existe y la FK rechaza el guardado                          | La migración de registro es un paso del plan y un criterio de aceptación.                                                                   |
| Puntuación máxima supera `MAX_SCORE`                                      | Supuesto documentado en Decisiones; improbable con las reglas del original.                                                                 |
| Cualquiera puede insertar puntuaciones falsas                             | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06.                                                     |
| APIs distintas en Next 16 / React 19.3                                    | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.                                               |

---

## Qué **no** entra en este spec

- Sonido y música.
- Tema claro/oscuro del original y lista de controles dibujada.
- Cambios de reglas: hold, 7-bag, SRS, DAS/ARR, quitar la pieza N.
- Cambios en otros juegos, incluido ASTEROIDS y ROCAS.
- Supabase Auth, "TU MEJOR MARCA" y mejor marca por jugador.
- Antitrampas, rate limiting y moderación.
- Catálogo, `best` y `plays` leídos de la BD.
- Controles táctiles.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
