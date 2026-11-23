# SPEC GJ-sapo-voltio-01 — Juego SAPO VOLTIO jugable con leaderboard real

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-23
> **Objective:** Crear desde cero SAPO VOLTIO, un juego de cruce de carretera y río, jugable en `/games/sapo-voltio/jugar` y registrado en el leaderboard real, sustituyendo al mock RANARIA.

---

## Por qué existe este spec

SAPO VOLTIO nace de la game jam con el tema «Frogger — Cruza la carretera y el río sin convertirte en papilla». Es un juego original de cruce por carriles: Voltio, un sapo de neón, salta casilla a casilla por cinco carriles de tráfico y cinco carriles de río hasta llenar sus cinco nidos. No hay código ni assets de referencia en `references/started-games/` ni en `references/source-assets/`, así que el motor se escribe desde cero siguiendo la estructura de SNAKE (SPEC 10).

Sustituye al mock RANARIA (`id: "ranaria"`, ARCADE, green, portada `.cover-rana`), que describe el mismo concepto, tiene un ranking sembrado y no es jugable. Este spec aporta el motor dibujado en vector, la entrada en `PLAYABLE_GAMES`, la fila en `games` y el cambio de catálogo. Sprites y sonido van en GJ-sapo-voltio-02; boyas, cable, chispa y vida extra van en GJ-sapo-voltio-03.

---

## Alcance

**Dentro:**

- Catálogo (`lib/games.ts`): se **elimina** el mock `ranaria` y entra `sapo-voltio` en su misma posición (8.ª de `GAMES`): título `SAPO VOLTIO`, categoría `ARCADE`, color `yellow`, portada `.cover-sapo-voltio`.
- `app/globals.css`: la clase `.cover-rana` (y su `::after`) se renombra a `.cover-sapo-voltio`; el círculo central pasa de `var(--green)` a `var(--yellow)` y el `drop-shadow` a `rgba(245,255,0,0.5)`. Hoy solo la usa `lib/games.ts`.
- Motor `SapoVoltioEngine` en `lib/sapo-voltio/` que implementa `GameEngine`, escrito desde cero con las reglas del Modelo de datos.
- Entrada `sapo-voltio` en `PLAYABLE_GAMES` (`lib/playable-games.ts`): 800×600, sin precarga de assets.
- Migración `supabase/migrations/<timestamp>_register_sapo_voltio.sql` que inserta `sapo-voltio` en `games`.
- Ranking real en `/games/sapo-voltio` (top 10) y `/salon` (top 12) sin cambios de código: ya es genérico desde SPEC 06.
- HUD React: puntuación, vidas (3 al inicio) y nivel reales. El canvas dibuja el campo, los carriles, el sapo, los nidos y la barra de tiempo de la fila 14.
- Controles: `←` `↑` `→` `↓` y `W` `A` `S` `D` saltan una casilla; `P`/`Escape` pausa; auto-pausa al perder foco.
- Estética: todo vectorial con la paleta neón de la plataforma y `shadowBlur` moderado por grupo.

**Fuera de alcance (para specs futuros):**

- Sprites, sonido, tecla `M`, partículas, temblor de pantalla y rótulo de nivel (GJ-sapo-voltio-02).
- Boyas sumergibles, cable en la mediana, chispa de bonus, vida extra y tiempo por intento variable (GJ-sapo-voltio-03).
- Auth, "TU MEJOR MARCA", mejor marca por jugador.
- Antitrampas, rate limiting, moderación.
- Controles táctiles y swipe.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Registro en `GAMES` (sustituye al de `ranaria`; `best` y `plays` conservan los valores mock actuales):

```ts
{
  id: "sapo-voltio",
  title: "SAPO VOLTIO",
  short: "Cruza la carretera y el río sin convertirte en papilla.",
  long: "Voltio, un sapo de neón, tiene que cruzar cinco carriles de tráfico nocturno y un río de troncos a la deriva hasta sus cinco nidos. Salta casilla a casilla, súbete a los troncos y llega antes de que se agote el tiempo. Cada nivel, el tráfico acelera.",
  cat: "ARCADE",
  cover: "cover-sapo-voltio",
  color: "yellow",
  best: 18900,
  plays: "6.4K",
}
```

Entrada del registro jugable:

```ts
"sapo-voltio": {
  load: async () => {
    const { SapoVoltioEngine } = await import("@/lib/sapo-voltio/engine");
    return (canvas, cb) => new SapoVoltioEngine(canvas, cb);
  },
  width: 800,
  height: 600,
  label: "Juego SAPO VOLTIO",
}
```

Migración:

```sql
insert into public.games (id, title) values ('sapo-voltio', 'SAPO VOLTIO');
```

Estructura de archivos:

- `lib/sapo-voltio/constants.ts` — `W` 800, `H` 600, `CELL` 40, `COLS` 20, `ROWS` 15, `NEST_ROW` 1, `RIVER_ROWS` 2–6, `MEDIAN_ROW` 7, `ROAD_ROWS` 8–12, `START_ROW` 13, `TIMER_ROW` 14, `START_X` 380, `LIVES` 3, `HOP_MS` 80, `DEATH_MS` 800, `ATTEMPT_MS` 30 000, `TRACK_LEN` 1 200, `TRACK_OFFSET` 200, `NEST_CENTERS` [80, 240, 400, 560, 720], `NEST_HALF` 40, `TOAD_HALF` 14, `VEHICLE_INSET` 4, `POINTS_ROW` 10, `POINTS_NEST` 50, `POINTS_SECOND` 10, `POINTS_LEVEL` 1 000, `SPEED_STEP` 0.1, `SPEED_MAX` 2.0, la tabla `LANES` y la paleta `COLORS`.
- `lib/sapo-voltio/utils.ts` — funciones puras: `speedFactor(level)`, `wrapTrack(p)`, `trackToX(p)`, `overlaps(a0, a1, b0, b1)`, `nestIndexAt(x)`, `timeBonus(remainingMs)`.
- `lib/sapo-voltio/input.ts` — clase `Input`: `attach()`/`detach()`, `enabled`, cola de saltos de 1 posición y cola de pulsaciones discretas (`KeyP`, `Escape`), `clear()`.
- `lib/sapo-voltio/entities.ts` — clases `Lane` (objetos del carril, `update(dt, factor)`, `draw(ctx)`), `Toad` (posición lógica, animación de salto, `draw(ctx)` vivo o muerto según `DeathCause`) y `Nests` (5 nidos `filled: boolean[]`, `draw(ctx)`); tipo `DeathCause = "atropello" | "chapuzon" | "arrastre" | "estampado" | "tiempo"`.
- `lib/sapo-voltio/engine.ts` — `SapoVoltioEngine implements GameEngine`: loop, pausa, muerte, nivel, game over, dibujo y emisión de `onChange`.

Tabla `LANES` (fila, zona, dirección, velocidad base en px/s, longitud en casillas, cantidad, color):

| Fila | Zona  | Dir. | Velocidad | Longitud | Cantidad | Objeto  | Color   |
| ---- | ----- | ---- | --------- | -------- | -------- | ------- | ------- |
| 12   | road  | ←    | 60        | 1        | 4        | coche   | cyan    |
| 11   | road  | →    | 90        | 1        | 4        | coche   | magenta |
| 10   | road  | ←    | 120       | 2        | 3        | furgón  | blanco  |
| 9    | road  | →    | 160       | 1        | 3        | moto    | cyan    |
| 8    | road  | ←    | 80        | 3        | 3        | tráiler | magenta |
| 6    | river | →    | 50        | 3        | 4        | tronco  | green   |
| 5    | river | ←    | 70        | 4        | 3        | tronco  | green   |
| 4    | river | →    | 90        | 3        | 4        | tronco  | green   |
| 3    | river | ←    | 60        | 5        | 2        | tronco  | green   |
| 2    | river | →    | 110       | 4        | 3        | tronco  | green   |

Cada carril tiene además una `phase` fija en px (0, 150, 300, 450, 600, 75, 225, 375, 525, 675 de la fila 12 a la 2) para que los huecos no queden alineados.

Reglas de juego:

- El campo es una rejilla de 20×15 casillas de 40 px; la fila de la casilla es `y / 40`.
- Filas: 0 franja decorativa, 1 nidos y muro, 2–6 río, 7 mediana segura, 8–12 carretera, 13 acera de salida, 14 barra de tiempo.
- Cada objeto de carril tiene una posición `p` en una pista circular de 1 200 px; se dibuja en `x = p − 200`. Así entra y sale por los bordes sin aparecer de golpe.
- Los objetos de un carril se reparten cada `1200 / cantidad` px desde `phase` y avanzan a `velocidad × speedFactor(nivel)`.
- `speedFactor(nivel) = min(1 + 0.1 × (nivel − 1), 2.0)`. Llega al máximo en el nivel 11.
- El sapo empieza con el centro en x = 380 y la fila 13. Su `x` es continua en píxeles; su fila es entera.
- Cada pulsación de dirección (sin `event.repeat`) es un salto de una casilla: ±40 px en x o ±1 fila.
- La posición lógica cambia al iniciar el salto; la animación de 80 ms es solo visual. Una pulsación durante el salto se guarda en la cola de 1 posición y se ejecuta al terminar.
- Un salto lateral que dejaría el centro fuera de [20, 780] se ignora. Un salto hacia abajo desde la fila 13 se ignora.
- Carretera: si el hitbox del sapo (centro ±14 px) solapa un vehículo de su fila (recortado 4 px por lado), muere por `atropello`.
- Río: si el centro del sapo no está dentro de ningún tronco de su fila, muere por `chapuzon`. Sobre un tronco, el sapo se desplaza con él cada frame.
- Si el centro del sapo sale de [0, 800] arrastrado por un tronco, muere por `arrastre`.
- Saltar de la fila 2 a la 1 con el centro dentro de un nido libre (`|x − centro| ≤ 40`) lo llena. Un nido ocupado o el muro entre nidos matan por `estampado`.
- Cada intento dura 30 s. Al agotarse el tiempo muere por `tiempo`. El tiempo se reinicia al llenar un nido y al reaparecer.
- Muerte: −1 vida y estado `dead` durante 800 ms, con los carriles en marcha y el teclado ignorado. Después reaparece en (380, 13) o, sin vidas, termina la partida.
- Al llenar el 5.º nido sube el nivel: los nidos se vacían, los carriles conservan su posición y se aplica el nuevo `speedFactor`.

Reglas de puntuación:

- Llegar por primera vez en el intento a una fila más alta (de la 12 a la 2): +10. Máximo 110 por intento.
- Llenar un nido: +50 más `10 × floor(segundos restantes)`. Con 30 s y un cruce mínimo de ≈ 1 s, el bonus de tiempo máximo real es 290.
- Llenar los 5 nidos de un nivel: +1 000.
- Morir no resta puntos.
- Tope teórico por nivel: 5 × (110 + 50 + 290) + 1 000 = **3 250**. Con un promedio de 15 s restantes por nido: 5 × (110 + 50 + 150) + 1 000 = 2 550 por nivel.
- Máximo realista: un experto llega al nivel 20 con el tráfico a ×2,0, unos 20 × 2 550 ≈ **51 000** puntos, muy por debajo de `MAX_SCORE` (10 000 000).
- Llegar a 10 000 000 exigiría más de 3 076 niveles sin perder las 3 vidas, cada uno de al menos 5 s, es decir más de 4 h de juego perfecto. Aun así el motor satura la puntuación en `MAX_SCORE`.

Contrato con el reproductor: `GameSnapshot` con `lives` y `level` numéricos; se usa `dead` durante la animación de muerte; `onChange` solo cuando cambia `score`, `lives`, `level` o `status`.

El motor no usa aleatoriedad: con la misma secuencia de teclas y tiempos, el resultado es el mismo.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

1. **Catálogo y portada.** En `lib/games.ts`, sustituir el registro `ranaria` por el de `sapo-voltio` en la misma posición (8.ª). En `app/globals.css`, renombrar `.cover-rana` a `.cover-sapo-voltio` (regla y `::after`) y cambiar el círculo a `var(--yellow)` y el `drop-shadow` a `rgba(245,255,0,0.5)`. Antes, `Grep` de `ranaria` y `cover-rana` para confirmar que no quedan referencias fuera de specs históricos y de la memoria del planner. Verificación: `/games` muestra la tarjeta SAPO VOLTIO con portada amarilla y no RANARIA; `/games/sapo-voltio` carga; `/games/ranaria` devuelve 404.
2. **Constantes y utilidades.** Crear `lib/sapo-voltio/constants.ts` (incluida `LANES`) y `utils.ts` con las funciones puras del Modelo de datos, sin globals ni DOM. Verificación: `npx tsc --noEmit`.
3. **Entrada.** Crear `lib/sapo-voltio/input.ts`: `keydown` en `window`, registrado en `attach()` y eliminado en `detach()`; `preventDefault` en flechas y Espacio; se ignora `event.repeat` en todas las teclas; flechas y `WASD` entran en la cola de saltos (1 posición, la última pulsación sustituye a la guardada); `P` y `Escape` van a la cola discreta; se ignoran las teclas si `enabled` es falso. Verificación: `tsc`.
4. **Entidades.** Crear `lib/sapo-voltio/entities.ts` con `Lane`, `Toad` y `Nests`. `Lane` dibuja coches, furgones, motos y tráileres como rectángulos redondeados con faros, y troncos como cápsulas verdes con vetas. `Toad` dibuja un sapo amarillo orientado a su último salto; muerto, una mancha aplastada amarilla y magenta (`atropello`, `estampado`, `arrastre`, `tiempo`) o anillos cian que se expanden (`chapuzon`). `Nests` dibuja el muro verde de la fila 1 con 5 huecos y un sapo pequeño en los ocupados. `shadowBlur` moderado, aplicado una vez por grupo. Verificación: `tsc`.
5. **Motor.** Crear `lib/sapo-voltio/engine.ts` con `SapoVoltioEngine implements GameEngine`: `start`, `pause`, `resume`, `restart`, `endGame`, `destroy`; loop con `requestAnimationFrame`; `dt` capado a 50 ms y `lastTime` reiniciado al reanudar; `P`/`Escape` alternan pausa y `resume()` vuelve a `playing` o a `dead` según el estado previo; orden por frame: carriles, arrastre del tronco, colisiones, tiempo; fondo por zonas (río `#00142a` con franjas cian tenues, mediana y acera `#1a0a2a` con bordes magenta discontinuos, carretera `#0a0a18` con líneas blancas discontinuas); barra de tiempo en la fila 14, amarilla y magenta por debajo de 10 s; sin overlays de PAUSA ni GAME OVER; `onChange` solo cuando cambia score, vidas, nivel o estado; `onGameOver(finalScore)` una sola vez desde `setGameOver`, tanto al perder la última vida como con `endGame()`; con la partida terminada el motor ignora el teclado. Verificación: `tsc`.
6. **Registro jugable.** Añadir `sapo-voltio` a `PLAYABLE_GAMES` en `lib/playable-games.ts` con el `load()` del Modelo de datos. Antes, leer la guía de Client Components en `node_modules/next/dist/docs/` si se toca código de Next. Verificación: `/games/sapo-voltio/jugar` carga el juego con el canvas 800×600; `/games/asteroids/jugar`, `/games/tetris/jugar`, `/games/arkanoid/jugar`, `/games/snake/jugar` y `/games/rocas/jugar` siguen igual.
7. **Leaderboard real.** Escribir `supabase/migrations/<timestamp>_register_sapo_voltio.sql` con el `insert` anterior y aplicarla con `apply_migration`. Verificación: `list_migrations` la muestra; `select id, title from public.games` devuelve `asteroids`, `tetris`, `arkanoid`, `snake` y `sapo-voltio`; `get_advisors` (security) sin avisos nuevos.
8. **Ranking visible.** Sin código: comprobar que `/games/sapo-voltio` muestra el panel real con estado vacío y que `/salon` con la pestaña SAPO VOLTIO muestra podio con `—` y tabla vacía. Verificación: no aparece ningún ranking sembrado de RANARIA.
9. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): cruzar la carretera, subir a un tronco, llenar un nido, morir por atropello, por chapuzón y por tiempo, llegar a GAME OVER, guardar y ver la fila en detalle y Salón; limpiar las filas de prueba con `delete from public.scores where game_id = 'sapo-voltio'`.

---

## Criterios de aceptación

- [ ] `GAMES` contiene `sapo-voltio` en la 8.ª posición, sin `ranaria`, y la tarjeta usa `.cover-sapo-voltio`; `.cover-rana` ya no existe en `app/globals.css`.
- [ ] `PLAYABLE_GAMES` tiene la clave `sapo-voltio` con `width: 800`, `height: 600` y `label: "Juego SAPO VOLTIO"`.
- [ ] `SapoVoltioEngine` declara `implements GameEngine` y no usa globals ni `document`/`getElementById`.
- [ ] El motor se carga con `import()` diferido: no está en el bundle de `/games` ni de `/salon`.
- [ ] En `/games/sapo-voltio/jugar` hay un `<canvas>` de 800×600 dentro de `.crt-screen` con `aria-label="Juego SAPO VOLTIO"` y no existe `.game-arena`.
- [ ] El campo muestra los nidos en la fila 1, el río en las filas 2–6, la mediana en la 7, la carretera en las 8–12, la acera en la 13 y la barra de tiempo en la 14.
- [ ] Los 10 carriles tienen la dirección, velocidad base, longitud y cantidad de la tabla `LANES`, y ningún objeto aparece o desaparece de golpe dentro del canvas.
- [ ] `←` `↑` `→` `↓` y `W` `A` `S` `D` mueven el sapo exactamente una casilla por pulsación; mantener la tecla no repite el salto; la página no hace scroll con flechas ni Espacio.
- [ ] Una pulsación durante un salto se ejecuta al terminarlo; dos pulsaciones durante el mismo salto ejecutan solo la última.
- [ ] El sapo no sale por los laterales ni baja de la fila 13.
- [ ] Tocar un vehículo, caer al agua, ser arrastrado fuera del canvas, saltar contra el muro o un nido ocupado y agotar los 30 s restan una vida cada uno.
- [ ] Sobre un tronco el sapo se desplaza con él a su misma velocidad.
- [ ] Tras morir, el sapo reaparece en la acera a los 800 ms con el tiempo a 30 s; durante esos 800 ms el teclado no lo mueve.
- [ ] Subir a una fila nueva en el intento suma exactamente 10 puntos; volver a una fila ya pisada no suma.
- [ ] Llenar un nido suma 50 más 10 por segundo entero restante, y el HUD React lo refleja.
- [ ] Llenar los 5 nidos suma 1 000, sube el nivel en el HUD, vacía los nidos y acelera el tráfico un 10 %, hasta ×2,0 en el nivel 11.
- [ ] El HUD muestra la puntuación, las vidas (3 al inicio) y el nivel real.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" con la puntuación real, una sola vez; FIN lo abre con la puntuación actual.
- [ ] PAUSA, `P` y `Escape` detienen el juego (carriles y tiempo incluidos) y muestran "EN PAUSA"; REANUDAR o la misma tecla lo reanuda sin saltos de los carriles.
- [ ] Pausar durante la animación de muerte y reanudar completa la animación y reaparece el sapo con normalidad.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas, nivel 1, nidos vacíos, carriles en su `phase` inicial y estado de guardado limpio.
- [ ] `games` contiene `sapo-voltio` y la migración aparece en `list_migrations`.
- [ ] GUARDAR con un nombre `^[A-Z0-9_]{3,12}$` crea una fila en `scores` con `game_id = 'sapo-voltio'`, `user_id = NULL` y la puntuación mostrada; la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación guardada aparece en `/games/sapo-voltio` y en `/salon` (pestaña SAPO VOLTIO) sin redeploy.
- [ ] Con 0 filas, `/games/sapo-voltio` y `/salon` muestran el estado vacío y el podio muestra `—` en los puestos sin fila.
- [ ] ASTEROIDS, TETRIS, ARKANOID, SNAKE, `/games/rocas/jugar` y el resto de juegos existentes se comportan exactamente como antes.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos; sin errores en consola en `/games/sapo-voltio`, `/games/sapo-voltio/jugar` ni `/salon`.
- [ ] `references/` no se modifica.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** definición autónoma a partir del tema "Frogger — Cruza la carretera y el río sin convertirte en papilla". El tema pide el género de cruce por carriles; de él salen la carretera con tráfico, el río con troncos, los nidos de meta y la muerte «en papilla» como identidad visual. El juego se llama SAPO VOLTIO y tiene protagonista, carriles, puntuación y estética propios.
- **No:** usar el id o el título `frogger`. Decisión autónoma de game jam: es el nombre de un juego comercial y la game jam no recrea juegos concretos ni renombrados.
- **Sí:** Decisión autónoma de game jam: sustituir el mock RANARIA por `sapo-voltio` en su misma posición (8.ª). RANARIA describe el mismo concepto y no es jugable; mantener ambos dejaría dos juegos de cruce, uno falso. Mismo criterio que SPEC 08, 09 y 10.
- **No:** conservar el id `ranaria`. Decisión autónoma de game jam: el planner lo tiene como idea propuesta; un id nuevo marca que es un diseño propio de la jam y no el mock.
- **Sí:** Decisión autónoma de game jam: categoría `ARCADE`. Es el género natural del cruce por carriles. Será el 3.er ARCADE real junto a ARKANOID y SNAKE, pero ni PUZZLE ni SHOOTER describen el juego.
- **Sí:** Decisión autónoma de game jam: color `yellow`. Ningún juego real es amarillo (hoy hay dos cyan, un magenta y un green) y el sapo de neón amarillo da identidad.
- **No:** mantener el `green` del mock. Dejaría el catálogo jugable sin amarillo y con dos verdes.
- **Sí:** Decisión autónoma de game jam: reutilizar `.cover-rana` renombrada a `.cover-sapo-voltio`, con el círculo y el glow en amarillo. Sus franjas ya evocan carriles; basta con cambiar el color para que coincida con `color: "yellow"`.
- **Sí:** Decisión autónoma de game jam: `short` y `long` nuevos y `best`/`plays` mock conservados. El `short` es la frase del tema. `best` (18 900) es alcanzable (nivel 7–8) y sigue mock hasta el spec de catálogo desde BD.
- **Sí:** Decisión autónoma de game jam: rejilla 20×15 de 40 px en 800×600. Es la misma de SNAKE, 4:3 sin escalado, y deja 10 carriles jugables más nidos, mediana, acera y barra de tiempo.
- **Sí:** Decisión autónoma de game jam: `x` continua y fila entera. Los troncos arrastran al sapo de forma suave; los saltos siguen siendo de una casilla.
- **No:** `x` ajustada a la rejilla tras cada frame en un tronco. Haría que el sapo «patinase» a saltos sobre el tronco.
- **Sí:** Decisión autónoma de game jam: un salto por pulsación, sin autorepetición, y cola de 1 salto. El cruce exige precisión; la cola evita perder una pulsación rápida sin permitir ráfagas.
- **Sí:** Decisión autónoma de game jam: posición lógica inmediata al iniciar el salto y animación de 80 ms solo visual. Las colisiones son predecibles y no hay estados intermedios «en el aire».
- **Sí:** Decisión autónoma de game jam: pista circular de 1 200 px dibujada desde x = −200. El objeto más largo mide 200 px, así que nunca aparece ni desaparece dentro del canvas.
- **Sí:** Decisión autónoma de game jam: motor determinista, sin `Math.random`. Las `phase` fijas bastan para la variedad y permiten comprobar la equivalencia de puntuación en GJ-sapo-voltio-02.
- **Sí:** Decisión autónoma de game jam: 3 vidas, niveles infinitos y velocidad ×1,1 por nivel hasta ×2,0. Encaja con el HUD de vidas y nivel y da una curva de dificultad sin tabla de niveles; los niveles con contenido nuevo van en GJ-sapo-voltio-03.
- **Sí:** Decisión autónoma de game jam: 30 s por intento con la barra de tiempo dibujada en la fila 14. El tiempo no cabe en el HUD React (solo puntuación, vidas y nivel) y es información de juego, no un overlay.
- **Sí:** Decisión autónoma de game jam: puntos por fila nueva (10), nido (50), bonus de tiempo (10/s) y nivel (1 000). Premia avanzar, llegar rápido y completar niveles; la fila nueva por intento impide sumar yendo y viniendo.
- **No:** restar puntos al morir. Ya se pierde una vida y el bonus de tiempo del intento.
- **Sí:** Decisión autónoma de game jam: el estado `dead` durante los 800 ms de muerte, con `pausedFrom` como ASTEROIDS. El contrato lo permite y el jugador ve qué le mató antes de reaparecer.
- **Sí:** Decisión autónoma de game jam: saturar la puntuación en `MAX_SCORE`. El máximo realista (≈ 51 000) no se acerca, pero los niveles son infinitos y el guardado rechazaría un valor mayor.
- **Sí:** sin cambio de esquema: la puntuación máxima realista (≈ 51 000) cabe de sobra en `MAX_SCORE` (10 000 000).
- **Sí:** Decisión autónoma de game jam: todo vectorial y sin sonido en este spec. Así el juego es jugable y verificable antes de crear assets; los sprites SVG y el audio van en GJ-sapo-voltio-02.
- **Sí:** flechas + `WASD`, `P`/`Escape` para pausa y `preventDefault` en flechas y Espacio. Es el contrato de controles de la plataforma.
- **No:** swipe táctil. Los controles táctiles quedan fuera de todos los juegos hasta su propio spec.
- **Sí:** migración de registro propia (`insert` en `games`) sin tocar tablas, políticas ni tipos generados. SPEC 06 ya dejó el flujo genérico.

---

## Riesgos identificados

| Riesgo                                                                       | Mitigación                                                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners             | `GameCanvas` crea el motor en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners.                                          |
| Flechas/Espacio hacen scroll o activan el botón con foco                     | `preventDefault` en esas teclas; los botones hacen `blur()` tras el click.                                                                    |
| Pausa desincronizada entre el botón React y `P`/`Escape`                     | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él.                                                                |
| Pausar en `dead` y reanudar en `playing` salta la animación o la reaparición | `pausedFrom` guarda `playing` o `dead` y `resume()` vuelve a ese estado, como en ASTEROIDS.                                                   |
| Callbacks en cada frame provocan re-renders excesivos                        | `onChange` solo cuando cambia score, vidas, nivel o estado; el tiempo restante no se emite.                                                   |
| Salto de `dt` al volver de una pestaña oculta o al reanudar                  | `dt` capado a 50 ms y `lastTime` reiniciado al reanudar.                                                                                      |
| Un vehículo rápido atraviesa al sapo entre dos frames                        | A ×2,0 la moto va a 320 px/s: ≤ 16 px por frame con `dt` de 50 ms, menos que el hitbox de 28 px más el vehículo.                              |
| Muerte injusta en el borde de un tronco                                      | La regla usa el centro del sapo dentro del tronco, sin hitbox; se comprueba con captura en el cierre.                                         |
| Huecos imposibles en el río a velocidad alta                                 | Todos los carriles de río tienen al menos 33 % de cobertura y la mediana es segura; revisar en el cierre que el nivel 11 es cruzable.         |
| Doble `onGameOver` (última muerte y `endGame()` en el mismo frame)           | Se emite desde un único punto (`setGameOver`), no-op si el estado ya es `gameover`.                                                           |
| Con el modal de fin abierto, las teclas siguen moviendo el sapo              | El motor ignora el teclado en `gameover` (`enabled = false`); `Input.clear()` al pausar, al morir y al terminar.                              |
| `shadowBlur` caro en equipos lentos                                          | Glow moderado, aplicado una vez por grupo (vehículos, troncos, sapo, nidos) y no por objeto.                                                  |
| Entradas antiguas con `game: "ranaria"` en `localStorage["av_scores"]`       | Los datos son locales; `getGame("ranaria")` devuelve `undefined`. Comprobar en el cierre que home y Salón no fallan con una entrada huérfana. |
| `games.id` no existe y la FK rechaza el guardado                             | La migración de registro es un paso del plan y un criterio de aceptación.                                                                     |
| Puntuación máxima supera `MAX_SCORE`                                         | Máximo realista ≈ 51 000; el motor satura en `MAX_SCORE` por si los niveles infinitos se alargan.                                             |
| Carrera en la carga diferida del motor                                       | Ya cubierta por `GameCanvas` (SPEC 07); no se replica lógica de carga en el juego.                                                            |
| Cualquiera puede insertar puntuaciones falsas                                | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06.                                                       |
| APIs distintas en Next 16 / React 19.3                                       | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.                                                 |

---

## Qué **no** entra en este spec

- Sprites, sonido, tecla `M`, partículas, temblor y rótulo de nivel (GJ-sapo-voltio-02).
- Boyas sumergibles, cable en la mediana, chispa de bonus, vida extra y tiempo por intento variable (GJ-sapo-voltio-03).
- Cambios en otros juegos, incluidos ASTEROIDS, TETRIS, ARKANOID, SNAKE y ROCAS.
- Supabase Auth, "TU MEJOR MARCA" y mejor marca por jugador.
- Antitrampas, rate limiting y moderación.
- Catálogo, `best` y `plays` leídos de la BD.
- Controles táctiles y swipe.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
