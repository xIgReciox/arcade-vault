# SPEC 09 — Juego ARKANOID jugable con leaderboard real

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-11-19
> **Objective:** Portar `references/started-games/04-arkanoid` a un motor TypeScript encapsulado, hacerlo jugable en `/games/arkanoid/jugar` y registrarlo en el leaderboard real, sustituyendo al mock BLOQUE BUSTER.

---

## Por qué existe este spec

El tercer juego real de la plataforma sale de `references/started-games/04-arkanoid`: un Arkanoid en JavaScript vanilla con globals, un canvas 800×600 (ya 4:3), 5 niveles definidos en `levels.js`, un spritesheet PNG, dos efectos de sonido, HUD dibujado en el canvas y overlays propios de PAUSA, GAME OVER y victoria. SPEC 07 dejó el reproductor y el registro listos y SPEC 08 confirmó la receta, así que este spec solo aporta el motor, sus assets, su entrada en `PLAYABLE_GAMES`, la fila en `games` y el cambio de catálogo.

Sustituye al mock BLOQUE BUSTER (`id: "bloque-buster"`, ARCADE, cyan), que hoy tiene un ranking sembrado y no es jugable. A diferencia de ASTEROIDS y TETRIS, este juego trae assets y sonido, y conserva el selector «Saltar al nivel» del original, adaptado al contrato de pausa de la plataforma.

---

## Alcance

**Dentro:**

- Catálogo (`lib/games.ts`): se **elimina** el mock `bloque-buster` y entra `arkanoid` en su misma posición (2.ª de `GAMES`): título `ARKANOID`, categoría `ARCADE`, color `cyan`, portada `.cover-arkanoid`.
- `app/globals.css`: la clase `.cover-bricks` (y su `::after`) se renombra a `.cover-arkanoid` sin cambiar su aspecto. Hoy solo la usa `lib/games.ts`.
- Motor `ArkanoidEngine` en `lib/arkanoid/` que implementa `GameEngine`, portado de `game.js` y `levels.js` **sin cambios de gameplay** (5 niveles, velocidades por nivel, 3 vidas, 10 puntos por bloque), con las excepciones listadas en Decisiones.
- Entrada `arkanoid` en `PLAYABLE_GAMES` (`lib/playable-games.ts`): 800×600. Su `load()` precarga el spritesheet y los dos sonidos antes de devolver la factoría.
- Assets copiados a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3`.
- Sonido: rebote de pelota (paredes y paleta) y rotura de bloque, con `M` para silenciar. Solo suena tras una interacción del jugador.
- Migración `supabase/migrations/<timestamp>_register_arkanoid.sql` que inserta `arkanoid` en `games`.
- Ranking real en `/games/arkanoid` (top 10) y `/salon` (top 12) sin cambios de código: ya es genérico desde SPEC 06.
- HUD React: puntuación, vidas y nivel reales. El canvas no dibuja el HUD del original (`Score`, `Nivel`, iconos de vidas).
- Controles: `←` `→` y ratón mueven la paleta; `P`/`Escape` pausa; en pausa, `1`–`5` saltan al nivel elegido; `M` silencia; auto-pausa al perder foco.
- Fondo `#000` y sprites del original, sin glow ni paleta neón (ver Decisiones).

**Fuera de alcance (para specs futuros):**

- Control de sonido global de la plataforma (mute persistente, volumen, ajustes por juego).
- Botones 1–5 pulsables en el overlay de pausa (exigen ampliar el contrato `GameEngine` y `GamePlayer`).
- Bucle de niveles tras el 5 o modo infinito.
- Power-ups, ángulo de rebote según el punto de la paleta, bloques de varios golpes y otras mecánicas nuevas.
- Auth, "TU MEJOR MARCA", mejor marca por jugador.
- Antitrampas, rate limiting, moderación.
- Controles táctiles.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Registro en `GAMES` (sustituye al de `bloque-buster`; `short`, `long`, `best` y `plays` conservan los valores mock actuales):

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Rebota la pelota y destruye muros de neón.",
  long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
  cat: "ARCADE",
  cover: "cover-arkanoid",
  color: "cyan",
  best: 28450,
  plays: "12.4K",
}
```

Entrada del registro jugable:

```ts
arkanoid: {
  load: async () => {
    const assets = await loadArkanoidAssets(); // nunca rechaza: si algo falla, devuelve ese asset como null
    const { ArkanoidEngine } = await import("@/lib/arkanoid/engine");
    return (canvas, cb) => new ArkanoidEngine(canvas, cb, assets);
  },
  width: 800,
  height: 600,
  label: "Juego ARKANOID",
}
```

Migración:

```sql
insert into public.games (id, title) values ('arkanoid', 'ARKANOID');
```

Estructura de archivos:

- `lib/arkanoid/constants.ts` — `W` 800, `H` 600, `PADDLE_SPEED` 400, `BLOCK_COLS` 10, `BLOCK_ROWS` 6, `BLOCK_W` 64, `BLOCK_H` 24, origen de bloques (`(800 − 10 × 64) / 2`, 80), `BASE_BALL_VX` 200, `BASE_BALL_VY` −300, tamaños y posición inicial de paleta (81×14, y 560) y pelota (16×16), `LIVES` 3, `BLOCK_POINTS` 10, `EXPLOSION_DURATION` 150, `ASSET_BASE` `/games/arkanoid`.
- `lib/arkanoid/levels.ts` — `LEVELS`: los 5 niveles de `levels.js` con `speed` (1.00, 1.10, 1.21, 1.33, 1.46) y `blocks` generados con las mismas reglas (parrilla, pirámide, ajedrez, filas con huecos, marco con cruz).
- `lib/arkanoid/sprites.ts` — rectángulos de origen del spritesheet: `SPRITES` (paleta, pelota, 7 colores de bloque) y `EXPLOSION_FRAMES` (4 frames por color), copiados de `assets/spritesheet.js`.
- `lib/arkanoid/assets.ts` — tipo `ArkanoidAssets` (`sheet: CanvasImageSource | null`, `bounce`/`breakSfx: HTMLAudioElement | null`) y `loadArkanoidAssets()`; copia la imagen a un canvas auxiliar como hace el original.
- `lib/arkanoid/utils.ts` — funciones puras: `clamp`, `collideAABB`.
- `lib/arkanoid/input.ts` — clase `Input`: `attach()`/`detach()`, teclas mantenidas (`ArrowLeft`, `ArrowRight`), cola de pulsaciones discretas (`KeyP`, `Escape`, `Digit1`–`Digit5`, `KeyM`) y posición del ratón sobre el canvas ya convertida a coordenadas internas.
- `lib/arkanoid/entities.ts` — clases `Paddle`, `Ball`, `Block` y `Explosion` con `update(dt)` y `draw(ctx, assets)`.
- `lib/arkanoid/engine.ts` — `ArkanoidEngine implements GameEngine`: loop, pausa, salto de nivel, mute, game over, dibujo y emisión de `onChange`.

Reglas de puntuación y de juego (copiadas del original):

- Romper un bloque: +10 puntos. Máximo realista de una partida: 208 bloques × 10 = **2 080** puntos (60 + 40 + 30 + 39 + 39 bloques en los 5 niveles).
- Perder la pelota (`ball.y > 600`): −1 vida y la pelota se recoloca sobre la paleta con la velocidad del nivel actual; con 0 vidas termina la partida.
- Colisión con un bloque: se destruye un solo bloque por frame y `ball.vy` se invierte.
- Velocidad de la pelota: `BASE_BALL_VX × speed` y `BASE_BALL_VY × speed`, con `speed` del nivel.
- Al limpiar un nivel se carga el siguiente conservando puntuación y vidas; al limpiar el 5 termina la partida (victoria).
- Rebote en paleta: solo con `vy > 0`, margen de 8 px bajo la paleta, `vy` pasa a negativo.

Contrato con el reproductor: `GameSnapshot` con `lives` y `level` numéricos; `onChange` solo cuando cambia `score`, `lives`, `level` o `status`. No se usa el estado `dead`.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

1. **Catálogo y portada.** En `lib/games.ts`, sustituir el registro `bloque-buster` por el de `arkanoid` en la misma posición; en `app/globals.css`, renombrar `.cover-bricks` a `.cover-arkanoid` (regla y `::after`). Antes, `Grep` de `cover-bricks` y `bloque-buster` para confirmar que no quedan otras referencias fuera de specs históricos. Verificación: `/games` muestra la tarjeta ARKANOID con su portada y no BLOQUE BUSTER; `/games/arkanoid` carga; `/games/bloque-buster` devuelve 404.
2. **Constantes, niveles, sprites y utilidades.** Crear `lib/arkanoid/constants.ts`, `levels.ts`, `sprites.ts`, `assets.ts` y `utils.ts` con valores copiados del original (sin globals ni DOM fuera de `loadArkanoidAssets`). `loadArkanoidAssets()` resuelve siempre: un asset que falla queda en `null` y se registra con `console.warn`. Verificación: `npx tsc --noEmit`.
3. **Entrada.** Crear `lib/arkanoid/input.ts`: `keydown`/`keyup` en `window` y `mousemove` en el canvas, registrados en `attach()` y eliminados en `detach()`; `preventDefault` en flechas; `P`, `Escape`, `1`–`5` y `M` ignoran `event.repeat`; el ratón se convierte con `canvas.width / rect.width`; se ignoran las teclas si `enabled` es falso. Verificación: `tsc`.
4. **Entidades.** Crear `lib/arkanoid/entities.ts` con `Paddle`, `Ball`, `Block` y `Explosion`, dibujando con `drawImage` desde el spritesheet y sin dibujar nada si `sheet` es `null`. Verificación: `tsc`.
5. **Motor.** Crear `lib/arkanoid/engine.ts` con `ArkanoidEngine implements GameEngine`: `start`, `pause`, `resume`, `restart`, `endGame`, `destroy`; `dt` capado a 50 ms y `lastTime` reiniciado al reanudar; `P`/`Escape` alternan pausa; en pausa, `1`–`5` cargan ese nivel (conservando puntuación y vidas) y reanudan; `M` alterna mute; sonidos con `cloneNode().play()` y `.catch(() => {})`; sin overlays de PAUSA, GAME OVER ni victoria; en pausa dibuja la línea de ayuda `1–5 SALTAR DE NIVEL · M SONIDO` en la franja y = 40 y, si está en mute, el texto `SONIDO OFF`; `onChange` solo cuando cambia score, vidas, nivel o estado; `onGameOver(finalScore)` una sola vez, tanto al perder la última vida como al limpiar el nivel 5; con la partida terminada el motor ignora el teclado y el ratón. Verificación: `tsc`.
6. **Assets.** Copiar `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` desde `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/` (y `public/games/arkanoid/sounds/`) sin tocar `references/`. Verificación: `/games/arkanoid/spritesheet-breakout.png` y `/games/arkanoid/sounds/ball-bounce.mp3` responden 200.
7. **Registro jugable.** Añadir `arkanoid` a `PLAYABLE_GAMES` en `lib/playable-games.ts` con el `load()` del Modelo de datos. Antes, leer la guía de Client Components en `node_modules/next/dist/docs/` si se toca código de Next. Verificación: `/games/arkanoid/jugar` carga el juego con el canvas 800×600 y los sprites visibles; `/games/asteroids/jugar`, `/games/tetris/jugar` y `/games/rocas/jugar` siguen igual.
8. **Leaderboard real.** Escribir `supabase/migrations/<timestamp>_register_arkanoid.sql` con el `insert` anterior y aplicarla con `apply_migration`. Verificación: `list_migrations` la muestra; `select id, title from public.games` devuelve `asteroids`, `tetris` y `arkanoid`; `get_advisors` (security) sin avisos nuevos.
9. **Ranking visible.** Sin código: comprobar que `/games/arkanoid` muestra el panel real con estado vacío y que `/salon` con la pestaña ARKANOID muestra podio con `—` y tabla vacía. Verificación: no aparece ningún ranking sembrado de BLOQUE BUSTER.
10. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): jugar, saltar de nivel en pausa, llegar a GAME OVER, guardar y ver la fila en detalle y Salón; limpiar las filas de prueba con `delete from public.scores where game_id = 'arkanoid'`.

---

## Criterios de aceptación

- [ ] `GAMES` contiene `arkanoid` en la 2.ª posición, sin `bloque-buster`, y la tarjeta usa `.cover-arkanoid`; `.cover-bricks` ya no existe en `app/globals.css`.
- [ ] `PLAYABLE_GAMES` tiene la clave `arkanoid` con `width: 800`, `height: 600` y `label: "Juego ARKANOID"`.
- [ ] `ArkanoidEngine` declara `implements GameEngine` y no usa globals ni `document`/`getElementById`.
- [ ] El motor se carga con `import()` diferido: no está en el bundle de `/games` ni de `/salon`.
- [ ] En `/games/arkanoid/jugar` hay un `<canvas>` de 800×600 dentro de `.crt-screen` con `aria-label="Juego ARKANOID"` y no existe `.game-arena`.
- [ ] Existen `public/games/arkanoid/spritesheet-breakout.png`, `public/games/arkanoid/sounds/ball-bounce.mp3` y `public/games/arkanoid/sounds/break-sound.mp3`, y las tres rutas responden 200.
- [ ] La paleta se mueve con `←` `→` (400 px/s) y con el ratón sobre el canvas; la página no hace scroll con las flechas.
- [ ] El nivel 1 carga 60 bloques (parrilla 10×6) y los niveles 2–5 cargan 40, 30, 39 y 39 bloques, con las velocidades de pelota ×1.00, ×1.10, ×1.21, ×1.33 y ×1.46.
- [ ] Romper un bloque suma exactamente 10 puntos y el HUD React lo refleja; cada bloque roto muestra su animación de explosión de 150 ms.
- [ ] Perder la pelota resta una vida y recoloca la pelota; con 3 vidas perdidas se abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez.
- [ ] Limpiar un nivel carga el siguiente conservando puntuación y vidas; limpiar el nivel 5 abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez.
- [ ] El HUD muestra la puntuación, las vidas (3 al inicio) y el nivel real.
- [ ] La pelota rebota en paredes, techo y paleta con los mismos márgenes del original, y no atraviesa la paleta con `dt` capado a 50 ms.
- [ ] PAUSA, `P` y `Escape` detienen el juego y muestran "EN PAUSA"; REANUDAR o la misma tecla lo reanuda sin saltos de pelota.
- [ ] En pausa, las teclas `1`–`5` cargan ese nivel con su patrón y su velocidad, conservan puntuación y vidas y reanudan la partida; fuera de pausa no hacen nada.
- [ ] En pausa se ve en el canvas la línea `1–5 SALTAR DE NIVEL · M SONIDO` bajo el overlay de EN PAUSA.
- [ ] Rebotar en paredes o paleta reproduce `ball-bounce.mp3` y romper un bloque reproduce `break-sound.mp3`; `M` silencia ambos y muestra `SONIDO OFF` en pausa, y `M` de nuevo los reactiva.
- [ ] No hay errores de autoplay en consola: ningún sonido se intenta reproducir antes de la primera tecla o clic del jugador.
- [ ] Si un asset devuelve 404, el juego carga igualmente (sin ese sprite o sonido) y no hay excepciones no controladas.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas, nivel 1, bloques del nivel 1 y estado de guardado limpio.
- [ ] `games` contiene `arkanoid` y la migración aparece en `list_migrations`.
- [ ] GUARDAR con un nombre `^[A-Z0-9_]{3,12}$` crea una fila en `scores` con `game_id = 'arkanoid'`, `user_id = NULL` y la puntuación mostrada; la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación guardada aparece en `/games/arkanoid` y en `/salon` (pestaña ARKANOID) sin redeploy.
- [ ] Con 0 filas, `/games/arkanoid` y `/salon` muestran el estado vacío y el podio muestra `—` en los puestos sin fila.
- [ ] ASTEROIDS, TETRIS, `/games/rocas/jugar` y el resto de juegos existentes se comportan exactamente como antes.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners (incluido `mousemove` del canvas) activos; sin errores en consola en `/games/arkanoid`, `/games/arkanoid/jugar` ni `/salon`.
- [ ] `references/started-games/04-arkanoid/` no se modifica.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** sustituir BLOQUE BUSTER por `arkanoid` con `id` y título nuevos, en la misma posición. Decisión del usuario; el id y el título reflejan el juego real y el mock deja de existir.
- **No:** conservar el `id` `bloque-buster` ni mantener BLOQUE BUSTER junto a ARKANOID. Dejaría dos juegos del mismo concepto, uno de ellos falso.
- **Sí:** reutilizar la portada del mock renombrada a `.cover-arkanoid` y los textos y `best`/`plays` mock. Evita diseñar una portada nueva; `best` y `plays` siguen mock hasta el spec de catálogo desde BD. _Nota: el `best` mock (28 450) es inalcanzable con el máximo real de 2 080; es un dato de presentación que ese spec corregirá._
- **Sí:** canvas 800×600 sin escalado. Ya es 4:3 y es la misma resolución que ASTEROIDS y TETRIS.
- **Sí:** copiar el spritesheet a `public/games/arkanoid/` y dibujar con los sprites originales. Decisión del usuario; conserva el aspecto del original.
- **No:** redibujar en vector neón. Cambiaría el aspecto y obligaría a reinventar las explosiones.
- **Sí:** fondo `#000` y sprites sin glow ni paleta neón de la plataforma. Los sprites ya son coloridos y de píxel; añadir `shadowBlur` los ensuciaría y encarece el dibujo.
- **Sí:** sonido incluido, con los 2 mp3 originales. Decisión del usuario; excepción a la regla de las dos entregas anteriores.
- **Sí:** precargar sonidos y spritesheet en `load()` y que este nunca rechace. `GameCanvas` no captura errores de `load()`, y un 404 no debe dejar el reproductor en blanco; un asset ausente solo se omite.
- **Sí:** el audio solo se reproduce a partir de eventos de juego, que ocurren tras una pulsación del jugador (JUGAR, teclas o ratón). Evita el bloqueo de autoplay; los fallos de `play()` se ignoran.
- **Sí:** tecla `M` para silenciar, con estado solo en el motor. Decisión del usuario; mínimo viable sin `localStorage` ni cambios en React.
- **No:** control de sonido global (volumen, mute persistente). Es un spec de plataforma.
- **Sí:** conservar el selector «Saltar al nivel», implementado como teclas `1`–`5` solo en pausa, con la ayuda dibujada en el canvas. Decisión del usuario; el overlay React de pausa (z-index 5) cubre el canvas y bloquearía clics dibujados en él.
- **No:** botones React vía método opcional `jumpToLevel` en `GameEngine`. Tocaría el contrato de SPEC 07 y `GamePlayer`, con riesgo para los demás juegos.
- **Sí:** el salto de nivel conserva puntuación y vidas, como el original. Saltar niveles solo reduce los bloques disponibles, así que no permite superar el máximo de 2 080.
- **Sí:** al limpiar el nivel 5 se emite `onGameOver(score)` y se abre el modal de guardado. Decisión del usuario; sustituye el overlay «¡Completaste el juego!» del original sin añadir reglas.
- **No:** bucle de niveles tras el 5. Cambia las reglas del original.
- **Sí:** HUD en React (puntuación, vidas, nivel) y nada de HUD en el canvas. Es el contrato de la plataforma; evita duplicar la información.
- **Sí:** control con teclado y ratón como el original. La conversión del ratón usa `canvas.width / rect.width` para funcionar con el canvas escalado por `.crt-screen`.
- **Sí:** gameplay idéntico al original, incluidas sus particularidades (una colisión de bloque por frame, `vy` invertido sin cambiar `vx`, rebote en paleta sin ángulo variable). Es la regla por defecto de un port.
- **Sí:** `dt` capado a 50 ms. Excepción menor al original (que usa el `dt` sin tope) para evitar saltos y que la pelota atraviese la paleta al volver de una pestaña oculta.
- **Sí:** `Escape` y `P` para pausar y `preventDefault` en flechas. Es el contrato de controles de la plataforma; el original ya los tenía.
- **Sí:** sin cambio de esquema: la puntuación máxima (2 080) cabe de sobra en `MAX_SCORE` (10 000 000).
- **Sí:** migración de registro propia (`insert` en `games`) sin tocar tablas, políticas ni tipos generados. SPEC 06 ya dejó el flujo genérico.
- **Sí:** eliminar la persistencia propia del original. No tiene `localStorage`; la única fuente de verdad de puntuaciones es Supabase.

---

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                                          |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners                | `GameCanvas` crea el motor en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners, incluido el `mousemove` del canvas.            |
| Flechas hacen scroll o activan el botón con foco                                | `preventDefault` en las flechas; los botones hacen `blur()` tras el click.                                                                          |
| Pausa desincronizada entre el botón React y `P`/`Escape`                        | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él; el salto de nivel reanuda desde el motor y emite el cambio.          |
| Callbacks en cada frame provocan re-renders excesivos                           | `onChange` solo cuando cambia score, vidas, nivel o estado.                                                                                         |
| Salto de `dt` al volver de una pestaña oculta o al reanudar                     | `dt` capado a 50 ms y `lastTime` reiniciado al reanudar y tras el salto de nivel.                                                                   |
| La pelota atraviesa la paleta (tunneling) con `dt` alto                         | Con `dt` ≤ 50 ms y `vy` máxima 438 px/s el avance por frame es ≈ 22 px, dentro del margen de 8 px + altura de paleta del original.                  |
| Assets con 404 o autoplay bloqueado                                             | `loadArkanoidAssets()` nunca rechaza; `play()` con `.catch`; rutas `/games/arkanoid/...` verificadas en el cierre.                                  |
| Sonidos acumulados: un `cloneNode().play()` por evento sin límite               | Los efectos duran menos de 1 s y los eventos son esporádicos; los clones se liberan al terminar. Revisar en el cierre que no hay fugas.             |
| Con el modal de fin abierto, teclas o ratón mueven la paleta o suenan           | El motor ignora teclado y ratón en `gameover` (`enabled = false`); `Input.clear()` al pausar y al terminar.                                         |
| Doble `onGameOver` (perder la última vida y limpiar un nivel en el mismo frame) | Se emite desde un único punto (`setGameOver`), no-op si el estado ya es `gameover`.                                                                 |
| Ayuda de pausa poco visible bajo el overlay React al 60 % de opacidad           | Texto claro y grande en la franja y = 40, libre de bloques; verificar con captura en el cierre.                                                     |
| El overlay de pausa tapa el ratón y las teclas `1`–`5` no se descubren          | Línea de ayuda dibujada por el motor; el selector por clic queda fuera de alcance y documentado.                                                    |
| Spritesheet escalado sin suavizado distinto al original                         | Mismo `drawImage` desde un canvas auxiliar, sin `imageSmoothingEnabled`; comparar con el original en el cierre.                                     |
| Entradas antiguas con `game: "bloque-buster"` en `localStorage["av_scores"]`    | Los datos son locales; `getGame("bloque-buster")` devuelve `undefined`. Comprobar en el cierre que home y Salón no fallan con una entrada huérfana. |
| `games.id` no existe y la FK rechaza el guardado                                | La migración de registro es un paso del plan y un criterio de aceptación.                                                                           |
| Cualquiera puede insertar puntuaciones falsas                                   | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06. Con un máximo de 2 080 el ranking es fácil de falsear.      |
| APIs distintas en Next 16 / React 19.3                                          | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.                                                       |

---

## Qué **no** entra en este spec

- Control de sonido global de la plataforma (mute persistente, volumen).
- Botones 1–5 pulsables en el overlay de pausa y cambios en el contrato `GameEngine` o en `GamePlayer`.
- Cambios de reglas: bucle de niveles, power-ups, ángulo de rebote variable, bloques de varios golpes.
- Cambios en otros juegos, incluidos ASTEROIDS, TETRIS y ROCAS.
- Supabase Auth, "TU MEJOR MARCA" y mejor marca por jugador.
- Antitrampas, rate limiting y moderación.
- Catálogo, `best` y `plays` leídos de la BD.
- Controles táctiles.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
