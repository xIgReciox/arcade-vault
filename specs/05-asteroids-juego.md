# SPEC 05 — Juego ASTEROIDS jugable en el reproductor

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-18
> **Objective:** Añadir ASTEROIDS como juego nuevo del catálogo, portando `references/started-games/02-asteroids/game.js` a TypeScript y haciéndolo jugable en `/games/asteroids/jugar` dentro del reproductor existente.

---

## Por qué existe este spec

Hoy el reproductor (`components/game-player.tsx`) solo muestra una arena decorativa con puntuación simulada. Ya tenemos un Asteroids completo en canvas vanilla (`references/started-games/02-asteroids`), con globals y listeners en `window`. Este spec lo convierte en el primer juego real de la plataforma, encapsulado para montarse y desmontarse limpio en React, y conectado al HUD y al modal de fin de juego que ya existen.

---

## Alcance

**Dentro:**

- Juego nuevo en `GAMES` (`lib/games.ts`), en **primera posición**: id `asteroids`, título `ASTEROIDS`, categoría `SHOOTER`, portada nueva `.cover-asteroids`, `best`/`plays` mock.
- Port a TypeScript en `lib/asteroids/` del gameplay completo del original: nave con inercia y wrap toroidal, balas, asteroides de 3 tamaños que se parten, partículas, power-up de triple disparo (15 % + garantizado a las 5 bajas, 1 por nivel), 3 vidas con invencibilidad de 3 s al reaparecer, niveles (`3 + nivel` asteroides).
- Motor encapsulado (`AsteroidsEngine`) con `start()`, `pause()`, `resume()`, `restart()`, `destroy()`; sin globals; los listeners se quitan en `destroy()`.
- Componente cliente `components/games/asteroids-canvas.tsx` que monta el motor en un `<canvas>` interno de 800×600, escalado al 100 % de `.crt-screen` (4:3).
- `GamePlayer` usa ese canvas **solo** cuando `game.id === "asteroids"`; los demás juegos siguen con la arena decorativa y la puntuación simulada.
- HUD React (puntuación, vidas, nivel) alimentado por el motor vía callback; el indicador de triple disparo (`3x  N.Ns`) se dibuja en el canvas.
- Estilo neón: nave cian, asteroides amarillos, balas blancas, power-up magenta, partículas en color del objeto, con `shadowBlur` como glow.
- Controles: `←` `→` rotar, `↑` propulsar, `Espacio` disparar, `P`/`Escape` alternan pausa (igual que el botón PAUSA). Pausa automática al perder foco la pestaña (`visibilitychange`/`blur`). `preventDefault` en flechas y espacio para no hacer scroll.
- GAME OVER: el motor avisa y se abre el modal "FIN DEL JUEGO" existente con la puntuación real; GUARDAR escribe en `av_scores` como hoy; JUGAR DE NUEVO llama a `restart()`. El botón FIN termina la partida y abre el modal con la puntuación actual.

**Fuera de alcance (para specs futuros):**

- Cambios en ROCAS (sigue mock con su portada actual).
- Rankings reales: detalle y Salón siguen con `seededScores`; leer `av_scores` o Supabase va en otro spec.
- Controles táctiles / soporte móvil jugable.
- Sonido, OVNIs u otras mecánicas no presentes en `game.js`.
- Cambiar el gameplay (velocidades, puntos, radios, tiempos) respecto al original.
- Refactor del reproductor a un sistema genérico de juegos (registro/plugin); solo una rama para `asteroids`.
- Tests automatizados.

---

## Modelo de datos

Nuevo registro en `GAMES` (`lib/games.ts`), primera posición:

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Destruye asteroides en un espacio sin bordes.",
  long: "Pilota una nave vectorial en un campo de asteroides donde los bordes se conectan. Rota, propulsa y dispara: las rocas grandes se parten en medianas y las medianas en pequeñas. Recoge el power-up 3x para disparo triple.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 32150,
  plays: "1.2K",
}
```

Contrato del motor (`lib/asteroids/engine.ts`):

```ts
export type AsteroidsStatus = "playing" | "dead" | "paused" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  status: AsteroidsStatus;
}

export interface AsteroidsCallbacks {
  onChange: (s: AsteroidsSnapshot) => void; // solo cuando cambia score/lives/level/status
  onGameOver: (finalScore: number) => void;
}

export class AsteroidsEngine {
  constructor(canvas: HTMLCanvasElement, callbacks: AsteroidsCallbacks);
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  endGame(): void; // usado por el botón FIN
  destroy(): void; // cancela rAF y quita listeners
}
```

Estructura de archivos:

- `lib/asteroids/constants.ts` — `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, constantes de power-up y colores neón.
- `lib/asteroids/utils.ts` — `wrap`, `dist`, `rand`, `randInt`.
- `lib/asteroids/input.ts` — clase `Input` (`keys`, `justPressed`, `pressed()`, `attach()`/`detach()`).
- `lib/asteroids/entities.ts` — `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` (cada una con `update(dt)` y `draw(ctx)`).
- `lib/asteroids/engine.ts` — `AsteroidsEngine` (estado, colisiones, niveles, HUD de canvas, loop con `dt` capado a 50 ms).

Se usa `lib/asteroids/` y no `lib/games/` para no chocar con `lib/games.ts`. `SavedScore` y `av_scores` no cambian (`game: "asteroids"`).

---

## Plan de implementación

1. **Catálogo y portada.** Añadir el registro `asteroids` al inicio de `GAMES` y la clase `.cover-asteroids` en `app/globals.css` (nave triangular cian + rocas poligonales en CSS, mismo estilo que el resto de `cover-*`). Verificación: `/games` muestra 9 tarjetas, ASTEROIDS primera; `/games/asteroids` carga con ranking mock; el chip SHOOTER muestra ASTEROIDS, INVASORES y ROCAS.
2. **Utilidades y constantes.** Crear `lib/asteroids/constants.ts` y `utils.ts` copiando valores del original. Verificación: `npx tsc --noEmit` pasa.
3. **Entrada.** Crear `lib/asteroids/input.ts` con listeners en `window` registrados en `attach()` y eliminados en `detach()`; `preventDefault` para flechas y espacio. Verificación: `tsc` pasa.
4. **Entidades.** Portar las 5 clases a `lib/asteroids/entities.ts`, recibiendo `ctx` en `draw(ctx)` y aplicando colores neón + glow. Verificación: `tsc` pasa.
5. **Motor.** Crear `lib/asteroids/engine.ts` con `AsteroidsEngine`: lógica de `update`/`draw` del original, sin el overlay de GAME OVER ni el reinicio con Espacio; emite `onChange` y `onGameOver`; `P`/`Escape` alternan pausa; el texto "EN PAUSA" no lo dibuja el canvas sino el overlay React existente. Verificación: `tsc` pasa.
6. **Componente canvas.** Crear `components/games/asteroids-canvas.tsx` (`"use client"`): crea el motor en `useEffect`, lo destruye en el cleanup (seguro en Strict Mode), expone control por props (`paused`, `restartKey`, `ended`) y escucha `visibilitychange`/`blur` para pausar. Canvas `width=800 height=600` con CSS `width:100%;height:100%`. Verificación: `tsc` pasa.
7. **Integración en el reproductor.** En `components/game-player.tsx`, si `game.id === "asteroids"`: renderizar `AsteroidsCanvas` en lugar de `.game-arena`, desactivar el intervalo simulado, tomar score/vidas/nivel del motor, abrir el modal en `onGameOver`, FIN → `endGame()`, JUGAR DE NUEVO → `restart()`, y sincronizar la pausa por teclado con el estado `paused` (overlay "EN PAUSA" existente). Verificación: `/games/asteroids/jugar` es jugable; `/games/rocas/jugar` sigue igual que antes.
8. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`). Verificación: los tres pasan y los criterios de aceptación se cumplen.

---

## Criterios de aceptación

- [ ] `GAMES[0].id === "asteroids"` y `GAMES` tiene 9 juegos; ROCAS conserva sus datos actuales.
- [ ] `/games` muestra la tarjeta ASTEROIDS con la portada `.cover-asteroids`; el chip SHOOTER muestra 3 juegos.
- [ ] La home muestra ASTEROIDS como primera mini-tarjeta y el Salón lo tiene como tab por defecto.
- [ ] `/games/asteroids` carga con 10 filas de ranking mock; "JUGAR AHORA" lleva a `/games/asteroids/jugar`.
- [ ] En `/games/asteroids/jugar` hay un `<canvas>` 800×600 dentro de `.crt-screen` y no existe `.game-arena`.
- [ ] Las flechas rotan/propulsan la nave y Espacio dispara; la página no hace scroll al pulsarlas.
- [ ] Destruir un asteroide grande/mediano/pequeño suma 20/50/100 y el HUD React lo refleja.
- [ ] Al chocar, el HUD de vidas baja en 1 y la nave reaparece parpadeando ~3 s.
- [ ] Al vaciar el campo, el nivel del HUD sube y aparecen `3 + nivel` asteroides grandes.
- [ ] El power-up 3x aparece como máximo una vez por nivel y activa disparo triple 5 s con indicador en el canvas.
- [ ] PAUSA, `P` y `Escape` detienen el juego y muestran "EN PAUSA"; REANUDAR / la misma tecla lo reanudan.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] Con 0 vidas se abre el modal "FIN DEL JUEGO" con la puntuación real; GUARDAR añade `{ game: "asteroids", ... }` a `av_scores`.
- [ ] FIN abre el modal con la puntuación actual; JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas, nivel 1.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos (sin errores en consola; las flechas ya no hacen nada en otras páginas salvo su comportamiento normal).
- [ ] `/games/rocas/jugar` y el resto de juegos se comportan exactamente como antes.
- [ ] No hay errores en la consola del navegador en `/games/asteroids/jugar`.
- [ ] `references/started-games/02-asteroids/` no se modifica.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** ASTEROIDS como juego nuevo (`asteroids`). Decisión del usuario; ROCAS queda intacto como mock.
- **No:** reutilizar el registro de ROCAS.
- **Sí:** port a TypeScript modular en `lib/asteroids/` con motor encapsulado. Sin globals y con `destroy()`, el juego se monta/desmonta bien con App Router y Strict Mode.
- **No:** cargar `game.js` tal cual desde `/public`. Globals, sin tipos y listeners que sobreviven a la navegación.
- **Sí:** reutilizar HUD, pausa y modal de `GamePlayer`. Mantiene la experiencia homogénea con el resto de la plataforma.
- **No:** overlay GAME OVER del canvas con reinicio por Espacio. Lo sustituye el modal.
- **Sí:** guardar en `av_scores` (localStorage). Es el mecanismo actual; Supabase llega en su propio spec.
- **No:** tabla de puntuaciones en Supabase ahora. Abre tablas, RLS y auth.
- **Sí:** estilo neón con los colores de la plataforma, mismo gameplay.
- **No:** blanco original.
- **Sí:** primera posición en `GAMES`, para destacar el primer juego real en home y Salón.
- **Sí:** ranking y `best`/`plays` mock. Coherente con los demás juegos hasta el spec de rankings reales.
- **Sí:** teclado + `P`/`Escape` + auto-pausa al perder foco.
- **No:** controles táctiles. Amplían el alcance; spec propio si se necesita.
- **Sí:** rama `game.id === "asteroids"` en `GamePlayer`. Suficiente para un único juego real.
- **No:** sistema genérico de registro de juegos todavía. Se diseña cuando llegue el segundo juego real.
- **Sí:** resolución interna fija 800×600 escalada por CSS. Coincide con el 4:3 de `.crt-screen` y conserva la física original.

---

## Riesgos identificados

| Riesgo                                                           | Mitigación                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners | El motor se crea en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners.                   |
| Flechas/Espacio hacen scroll o activan el botón con foco         | `preventDefault` en esas teclas mientras el motor está activo; quitar el foco de los botones tras pulsarlos. |
| Espacio activa un botón del HUD o del modal en vez de disparar   | El motor ignora teclas con el modal abierto; los botones hacen `blur()` tras el click.                       |
| Pausa desincronizada entre el botón React y `P`/`Escape`         | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él para ASTEROIDS.                |
| Callbacks en cada frame provocan re-renders excesivos            | `onChange` solo se emite cuando cambia score, vidas, nivel o estado.                                         |
| Salto de `dt` al volver de una pestaña oculta                    | `dt` capado a 50 ms y `lastTime` se reinicia al reanudar.                                                    |
| `shadowBlur` caro en equipos lentos                              | Glow moderado y aplicado por grupo de entidades, no por partícula.                                           |
| APIs distintas en Next 16 / React 19.3                           | Leer la guía de Client Components en `node_modules/next/dist/docs/` antes del paso 6.                        |

---

## Qué **no** entra en este spec

- Cambios en ROCAS.
- Rankings reales (av_scores en pantallas o Supabase).
- Controles táctiles.
- Sonido y mecánicas nuevas.
- Sistema genérico de juegos.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
