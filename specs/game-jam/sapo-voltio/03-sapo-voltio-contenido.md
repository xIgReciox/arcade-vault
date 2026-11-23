# SPEC GJ-sapo-voltio-03 — SAPO VOLTIO: boyas, cable, chispa y progresión por niveles

> **Status:** Borrador
> **Depends on:** SPEC GJ-sapo-voltio-01, SPEC GJ-sapo-voltio-02
> **Date:** 2026-11-23
> **Objective:** Añadir a SAPO VOLTIO contenido que se desbloquea por nivel (chispa de bonus, boyas sumergibles, cable en la mediana, menos tiempo por intento) y una vida extra a los 10 000 puntos, recalculando su puntuación máxima.

---

## Por qué existe este spec

Tras GJ-sapo-voltio-01 y GJ-sapo-voltio-02, la única progresión de SAPO VOLTIO es que el tráfico acelera un 10 % por nivel. A partir del nivel 4 el juego se vuelve repetitivo: mismos carriles, mismos riesgos y ningún objetivo opcional. Este spec es **completo** y añade cuatro novedades que entran una a una por nivel, para que cada nivel enseñe algo nuevo antes de mezclarlo todo.

Es el único spec de la jam que cambia la puntuación: la chispa suma 200 puntos y el tiempo por intento baja. Por eso recalcula el máximo realista frente a `MAX_SCORE`.

---

## Alcance

**Dentro:**

- `lib/sapo-voltio/levels.ts` con `levelFeatures(level)`, que decide qué contenido está activo en cada nivel.
- Chispa de bonus (nivel 2+): aparece en un nido libre durante 5 s cada 10 s; llenar ese nido mientras está suma 200 puntos.
- Boyas voltio (nivel 3+): los carriles de río de las filas 4 y 2 pasan de troncos a cadenas de boyas que se sumergen de forma cíclica.
- Tiempo por intento variable: 30 s en los niveles 1–3, 25 s en los 4–6 y 20 s del 7 en adelante.
- Cable en la mediana (nivel 5+): un cable eléctrico de 2 casillas recorre la fila 7 de lado a lado y mata al tocarlo.
- Vida extra al llegar a 10 000 puntos, una vez por partida.
- Nueva causa de muerte `cable`.
- 4 sprites SVG nuevos, 3 efectos de sonido nuevos y 1 emisor de partículas nuevo, con el mismo patrón de carga y respaldo de GJ-sapo-voltio-02.

**Fuera de alcance (para specs futuros):**

- Modos de juego alternativos (contrarreloj, sin vidas, dos jugadores).
- Tabla de niveles diseñada a mano carril por carril.
- Enemigos en el río, nidos trampa y otras mecánicas no listadas.
- Selector de nivel inicial.
- Cambiar el `long` del catálogo para describir el contenido nuevo.
- Control de sonido global de la plataforma.
- Cambios en `GamePlayer`, `GameCanvas`, el contrato `GameEngine` o el esquema de Supabase.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Contenido por nivel (`levelFeatures(level)` devuelve `{ spark, buoys, cable, attemptMs }`):

| Nivel | Chispa | Boyas (filas 4 y 2) | Cable (fila 7) | Tiempo por intento |
| ----- | ------ | ------------------- | -------------- | ------------------ |
| 1     | No     | No                  | No             | 30 s               |
| 2     | Sí     | No                  | No             | 30 s               |
| 3     | Sí     | Sí                  | No             | 30 s               |
| 4     | Sí     | Sí                  | No             | 25 s               |
| 5–6   | Sí     | Sí                  | Sí             | 25 s               |
| 7+    | Sí     | Sí                  | Sí             | 20 s               |

El `speedFactor(nivel)` de GJ-sapo-voltio-01 se mantiene: ×1,1 por nivel hasta ×2,0 en el nivel 11.

Estructura de archivos nuevos o modificados:

- `lib/sapo-voltio/levels.ts` — tipo `LevelFeatures` y función pura `levelFeatures(level)` con la tabla anterior.
- `lib/sapo-voltio/constants.ts` — se **añaden** `SPARK_EVERY_MS` 10 000, `SPARK_MS` 5 000, `SPARK_ORDER` [2, 0, 4, 1, 3], `POINTS_SPARK` 200, `BUOY_ROWS` [4, 2], `BUOY_CYCLE_MS` 5 000, `BUOY_UP_MS` 3 000, `BUOY_BLINK_MS` 600, `BUOY_PHASE_MS` 1 250, `CABLE_LEN` 80, `CABLE_SPEED` 70, `CABLE_INSET` 6, `EXTRA_LIFE_AT` 10 000. `ATTEMPT_MS` deja de usarse y lo sustituye `levelFeatures(level).attemptMs`.
- `lib/sapo-voltio/entities.ts` — `Lane` gana `kind: "log" | "buoy"` y `isSolid(objIndex, buoyClock)`; clase nueva `Cable` (`update(dt, factor)`, `hits(toad)`, `draw(ctx, assets)`); `Nests` gana `sparkIndex: number | null`; `DeathCause` añade `"cable"`.
- `lib/sapo-voltio/engine.ts` — reloj de boyas, temporizador de chispa, cable, vida extra y tiempo por nivel.
- `lib/sapo-voltio/assets.ts` — campos nuevos `buoy`, `buoyOff`, `cable`, `spark`.
- `lib/sapo-voltio/audio.ts` — `SfxName` añade `"zap" | "spark" | "extra"`.
- `lib/sapo-voltio/particles.ts` — emisor nuevo `chispazo`.

Sprites nuevos en `public/games/sapo-voltio/`:

| Archivo            | Tamaño | Uso                                         |
| ------------------ | ------ | ------------------------------------------- |
| `boya.svg`         | 40×40  | Boya a flote, encendida                     |
| `boya-apagada.svg` | 40×40  | Boya en parpadeo o sumergida (con alfa 0,3) |
| `cable.svg`        | 80×40  | Cable eléctrico de la mediana               |
| `chispa.svg`       | 40×40  | Chispa de bonus dentro de un nido           |

Sonidos nuevos (síntesis, misma ganancia maestra de GJ-sapo-voltio-02):

| `SfxName` | Evento                    | Síntesis                                     |
| --------- | ------------------------- | -------------------------------------------- |
| `zap`     | Muerte por `cable`        | Diente de sierra 120 Hz con vibrato, 200 ms  |
| `spark`   | Llenar el nido con chispa | Cuadrada 1 319 y 1 568 Hz, 60 ms cada nota   |
| `extra`   | Vida extra                | Triangular 784, 988, 1 175 y 1 568 Hz, 60 ms |

Partículas nuevas: `chispazo`, 20 partículas cian y blancas, 400 ms, en la muerte por `cable`. El tope de 160 partículas se mantiene.

Reglas nuevas de juego:

- **Boyas.** Desde el nivel 3, las filas 4 y 2 conservan dirección, velocidad, longitud, cantidad y posición, pero sus objetos son cadenas de boyas.
- Cada cadena sigue un ciclo de 5 000 ms: 3 000 ms a flote, 600 ms parpadeando (sigue siendo sólida) y 1 400 ms sumergida (no sólida).
- La cadena `i` de un carril empieza su ciclo desplazada `i × 1 250` ms, para que nunca se hundan todas a la vez.
- Estar sobre una cadena sumergida es `chapuzon`, igual que estar en el agua.
- El reloj de boyas avanza en `playing` y `dead`, se detiene en pausa y vuelve a 0 en `restart()`.
- **Chispa.** Desde el nivel 2, 10 s después de empezar el nivel (o de desaparecer la anterior), la chispa aparece en el primer nido libre de la secuencia 2, 0, 4, 1, 3, empezando tras el último usado.
- La chispa dura 5 s y desaparece. Llenar su nido mientras está suma 200 puntos además de lo normal.
- Solo hay una chispa a la vez. Si no queda nido libre, no aparece.
- **Cable.** Desde el nivel 5, un cable de 80 px recorre la fila 7 a `70 × speedFactor(nivel)` px/s, rebotando entre x = 0 y x = 720. Empieza en x = 0 hacia la derecha.
- Si el hitbox del sapo (centro ±14 px) solapa el cable recortado 6 px por lado, muere por `cable`.
- **Tiempo.** Cada intento dura `levelFeatures(level).attemptMs`. La barra de tiempo se dibuja en proporción a ese valor.
- **Vida extra.** Al alcanzar 10 000 puntos por primera vez en la partida, +1 vida. No hay más vidas extra.

Reglas de puntuación (cambian respecto a GJ-sapo-voltio-01):

- Fila nueva: +10. Nido: +50 más `10 × floor(segundos restantes)`. Nivel completo: +1 000. Sin cambios.
- Chispa: **+200** al llenar el nido que la tiene.
- Tope teórico por nivel con las 5 chispas y un cruce de ≈ 1 s:
  - Nivel 1: 5 × (110 + 50 + 290) + 1 000 = 3 250.
  - Niveles 2–3: 5 × (110 + 50 + 290 + 200) + 1 000 = 4 250.
  - Niveles 4–6: 5 × (110 + 50 + 240 + 200) + 1 000 = 4 000.
  - Niveles 7+: 5 × (110 + 50 + 190 + 200) + 1 000 = 3 750.
- Promedio realista por nivel: la mitad del tiempo restante y 2 chispas por nivel, unos 2 700 puntos.
- Máximo realista: un experto llega al nivel 25 con la vida extra, unos 25 × 2 750 ≈ **69 000** puntos, muy por debajo de `MAX_SCORE` (10 000 000).
- Llegar a 10 000 000 exigiría más de 2 353 niveles con el tope de 4 250, cada uno de al menos 5 s. El motor sigue saturando en `MAX_SCORE`.

Contrato con el reproductor: sin cambios. `lives` puede valer 4 tras la vida extra.

Sin cambios en `Game`, `GAMES`, `PLAYABLE_GAMES`, `ScoreRow`, `SavedScore`, `scores`, `games`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

1. **Tabla de niveles.** Crear `lib/sapo-voltio/levels.ts` con `levelFeatures(level)` y añadir a `constants.ts` las constantes nuevas. El motor usa `levelFeatures(level).attemptMs` en lugar de `ATTEMPT_MS`. Verificación: `npx tsc --noEmit`; en el nivel 4 la barra de tiempo empieza en 25 s.
2. **Chispa.** Añadir `sparkIndex` a `Nests` y el temporizador de chispa al motor con `SPARK_EVERY_MS`, `SPARK_MS` y `SPARK_ORDER`; sumar `POINTS_SPARK` al llenar ese nido; dibujar la chispa en vector (rombo amarillo con glow) si `assets.spark` es `null`. Verificación: en el nivel 2 aparece una chispa a los 10 s y llenar su nido suma 200 puntos extra.
3. **Boyas.** Añadir `kind` e `isSolid()` a `Lane`; al entrar en el nivel 3 las filas 4 y 2 pasan a `buoy`; el reloj de boyas se actualiza en el motor y la comprobación de río usa `isSolid()`. Dibujo en vector: círculos cian que se apagan al parpadear y quedan al 30 % de alfa sumergidos. Verificación: en el nivel 3 quedarse sobre una boya sumergida resta una vida.
4. **Cable.** Crear `Cable` en `entities.ts`, activarlo al entrar en el nivel 5 y añadir `cable` a `DeathCause`. Dibujo en vector: línea magenta en zigzag con glow. Verificación: en el nivel 5 tocar el cable en la mediana resta una vida.
5. **Vida extra.** En el motor, al cruzar 10 000 puntos por primera vez, +1 vida y `onChange`. Verificación: el HUD pasa de 3 a 4 vidas al llegar a 10 000 si no se ha muerto.
6. **Assets, sonido y partículas.** Crear `boya.svg`, `boya-apagada.svg`, `cable.svg` y `chispa.svg` en `public/games/sapo-voltio/`; añadirlos a `loadSapoVoltioAssets()`; añadir `zap`, `spark` y `extra` a `Sfx` y el emisor `chispazo` a `ParticlePool`. La muerte por `cable` usa `zap`, `chispazo` y el temblor de 200 ms. Verificación: las 4 rutas nuevas responden 200 y cada sonido suena en su evento.
7. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`) llegando al nivel 5 con una constante temporal de depuración que no se confirma (o jugando): chispa, boyas, cable, vida extra y tiempo de 25 s; repetir una partida del nivel 1 y comprobar que puntúa igual que en GJ-sapo-voltio-02; guardar una partida y limpiar las filas de prueba con `delete from public.scores where game_id = 'sapo-voltio'`.

---

## Criterios de aceptación

- [ ] `levelFeatures(level)` devuelve la tabla de contenido por nivel para los niveles 1 a 12.
- [ ] El nivel 1 se juega y puntúa exactamente igual que en GJ-sapo-voltio-02.
- [ ] Desde el nivel 2, una chispa aparece 10 s después de empezar el nivel en el primer nido libre de la secuencia 2, 0, 4, 1, 3, y desaparece a los 5 s.
- [ ] Llenar el nido con chispa suma 200 puntos además de los 50 y el bonus de tiempo, y suena `spark`.
- [ ] Nunca hay dos chispas a la vez ni una chispa en un nido ocupado.
- [ ] Desde el nivel 3, las filas 4 y 2 muestran cadenas de boyas con la misma posición, longitud, cantidad y velocidad que sus troncos.
- [ ] Cada cadena pasa 3 000 ms a flote, 600 ms parpadeando y 1 400 ms sumergida; dos cadenas consecutivas del mismo carril están desfasadas 1 250 ms.
- [ ] Estar sobre una boya parpadeando no mata; estar sobre una boya sumergida mata por `chapuzon`.
- [ ] En pausa las boyas no cambian de estado.
- [ ] El tiempo por intento es 30 s en los niveles 1–3, 25 s en los 4–6 y 20 s desde el 7, y la barra de tiempo empieza llena en cada caso.
- [ ] Desde el nivel 5, un cable de 80 px recorre la fila 7 entre x = 0 y x = 720 a 70 px/s por el `speedFactor` del nivel; tocarlo resta una vida con `zap`, `chispazo` y temblor.
- [ ] Al llegar a 10 000 puntos por primera vez, el HUD suma una vida y suena `extra`; volver a cruzar 10 000 no da otra.
- [ ] Con un sprite nuevo en 404, el elemento se dibuja en vector y el juego no lanza excepciones.
- [ ] Las rutas `/games/sapo-voltio/boya.svg`, `boya-apagada.svg`, `cable.svg` y `chispa.svg` responden 200.
- [ ] JUGAR DE NUEVO vuelve al nivel 1 sin chispa, boyas ni cable, con 3 vidas, la vida extra disponible de nuevo y el reloj de boyas a 0.
- [ ] Ninguna puntuación de prueba supera el tope teórico por nivel de la tabla de puntuación.
- [ ] HUD, pausa, FIN, modal "FIN DEL JUEGO" y guardado en `scores` funcionan exactamente como en GJ-sapo-voltio-02.
- [ ] ASTEROIDS, TETRIS, ARKANOID, SNAKE, `/games/rocas/jugar` y el resto de juegos se comportan exactamente como antes.
- [ ] No queda ninguna constante temporal de depuración en el código.
- [ ] Sin errores en consola en `/games/sapo-voltio`, `/games/sapo-voltio/jugar` ni `/salon`.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** Decisión autónoma de game jam: spec completo y no esbozo. El contenido es acotado (cuatro novedades y una vida extra) y todas las cifras se pueden fijar ya.
- **Sí:** Decisión autónoma de game jam: contenido que se desbloquea de uno en uno (niveles 2, 3, 4 y 5). El jugador aprende cada riesgo por separado antes de que se combinen.
- **No:** Decisión autónoma de game jam: una tabla de niveles diseñada carril por carril. Multiplica las cifras a revisar y rompe la continuidad de posiciones de GJ-sapo-voltio-01; `levelFeatures` más `speedFactor` da variedad suficiente.
- **Sí:** Decisión autónoma de game jam: las boyas reutilizan posición, longitud y cantidad de los troncos de su fila. La cobertura del río no cambia y el riesgo nuevo es solo el hundimiento.
- **Sí:** Decisión autónoma de game jam: parpadeo de 600 ms aún sólido antes de hundirse. Avisa al jugador y evita muertes que parecen injustas.
- **Sí:** Decisión autónoma de game jam: chispa en una secuencia fija de nidos (2, 0, 4, 1, 3) en lugar de al azar. Mantiene el motor determinista, como en GJ-sapo-voltio-01, y es justa para el ranking.
- **Sí:** Decisión autónoma de game jam: +200 por chispa. Es un objetivo opcional que compensa el desvío y el riesgo sin dominar el bonus de nivel (1 000).
- **Sí:** Decisión autónoma de game jam: tiempo por intento 30 / 25 / 20 s. Sube la presión a la vez que baja el bonus de tiempo máximo, así que el tope por nivel baja en lugar de dispararse.
- **Sí:** Decisión autónoma de game jam: el cable a partir del nivel 5 en la mediana. La mediana es el único descanso seguro; quitarlo antes haría los primeros niveles demasiado duros.
- **Sí:** Decisión autónoma de game jam: una sola vida extra, a los 10 000 puntos. Premia llegar a mitad de partida (nivel 4–5) sin alargar indefinidamente las partidas.
- **No:** vidas extra cada 10 000 puntos. Con niveles infinitos haría las partidas eternas para un buen jugador.
- **Sí:** recalcular la puntuación: el máximo realista pasa de ≈ 51 000 a ≈ 69 000 y el tope teórico por nivel a 4 250. Sigue muy por debajo de `MAX_SCORE` (10 000 000), así que no hay cambio de esquema.
- **No:** Decisión autónoma de game jam: actualizar el `long` del catálogo. El texto actual sigue siendo cierto y cambiar copy de catálogo no es contenido de juego.
- **Sí:** sprites SVG y sonido sintetizado nuevos con el mismo patrón y respaldo vectorial de GJ-sapo-voltio-02. Un asset ausente no rompe el juego.

---

## Riesgos identificados

| Riesgo                                                              | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Las boyas hacen imposible cruzar las filas 4 y 2 a velocidad alta   | Desfase de 1 250 ms entre cadenas: como mucho 2 cadenas de un carril están sumergidas a la vez, y solo durante 150 ms; revisar el nivel 11. |
| Muerte injusta al hundirse una boya justo al saltar a ella          | Parpadeo de 600 ms aún sólido y sprite apagado como aviso.                                                                                  |
| El cable deja la mediana sin refugio                                | El cable mide 2 de 20 casillas y rebota; siempre hay 18 casillas libres en la fila 7.                                                       |
| Doble vida extra por cruzar 10 000 varias veces                     | Bandera `extraLifeGiven` que solo `restart()` reinicia.                                                                                     |
| La chispa aparece en un nido ocupado o justo al llenarse el nivel   | Solo se elige entre nidos libres; al subir de nivel se cancela y su temporizador vuelve a 10 s.                                             |
| La puntuación de nivel 1 cambia sin querer                          | `levelFeatures(1)` no activa nada y `attemptMs` es 30 000; la equivalencia con GJ-sapo-voltio-02 es un criterio.                            |
| Una constante de depuración para saltar de nivel llega a producción | Criterio de aceptación explícito y revisión del diff en el cierre.                                                                          |
| Puntuación máxima supera `MAX_SCORE`                                | Máximo realista ≈ 69 000 y tope de 4 250 por nivel; el motor sigue saturando en `MAX_SCORE`.                                                |
| Assets nuevos con 404                                               | Mismo cargador que nunca rechaza y respaldo vectorial de cada elemento nuevo.                                                               |
| Cualquiera puede insertar puntuaciones falsas                       | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06.                                                     |

---

## Qué **no** entra en este spec

- Modos de juego alternativos y selector de nivel inicial.
- Tabla de niveles carril por carril, enemigos en el río y nidos trampa.
- Cambios en el copy del catálogo.
- Control de sonido global de la plataforma.
- Cambios en `GamePlayer`, `GameCanvas`, el contrato `GameEngine` o el esquema de Supabase.
- Cambios en otros juegos.
- Controles táctiles.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
