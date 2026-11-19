# SPEC 10 — Juego SNAKE jugable con leaderboard real

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-11-19
> **Objective:** Crear SNAKE desde cero como juego jugable en `/games/snake/jugar`, con frutas del atlas `references/source-assets/snake-assets`, y registrarlo en el leaderboard real sustituyendo al mock SERPENTINA.

---

## Por qué existe este spec

SNAKE es el cuarto juego real de la plataforma y el primero sin código de referencia: no hay carpeta en `references/started-games/`, solo `references/source-assets/snake-assets/` con `fruits.png` (3790×442, fondo transparente) y `sprites.js` (atlas `SPRITE_ATLAS` con 22 frutas). El motor se escribe desde cero siguiendo la estructura de ASTEROIDS, TETRIS y ARKANOID.

Sustituye al mock SERPENTINA (`id: "serpentina"`, ARCADE, green, portada `.cover-snake`), que hoy tiene un ranking sembrado y no es jugable. SPEC 07 dejó el reproductor y el registro listos y SPEC 09 confirmó la receta con assets, así que este spec aporta el motor, el PNG de frutas, la entrada en `PLAYABLE_GAMES`, la fila en `games` y el cambio de catálogo.

---

## Alcance

**Dentro:**

- Catálogo (`lib/games.ts`): se **elimina** el mock `serpentina` y entra `snake` en su misma posición (4.ª de `GAMES`): título `SNAKE`, categoría `ARCADE`, color `green`, portada `.cover-snake` (la clase existente en `app/globals.css`, sin cambios).
- Motor `SnakeEngine` en `lib/snake/` que implementa `GameEngine`, escrito desde cero con las reglas de Decisiones.
- Entrada `snake` en `PLAYABLE_GAMES` (`lib/playable-games.ts`): 800×600. Su `load()` precarga `fruits.png` antes de devolver la factoría.
- Asset copiado a `public/games/snake/fruits.png`.
- Migración `supabase/migrations/<timestamp>_register_snake.sql` que inserta `snake` en `games`.
- Ranking real en `/games/snake` (top 10) y `/salon` (top 12) sin cambios de código: ya es genérico desde SPEC 06.
- HUD React: puntuación; vidas y nivel con `null` (el HUD muestra `—`). El canvas dibuja solo el campo, la serpiente y la fruta.
- Controles: `←` `↑` `→` `↓` y `W` `A` `S` `D` giran la serpiente; `P`/`Escape` pausa; auto-pausa al perder foco.
- Estética: serpiente vectorial neón verde y campo oscuro con cuadrícula tenue; frutas con los sprites del atlas.

**Fuera de alcance (para specs futuros):**

- Sonido de cualquier tipo (no hay audio de referencia).
- Vidas, niveles, obstáculos, power-ups, frutas especiales y modos de juego (wrap, dos jugadores).
- Puntos distintos según la fruta.
- Auth, "TU MEJOR MARCA", mejor marca por jugador.
- Antitrampas, rate limiting, moderación.
- Controles táctiles y swipe.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Registro en `GAMES` (sustituye al de `serpentina`; `short`, `long`, `best` y `plays` conservan los valores mock actuales):

```ts
{
  id: "snake",
  title: "SNAKE",
  short: "Crece sin morder tu propia cola.",
  long: "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
  best: 7820,
  plays: "9.1K",
}
```

Entrada del registro jugable:

```ts
snake: {
  load: async () => {
    const assets = await loadSnakeAssets(); // nunca rechaza: si falla, `fruits` es null
    const { SnakeEngine } = await import("@/lib/snake/engine");
    return (canvas, cb) => new SnakeEngine(canvas, cb, assets);
  },
  width: 800,
  height: 600,
  label: "Juego SNAKE",
}
```

Migración:

```sql
insert into public.games (id, title) values ('snake', 'SNAKE');
```

Estructura de archivos:

- `lib/snake/constants.ts` — `W` 800, `H` 600, `CELL` 40, `COLS` 20, `ROWS` 15, `START_LENGTH` 3, posición inicial de la cabeza (casilla 5, 7, dirección derecha), `FRUIT_POINTS` 10, `TICK_START_MS` 140, `TICK_MIN_MS` 60, `TICK_STEP_MS` 10, `FRUITS_PER_STEP` 5, `INPUT_QUEUE_MAX` 2, `ASSET_BASE` `/games/snake`.
- `lib/snake/sprites.ts` — `FRUIT_SPRITES`: los 22 recortes `{ x, y, w, h }` de `sprites.js` (`banana`… `melon`), copiados tal cual.
- `lib/snake/assets.ts` — tipo `SnakeAssets` (`fruits: CanvasImageSource | null`) y `loadSnakeAssets()`.
- `lib/snake/utils.ts` — funciones puras: `nextTickMs(eaten)`, `isOpposite(a, b)`, `randomFreeCell(snake, rng)`.
- `lib/snake/input.ts` — clase `Input`: `attach()`/`detach()`, cola de giros (máximo 2) y cola de pulsaciones discretas (`KeyP`, `Escape`).
- `lib/snake/entities.ts` — clases `Snake` y `Fruit` con `step()`/`draw(ctx, assets)`.
- `lib/snake/engine.ts` — `SnakeEngine implements GameEngine`: loop, pausa, game over, dibujo y emisión de `onChange`.

Reglas de juego y puntuación:

- La serpiente empieza con 3 casillas, la cabeza en (5, 7) y dirección derecha, y se mueve sola desde `start()`.
- Cada tick avanza una casilla en la dirección actual; el movimiento es por casillas, no por píxeles.
- Comer una fruta: +10 puntos y +1 casilla de longitud (la cola no se retira ese tick).
- Chocar con una pared o con el propio cuerpo termina la partida. Mover la cabeza a la casilla que libera la cola en ese mismo tick no es colisión.
- Velocidad: `tick = max(60, 140 − 10 × floor(frutas / 5))` ms. Llega al mínimo a las 40 frutas.
- Fruta nueva: casilla libre al azar y sprite al azar entre los 22 de `FRUIT_SPRITES`.
- Giros: una pulsación opuesta a la dirección actual se ignora; las pulsaciones se encolan (máx. 2) y se consumen una por tick, para no perder giros rápidos ni permitir un giro de 180° con dos teclas en el mismo tick.
- Si la serpiente ocupa las 300 casillas no hay dónde poner fruta: la partida termina como victoria con `onGameOver(score)`.
- Máximo realista: (300 − 3) frutas × 10 = **2 970** puntos, muy por debajo de `MAX_SCORE` (10 000 000).

Contrato con el reproductor: `GameSnapshot` con `lives: null` y `level: null`; `onChange` solo cuando cambia `score` o `status`. No se usa el estado `dead`.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

1. **Catálogo y portada.** En `lib/games.ts`, sustituir el registro `serpentina` por el de `snake` en la misma posición; `.cover-snake` ya existe en `app/globals.css` y no se toca. Antes, `Grep` de `serpentina` para confirmar que no quedan referencias fuera de specs históricos. Verificación: `/games` muestra la tarjeta SNAKE con su portada y no SERPENTINA; `/games/snake` carga; `/games/serpentina` devuelve 404.
2. **Constantes, sprites, assets y utilidades.** Crear `lib/snake/constants.ts`, `sprites.ts`, `assets.ts` y `utils.ts` (sin globals ni DOM fuera de `loadSnakeAssets`). `loadSnakeAssets()` resuelve siempre: si la imagen falla, `fruits` queda en `null` y se registra con `console.warn`. Verificación: `npx tsc --noEmit`.
3. **Entrada.** Crear `lib/snake/input.ts`: `keydown` en `window`, registrado en `attach()` y eliminado en `detach()`; `preventDefault` en flechas; `P` y `Escape` ignoran `event.repeat`; flechas y `WASD` entran en la cola de giros (máx. 2); se ignoran las teclas si `enabled` es falso. Verificación: `tsc`.
4. **Assets.** Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` sin tocar `references/`. Verificación: `/games/snake/fruits.png` responde 200.
5. **Entidades.** Crear `lib/snake/entities.ts`: `Snake` (cuerpo como lista de casillas, `step(dir, grow)`, `draw` con segmentos redondeados verdes, `shadowBlur` moderado por grupo y ojos en la cabeza) y `Fruit` (casilla y sprite; `draw` con `drawImage` escalado a la casilla conservando proporción, o círculo magenta si `fruits` es `null`). Verificación: `tsc`.
6. **Motor.** Crear `lib/snake/engine.ts` con `SnakeEngine implements GameEngine`: `start`, `pause`, `resume`, `restart`, `endGame`, `destroy`; loop con acumulador (un paso de lógica cada `tick` ms); `dt` capado a 50 ms y `lastTime` reiniciado al reanudar; `P`/`Escape` alternan pausa; sin overlays de PAUSA ni GAME OVER; fondo `#0a0a18` con cuadrícula tenue; `onChange` solo cuando cambia score o estado; `onGameOver(finalScore)` una sola vez desde un único punto, tanto al chocar como al llenar el tablero; con la partida terminada el motor ignora el teclado. Verificación: `tsc`.
7. **Registro jugable.** Añadir `snake` a `PLAYABLE_GAMES` en `lib/playable-games.ts` con el `load()` del Modelo de datos. Antes, leer la guía de Client Components en `node_modules/next/dist/docs/` si se toca código de Next. Verificación: `/games/snake/jugar` carga el juego con el canvas 800×600 y las frutas visibles; `/games/asteroids/jugar`, `/games/tetris/jugar`, `/games/arkanoid/jugar` y `/games/rocas/jugar` siguen igual.
8. **Leaderboard real.** Escribir `supabase/migrations/<timestamp>_register_snake.sql` con el `insert` anterior y aplicarla con `apply_migration`. Verificación: `list_migrations` la muestra; `select id, title from public.games` devuelve `asteroids`, `tetris`, `arkanoid` y `snake`; `get_advisors` (security) sin avisos nuevos.
9. **Ranking visible.** Sin código: comprobar que `/games/snake` muestra el panel real con estado vacío y que `/salon` con la pestaña SNAKE muestra podio con `—` y tabla vacía. Verificación: no aparece ningún ranking sembrado de SERPENTINA.
10. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): jugar, comer frutas, llegar a GAME OVER por pared y por cuerpo, guardar y ver la fila en detalle y Salón; limpiar las filas de prueba con `delete from public.scores where game_id = 'snake'`.

---

## Criterios de aceptación

- [ ] `GAMES` contiene `snake` en la 4.ª posición, sin `serpentina`, y la tarjeta usa `.cover-snake`.
- [ ] `PLAYABLE_GAMES` tiene la clave `snake` con `width: 800`, `height: 600` y `label: "Juego SNAKE"`.
- [ ] `SnakeEngine` declara `implements GameEngine` y no usa globals ni `document`/`getElementById`.
- [ ] El motor se carga con `import()` diferido: no está en el bundle de `/games` ni de `/salon`.
- [ ] En `/games/snake/jugar` hay un `<canvas>` de 800×600 dentro de `.crt-screen` con `aria-label="Juego SNAKE"` y no existe `.game-arena`.
- [ ] Existe `public/games/snake/fruits.png` y `/games/snake/fruits.png` responde 200.
- [ ] El campo es una rejilla de 20×15 casillas de 40 px; la serpiente empieza con 3 casillas, cabeza en (5, 7), moviéndose a la derecha.
- [ ] `←` `↑` `→` `↓` y `W` `A` `S` `D` giran la serpiente; la página no hace scroll con las flechas.
- [ ] Una pulsación opuesta a la dirección actual se ignora; dos giros pulsados dentro del mismo tick se aplican en ticks consecutivos y nunca producen una inversión de 180°.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente una casilla y el HUD React lo refleja.
- [ ] Cada fruta nueva aparece en una casilla libre (nunca sobre la serpiente) con un sprite de los 22 del atlas.
- [ ] El intervalo de tick es 140 ms al inicio, 130 ms tras 5 frutas y no baja de 60 ms.
- [ ] Chocar con una pared o con el cuerpo abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez; moverse a la casilla que libera la cola no termina la partida.
- [ ] Ocupar las 300 casillas abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez.
- [ ] El HUD muestra la puntuación real y `—` en vidas y nivel.
- [ ] PAUSA, `P` y `Escape` detienen el juego y muestran "EN PAUSA"; REANUDAR o la misma tecla lo reanuda sin que la serpiente salte varias casillas.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] Si `fruits.png` devuelve 404, el juego carga igualmente y la fruta se dibuja como círculo magenta, sin excepciones no controladas.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, serpiente de 3 casillas, velocidad inicial y estado de guardado limpio.
- [ ] `games` contiene `snake` y la migración aparece en `list_migrations`.
- [ ] GUARDAR con un nombre `^[A-Z0-9_]{3,12}$` crea una fila en `scores` con `game_id = 'snake'`, `user_id = NULL` y la puntuación mostrada; la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación guardada aparece en `/games/snake` y en `/salon` (pestaña SNAKE) sin redeploy.
- [ ] Con 0 filas, `/games/snake` y `/salon` muestran el estado vacío y el podio muestra `—` en los puestos sin fila.
- [ ] ASTEROIDS, TETRIS, ARKANOID, `/games/rocas/jugar` y el resto de juegos existentes se comportan exactamente como antes.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos; sin errores en consola en `/games/snake`, `/games/snake/jugar` ni `/salon`.
- [ ] `references/` no se modifica.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** sustituir SERPENTINA por `snake` con `id` y título nuevos, en la misma posición (4.ª). Mismo criterio que SPEC 09 con BLOQUE BUSTER; el mock deja de existir y el id coincide con la carpeta de assets y el slug del spec.
- **No:** conservar el `id` `serpentina` ni mantener ambos juegos. Dejaría dos juegos del mismo concepto, uno falso.
- **Sí:** conservar `.cover-snake`, `short`, `long`, `best` y `plays` mock. Evita diseñar una portada nueva; `best` y `plays` siguen mock hasta el spec de catálogo desde BD. _Nota: el `best` mock (7 820) es inalcanzable con el máximo real de 2 970; es un dato de presentación que ese spec corregirá._
- **Sí:** juego desde cero, sin referencia en `references/started-games/`. Las reglas son las del Snake clásico con las decisiones de abajo.
- **Sí:** canvas 800×600 con rejilla 20×15 de 40 px. Es 4:3 como el resto, sin escalado, y la casilla de 40 px da tamaño suficiente a los sprites de fruta.
- **No:** rejilla 40×30 de 20 px (fruta demasiado pequeña) ni 640×480 (resolución distinta a los demás juegos).
- **Sí:** paredes mortales, 1 vida y sin niveles; HUD con `lives: null` y `level: null`. Es el Snake clásico y encaja con el contrato de SPEC 07.
- **No:** wrap en los bordes ni 3 vidas. Cambian el carácter del juego y la dificultad; pueden ser un modo en otro spec.
- **Sí:** 10 puntos por fruta, sin importar el sprite. Regla simple y verificable; el sprite es solo variedad visual.
- **No:** puntos por tipo de fruta. Exigiría decidir una tabla de 22 frutas sin referencia.
- **Sí:** velocidad creciente: tick de 140 ms, −10 ms cada 5 frutas, mínimo 60 ms. Cumple lo que promete la descripción del catálogo («la hace más veloz»); el mínimo se alcanza a las 40 frutas.
- **No:** velocidad constante. Haría la partida monótona y contradiría el texto del catálogo.
- **Sí:** movimiento por ticks con acumulador y `dt` capado a 50 ms. Mantiene el paso por casillas estable a cualquier framerate y evita saltos al volver de una pestaña oculta.
- **Sí:** cola de giros de 2 y rechazo de la inversión de 180° comprobada contra la última dirección encolada. Evita que un doble toque rápido mate a la serpiente sin culpa del jugador.
- **Sí:** victoria al llenar el tablero con `onGameOver(score)`. Es el único caso sin casilla libre para la fruta; sin esta regla el motor fallaría.
- **Sí:** serpiente vectorial neón verde con `shadowBlur` moderado y frutas con sprites. No hay sprites de serpiente y el estilo neón es el de la plataforma; las frutas conservan su aspecto original.
- **No:** serpiente de bloques planos sin glow. Menos coherente con ASTEROIDS y TETRIS.
- **Sí:** fruta aleatoria entre las 22 del atlas. Aprovecha todo el asset sin cambiar reglas.
- **Sí:** copiar solo `fruits.png` a `public/games/snake/` y precargarlo en `load()`, que nunca rechaza. `GameCanvas` no captura errores de `load()`; si la imagen falla, la fruta es un círculo magenta de respaldo para que el juego siga siendo jugable.
- **No:** copiar `sprites.js` a `public/`. Es un script con `window.SPRITE_ATLAS`; los recortes se pasan a `lib/snake/sprites.ts` como datos tipados.
- **Sí:** sin sonido. No hay audio de referencia y el sonido global de la plataforma es un spec aparte.
- **Sí:** flechas + `WASD`, `P`/`Escape` para pausa y `preventDefault` en flechas. Es el contrato de controles de la plataforma.
- **No:** swipe táctil. Los controles táctiles quedan fuera de todos los juegos hasta su propio spec.
- **Sí:** sin cambio de esquema: la puntuación máxima (2 970) cabe de sobra en `MAX_SCORE` (10 000 000).
- **Sí:** migración de registro propia (`insert` en `games`) sin tocar tablas, políticas ni tipos generados. SPEC 06 ya dejó el flujo genérico.

---

## Riesgos identificados

| Riesgo                                                                         | Mitigación                                                                                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners               | `GameCanvas` crea el motor en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners.                                             |
| Flechas hacen scroll o activan el botón con foco                               | `preventDefault` en las flechas; los botones hacen `blur()` tras el click.                                                                       |
| Pausa desincronizada entre el botón React y `P`/`Escape`                       | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él.                                                                   |
| Callbacks en cada frame provocan re-renders excesivos                          | `onChange` solo cuando cambia score o estado; los ticks sin cambio no emiten.                                                                    |
| Salto de `dt` al volver de una pestaña oculta o al reanudar                    | `dt` capado a 50 ms, acumulador a cero y `lastTime` reiniciado al reanudar.                                                                      |
| Giro de 180° por dos pulsaciones rápidas dentro de un tick                     | La cola se valida contra la última dirección encolada, no contra la actual, y consume un giro por tick.                                          |
| Falsa colisión con la cola que se libera en el mismo tick                      | La colisión con el cuerpo se evalúa contra el cuerpo tras retirar la cola, salvo que ese tick coma fruta.                                        |
| Spritesheet de 3790×442 pesado de decodificar y dibujar escalado cada frame    | Se carga una vez en `load()`; solo hay una fruta en pantalla y un `drawImage` por frame.                                                         |
| Fruta con proporciones distintas (110–170 × 160) deformada al encajar en 40 px | Escalado uniforme por la altura (160 → 36 px) centrado en la casilla; sin estirar el ancho.                                                      |
| `randomFreeCell` lento o bucle infinito con el tablero casi lleno              | Se elige entre la lista de casillas libres, no por reintento; con la lista vacía se termina como victoria.                                       |
| Assets con 404                                                                 | `loadSnakeAssets()` nunca rechaza; la fruta de respaldo es un círculo magenta; ruta `/games/snake/fruits.png` verificada en el cierre.           |
| `shadowBlur` caro en equipos lentos                                            | Glow moderado, aplicado una vez por grupo de segmentos y no por segmento.                                                                        |
| Con el modal de fin abierto, las teclas siguen girando la serpiente            | El motor ignora el teclado en `gameover` (`enabled = false`); `Input.clear()` al pausar y al terminar.                                           |
| Doble `onGameOver` (choque y tablero lleno en el mismo tick)                   | Se emite desde un único punto (`setGameOver`), no-op si el estado ya es `gameover`.                                                              |
| Entradas antiguas con `game: "serpentina"` en `localStorage["av_scores"]`      | Los datos son locales; `getGame("serpentina")` devuelve `undefined`. Comprobar en el cierre que home y Salón no fallan con una entrada huérfana. |
| `games.id` no existe y la FK rechaza el guardado                               | La migración de registro es un paso del plan y un criterio de aceptación.                                                                        |
| Cualquiera puede insertar puntuaciones falsas                                  | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06. Con un máximo de 2 970 el ranking es fácil de falsear.   |
| APIs distintas en Next 16 / React 19.3                                         | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.                                                    |

---

## Qué **no** entra en este spec

- Sonido, incluido el control de sonido global de la plataforma.
- Vidas, niveles, obstáculos, power-ups, frutas especiales, wrap en los bordes y modos multijugador.
- Puntos distintos según la fruta.
- Cambios cosméticos de la serpiente con sprites (no existen en el asset).
- Cambios en otros juegos, incluidos ASTEROIDS, TETRIS, ARKANOID y ROCAS.
- Supabase Auth, "TU MEJOR MARCA" y mejor marca por jugador.
- Antitrampas, rate limiting y moderación.
- Catálogo, `best` y `plays` leídos de la BD.
- Controles táctiles y swipe.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
