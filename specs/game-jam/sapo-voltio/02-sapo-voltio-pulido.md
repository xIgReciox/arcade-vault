# SPEC GJ-sapo-voltio-02 — SAPO VOLTIO: sprites, sonido y efectos

> **Status:** Borrador
> **Depends on:** SPEC GJ-sapo-voltio-01, SPEC 09, SPEC 10
> **Date:** 2026-11-23
> **Objective:** Dar a SAPO VOLTIO sprites SVG propios precargados, sonido sintetizado con tecla `M` y efectos visuales, sin cambiar sus reglas ni su puntuación.

---

## Por qué existe este spec

GJ-sapo-voltio-01 deja el juego jugable y con ranking real, pero todo dibujado con formas vectoriales simples y en silencio. Este spec aporta el acabado: sprites del sapo, los vehículos, los troncos y los nidos; sonido para saltos, muertes, nidos y niveles; partículas de «papilla» y salpicadura; y ajustes de feel como el estiramiento del salto y el temblor de pantalla.

No hay assets de referencia en `references/source-assets/`, así que los sprites son SVG originales escritos a mano y el sonido se sintetiza con Web Audio API. La carga sigue el patrón de ARKANOID (SPEC 09) y SNAKE (SPEC 10): `load()` precarga y nunca rechaza, y cada asset ausente cae al dibujo vectorial de 01.

---

## Alcance

**Dentro:**

- 12 sprites SVG en `public/games/sapo-voltio/`, cargados con rutas `/games/sapo-voltio/...` y precargados en `load()`.
- `lib/sapo-voltio/assets.ts` con `loadSapoVoltioAssets()`, que nunca rechaza: un SVG que falla o tarda más de 5 s queda en `null`.
- Dibujo con sprites en `Lane`, `Toad` y `Nests`; si el sprite es `null`, se usa el dibujo vectorial de GJ-sapo-voltio-01.
- `lib/sapo-voltio/audio.ts` con la clase `Sfx`: 7 efectos sintetizados con Web Audio API, sin archivos de audio.
- Tecla `M` para silenciar y reactivar; con el sonido apagado, el canvas muestra `SONIDO OFF` en la fila 0.
- Sin autoplay: el `AudioContext` se crea en la primera pulsación del jugador.
- `lib/sapo-voltio/particles.ts` con `ParticlePool` (máximo 160 partículas) y 4 emisores: papilla, salpicadura, nido y nivel.
- Feel: estiramiento y aplastamiento del sapo en el salto, temblor de pantalla de 200 ms en atropello y estampado, franjas del río en movimiento, faros con degradado, pulso de la barra de tiempo por debajo de 5 s y rótulo `NIVEL N` de 900 ms al subir de nivel.
- Respeto de `prefers-reduced-motion: reduce`: sin temblor ni pulso.
- Entrada `sapo-voltio` de `PLAYABLE_GAMES` actualizada para precargar los assets.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio de reglas, tiempos o puntuación (las cifras de GJ-sapo-voltio-01 no cambian).
- Sprites y sonidos de boyas, cable y chispa (GJ-sapo-voltio-03).
- Música de fondo.
- Control de sonido global de la plataforma (mute persistente, volumen, ajustes por juego).
- Cambios en `GamePlayer`, `GameCanvas` o el contrato `GameEngine`.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Entrada del registro jugable (sustituye a la de GJ-sapo-voltio-01):

```ts
"sapo-voltio": {
  load: async () => {
    // Precarga los SVG; nunca rechaza (un sprite que falla queda en null y se dibuja en vector).
    const { loadSapoVoltioAssets } = await import("@/lib/sapo-voltio/assets");
    const assets = await loadSapoVoltioAssets();
    const { SapoVoltioEngine } = await import("@/lib/sapo-voltio/engine");
    return (canvas, cb) => new SapoVoltioEngine(canvas, cb, assets);
  },
  width: 800,
  height: 600,
  label: "Juego SAPO VOLTIO",
}
```

Sprites en `public/games/sapo-voltio/` (todos miran a la izquierda o hacia arriba; el motor los espeja o rota):

| Archivo              | Tamaño | Uso                                                    |
| -------------------- | ------ | ------------------------------------------------------ |
| `sapo.svg`           | 40×40  | Sapo en reposo, mirando arriba                         |
| `sapo-salto.svg`     | 40×40  | Sapo durante el salto, patas estiradas                 |
| `papilla.svg`        | 40×40  | Mancha aplastada amarilla y magenta                    |
| `coche-cian.svg`     | 40×40  | Fila 12                                                |
| `coche-magenta.svg`  | 40×40  | Fila 11                                                |
| `furgon.svg`         | 80×40  | Fila 10                                                |
| `moto.svg`           | 40×40  | Fila 9                                                 |
| `trailer.svg`        | 120×40 | Fila 8                                                 |
| `tronco-extremo.svg` | 40×40  | Extremo izquierdo del tronco; espejado para el derecho |
| `tronco-centro.svg`  | 40×40  | Tramo central, repetido `longitud − 2` veces           |
| `nido.svg`           | 80×40  | Nido libre                                             |
| `nido-ocupado.svg`   | 80×40  | Nido con sapo                                          |

Estructura de archivos nuevos o modificados:

- `lib/sapo-voltio/assets.ts` — tipo `SapoVoltioAssets` (un campo `HTMLImageElement | null` por sprite: `toad`, `toadHop`, `splat`, `carCyan`, `carMagenta`, `van`, `bike`, `trailer`, `logEnd`, `logMid`, `nest`, `nestFilled`) y `loadSapoVoltioAssets()`, con `ASSET_TIMEOUT_MS` 5 000 por imagen.
- `lib/sapo-voltio/audio.ts` — clase `Sfx`: `unlock()`, `play(name)`, `toggleMute()`, `muted`, `destroy()`; tipo `SfxName = "hop" | "splat" | "splash" | "nest" | "level" | "tick" | "gameover"`.
- `lib/sapo-voltio/particles.ts` — clase `ParticlePool` (`emit(kind, x, y)`, `update(dt)`, `draw(ctx)`, `clear()`), `MAX_PARTICLES` 160.
- `lib/sapo-voltio/constants.ts` — se **añaden** `ASSET_BASE` `/games/sapo-voltio`, `SHAKE_MS` 200, `SHAKE_PX` 4, `LEVEL_BANNER_MS` 900, `TICK_FROM_MS` 5 000, `WATER_SCROLL` 20 px/s, `SFX_GAIN` 0.25. No se modifica ningún valor existente.
- `lib/sapo-voltio/input.ts` — se añade `KeyM` a la cola discreta y el callback `onFirstKey` para desbloquear el audio.
- `lib/sapo-voltio/entities.ts` — `draw(ctx, assets)` en `Lane`, `Toad` y `Nests`, con respaldo vectorial.
- `lib/sapo-voltio/engine.ts` — recibe `assets`, crea `Sfx` y `ParticlePool`, aplica temblor, rótulo y pulso.

Efectos de sonido (síntesis con `OscillatorNode` y `AudioBufferSourceNode`, ganancia maestra 0.25):

| `SfxName`  | Evento                         | Síntesis                                          |
| ---------- | ------------------------------ | ------------------------------------------------- |
| `hop`      | Cada salto                     | Cuadrada 660 → 880 Hz, 60 ms                      |
| `splat`    | `atropello`, `estampado`       | Ruido blanco con paso bajo 1 200 Hz, 250 ms       |
| `splash`   | `chapuzon`, `arrastre`         | Seno 600 → 150 Hz, 300 ms                         |
| `nest`     | Llenar un nido                 | Triangular 523, 659 y 784 Hz, 80 ms cada nota     |
| `level`    | Subir de nivel                 | Triangular 523, 659, 784, 1 047 y 1 319 Hz, 70 ms |
| `tick`     | Cada segundo por debajo de 5 s | Cuadrada 1 000 Hz, 30 ms                          |
| `gameover` | Perder la última vida o FIN    | Seno 392 → 98 Hz, 700 ms                          |

La muerte por `tiempo` usa `splat`.

Partículas (sin `shadowBlur`, con `globalCompositeOperation = "lighter"`):

- `papilla`: 24 partículas amarillas y magenta, 600 ms, en atropello, estampado y tiempo.
- `salpicadura`: 18 partículas cian, 500 ms, en chapuzón y arrastre.
- `nido`: 16 chispas amarillas, 500 ms, al llenar un nido.
- `nivel`: 40 partículas de los 4 colores de la plataforma, 900 ms, al subir de nivel.

Reglas de juego y puntuación: **sin cambios** respecto a GJ-sapo-voltio-01. Mismas filas, carriles, tiempos, puntos y máximo realista (≈ 51 000). Los efectos no alteran la posición lógica del sapo ni el reloj de la partida.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores`, `av_player_name` ni en la tabla `games`.

---

## Plan de implementación

1. **Sprites SVG.** Crear los 12 SVG de la tabla en `public/games/sapo-voltio/`, escritos a mano con la paleta de la plataforma (`#f5ff00`, `#ff006e`, `#00f5ff`, `#00ff88`, blanco) y `viewBox` igual a su tamaño. Verificación: `/games/sapo-voltio/sapo.svg` y `/games/sapo-voltio/trailer.svg` responden 200 y se ven en el navegador.
2. **Carga de assets.** Crear `lib/sapo-voltio/assets.ts` con `loadSapoVoltioAssets()`: un `Image` por SVG, `onload` resuelve la imagen y `onerror` o el timeout de 5 s resuelven `null` con `console.warn`; la promesa conjunta nunca rechaza. Verificación: `npx tsc --noEmit`.
3. **Dibujo con sprites.** Cambiar `draw` de `Lane`, `Toad` y `Nests` a `draw(ctx, assets)`: vehículos con `drawImage` espejado según la dirección, troncos como extremo + centros + extremo espejado, sapo rotado según su último salto y con `sapo-salto.svg` durante los 80 ms del salto, `papilla.svg` al morir aplastado, nidos con `nido.svg` y `nido-ocupado.svg`. Con el sprite `null`, el dibujo vectorial de GJ-sapo-voltio-01. Verificación: `tsc`.
4. **Registro jugable.** Sustituir la entrada `sapo-voltio` de `PLAYABLE_GAMES` por la del Modelo de datos y pasar `assets` al constructor de `SapoVoltioEngine`. Verificación: `/games/sapo-voltio/jugar` muestra los sprites; `/games/snake/jugar` y `/games/arkanoid/jugar` siguen igual.
5. **Audio.** Crear `lib/sapo-voltio/audio.ts` con `Sfx`: `unlock()` crea el `AudioContext` (o lo reanuda si está `suspended`); `play()` no hace nada sin contexto o en mute; cada efecto crea sus nodos, los conecta a la ganancia maestra y los libera en `onended`; `destroy()` llama a `close()`. Verificación: `tsc`.
6. **Entrada y mute.** En `lib/sapo-voltio/input.ts`, añadir `KeyM` (ignora `event.repeat`) y llamar a `onFirstKey` en la primera pulsación. En el motor, `onFirstKey` llama a `sfx.unlock()`, `M` llama a `sfx.toggleMute()` y, en mute, se dibuja `SONIDO OFF` en la esquina derecha de la fila 0. El mute se conserva tras `restart()`. Verificación: en `/games/sapo-voltio/jugar`, `M` alterna `SONIDO OFF`.
7. **Sonidos de juego.** Llamar a `sfx.play()` en salto, muerte (según `DeathCause`), nido, nivel, cada segundo por debajo de 5 s y game over. Ningún sonido se reproduce en pausa. Verificación: jugar y oír cada efecto; la consola no muestra avisos de autoplay.
8. **Partículas.** Crear `lib/sapo-voltio/particles.ts` con `ParticlePool` y los 4 emisores; el motor las actualiza en `playing` y `dead`, las dibuja tras las entidades y las vacía en `restart()`. Si el pool está lleno, las partículas nuevas se descartan. Verificación: `tsc`; morir atropellado y en el agua muestra papilla y salpicadura.
9. **Feel.** En el motor: escala vertical 1,15 a mitad de salto y aplastamiento 0,85 en los 60 ms siguientes; temblor de ±4 px durante 200 ms en `atropello` y `estampado`; franjas del río desplazándose a 20 px/s; faros con `createLinearGradient` delante de cada vehículo; pulso de la barra de tiempo por debajo de 5 s; rótulo `NIVEL N` centrado en la mediana durante 900 ms al subir de nivel. Con `matchMedia("(prefers-reduced-motion: reduce)")` activo, sin temblor ni pulso. Verificación: comprobar cada efecto con capturas.
10. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): jugar con sonido, silenciar con `M`, morir de las 5 formas, llenar un nivel, renombrar temporalmente un SVG para provocar un 404 y comprobar el respaldo vectorial; repetir una misma secuencia de cruce en 01 y en 02 y comparar la puntuación; guardar una partida y limpiar las filas de prueba con `delete from public.scores where game_id = 'sapo-voltio'`.

---

## Criterios de aceptación

- [ ] Existen los 12 SVG de la tabla en `public/games/sapo-voltio/` y todas sus rutas `/games/sapo-voltio/...` responden 200.
- [ ] `loadSapoVoltioAssets()` nunca rechaza: con un SVG en 404, `/games/sapo-voltio/jugar` carga y ese elemento se dibuja en vector, sin excepciones no controladas.
- [ ] Vehículos, troncos, sapo y nidos se dibujan con sus sprites; los vehículos miran en la dirección de su carril.
- [ ] Un tronco de longitud 3, 4 o 5 se compone de dos extremos y 1, 2 o 3 tramos centrales, sin huecos visibles.
- [ ] El sapo se dibuja rotado hacia su último salto y usa `sapo-salto.svg` durante el salto.
- [ ] No suena nada antes de la primera tecla del jugador y la consola no muestra avisos de autoplay.
- [ ] Saltar, morir aplastado, caer al agua, llenar un nido, subir de nivel y terminar la partida reproducen su efecto de la tabla.
- [ ] Por debajo de 5 s de tiempo suena un `tick` por segundo y la barra de tiempo pulsa.
- [ ] `M` silencia todos los efectos y muestra `SONIDO OFF` en la fila 0; `M` de nuevo los reactiva y quita el texto.
- [ ] El mute se conserva tras JUGAR DE NUEVO.
- [ ] En pausa no suena ningún efecto ni avanzan las partículas.
- [ ] Morir atropellado muestra 24 partículas de papilla; caer al agua muestra 18 de salpicadura; llenar un nido, 16 chispas; subir de nivel, 40 partículas y el rótulo `NIVEL N` durante 900 ms.
- [ ] Nunca hay más de 160 partículas activas.
- [ ] Atropello y estampado hacen temblar la pantalla 200 ms; con `prefers-reduced-motion: reduce` no hay temblor ni pulso.
- [ ] La misma secuencia de cruce da la misma puntuación en GJ-sapo-voltio-01 y en este spec.
- [ ] `constants.ts` conserva todos los valores de GJ-sapo-voltio-01 sin cambios.
- [ ] Navegar fuera del reproductor cierra el `AudioContext` y no deja `requestAnimationFrame` ni listeners activos.
- [ ] El juego mantiene 60 fps en la captura de rendimiento de Chrome con el máximo de partículas y el glow activo.
- [ ] HUD, pausa, FIN, modal "FIN DEL JUEGO" y guardado en `scores` funcionan exactamente como en GJ-sapo-voltio-01.
- [ ] ASTEROIDS, TETRIS, ARKANOID, SNAKE, `/games/rocas/jugar` y el resto de juegos se comportan exactamente como antes.
- [ ] Sin errores en consola en `/games/sapo-voltio`, `/games/sapo-voltio/jugar` ni `/salon`.
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** Decisión autónoma de game jam: sprites SVG originales escritos a mano. No hay assets de referencia para este juego y un SVG es texto, revisable en el diff y nítido a cualquier escala del `.crt-screen`.
- **No:** PNG generados con herramientas externas o assets descargados. Añaden dependencias o dudas de licencia que la game jam no puede resolver sola.
- **Sí:** Decisión autónoma de game jam: un archivo por sprite en lugar de un atlas. Con 12 sprites pequeños, los recortes de un atlas SVG no ahorran nada y complican el mantenimiento.
- **Sí:** Decisión autónoma de game jam: sonido sintetizado con Web Audio API, sin archivos. No hay audio de referencia; la síntesis da un sonido chiptune coherente y elimina los 404 de audio.
- **No:** archivos mp3 como ARKANOID. Habría que crearlos o descargarlos, con el mismo problema que los PNG.
- **Sí:** Decisión autónoma de game jam: `AudioContext` creado en la primera tecla del jugador. Es la condición de los navegadores para permitir audio y evita cualquier autoplay.
- **Sí:** tecla `M` para silenciar, con el estado solo en el motor y conservado tras `restart()`. Mismo criterio que ARKANOID; un jugador que silencia no quiere volver a hacerlo en cada partida.
- **No:** mute persistente en `localStorage` o control global de volumen. Es un spec de plataforma.
- **Sí:** Decisión autónoma de game jam: `SONIDO OFF` visible siempre en la fila 0 mientras dure el mute. La fila 0 no es jugable y así el jugador sabe por qué no oye nada.
- **Sí:** Decisión autónoma de game jam: timeout de 5 s por imagen en la precarga. Un SVG que nunca responde no debe dejar el reproductor cargando para siempre.
- **Sí:** Decisión autónoma de game jam: partículas sin `shadowBlur`, con mezcla aditiva y tope de 160. El glow por partícula es el mayor coste de dibujo; la mezcla aditiva da brillo sin ese coste.
- **Sí:** Decisión autónoma de game jam: rótulo `NIVEL N` de 900 ms dibujado en el canvas. No es un overlay de PAUSA ni de GAME OVER y no detiene el juego; marca el cambio de nivel sin tocar React.
- **Sí:** Decisión autónoma de game jam: temblor y pulso desactivados con `prefers-reduced-motion: reduce`. Son efectos puramente decorativos y pueden molestar.
- **Sí:** Decisión autónoma de game jam: el estiramiento del salto y el temblor son solo visuales. La posición lógica y las colisiones de GJ-sapo-voltio-01 no cambian, así que la puntuación es la misma.
- **No:** alargar el salto o añadir inercia para mejorar el feel. Cambiaría la dificultad y la equivalencia de puntuación con 01.
- **Sí:** sin cambio de esquema ni de `MAX_SCORE`: este spec no cambia la puntuación.

---

## Riesgos identificados

| Riesgo                                                    | Mitigación                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Un SVG devuelve 404 o tarda en cargar                     | `loadSapoVoltioAssets()` nunca rechaza; timeout de 5 s; respaldo vectorial de 01; rutas verificadas en el cierre.         |
| SVG sin `width`/`height` se dibuja a 0×0 o borroso        | Cada SVG declara `width`, `height` y `viewBox` iguales a su tamaño de la tabla.                                           |
| Autoplay bloqueado o aviso en consola                     | El `AudioContext` se crea en `unlock()`, llamado desde la primera tecla; `play()` sin contexto no hace nada.              |
| Fugas de audio: nodos acumulados o contexto vivo al salir | Cada efecto libera sus nodos en `onended`; `destroy()` cierra el `AudioContext`.                                          |
| Strict Mode crea dos `AudioContext`                       | El contexto se crea en la primera tecla, no en el constructor; el motor desmontado lo cierra en `destroy()`.              |
| `tick` repetido varias veces en el mismo segundo          | Se emite al cambiar `floor(segundos restantes)`, no en cada frame.                                                        |
| `shadowBlur` caro con sprites, partículas y glow          | Glow por grupo, nunca por partícula; tope de 160 partículas; captura de rendimiento en el cierre.                         |
| El temblor desplaza el dibujo y parece una colisión falsa | El temblor aplica un `translate` solo al dibujo; la lógica no lo ve.                                                      |
| La puntuación cambia sin querer al tocar el motor         | `constants.ts` solo recibe valores nuevos; la comparación de una misma secuencia en 01 y 02 es un criterio de aceptación. |
| Partículas o sonidos siguen tras el modal de fin          | En `gameover` el motor no emite partículas nuevas ni sonidos salvo `gameover`; `restart()` vacía el pool.                 |
| APIs distintas en Next 16 / React 19.3                    | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.                             |

---

## Qué **no** entra en este spec

- Cambios de reglas, tiempos o puntuación.
- Boyas sumergibles, cable, chispa, vida extra y sus sprites y sonidos (GJ-sapo-voltio-03).
- Música de fondo.
- Control de sonido global de la plataforma (mute persistente, volumen).
- Cambios en `GamePlayer`, `GameCanvas` o el contrato `GameEngine`.
- Cambios en otros juegos.
- Controles táctiles.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
