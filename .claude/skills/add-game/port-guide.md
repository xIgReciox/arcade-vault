# Guía de port: canvas vanilla → motor encapsulado

Referencia para el inventario de la Fase 2 y para redactar el plan de implementación. Modelo a imitar: `lib/asteroids/` (SPEC 05) y su `AsteroidsEngine`.

## Inventario del juego original

Antes de preguntar, lee `game.js` (y `index.html`, `style.css`, `levels.js`, `assets/`) y anota:

| Pregunta                                                         | Dónde mirar                             |
| ---------------------------------------------------------------- | --------------------------------------- |
| Tamaño del canvas y proporción (¿4:3?)                           | `<canvas width height>` en `index.html` |
| Estado global (`let`/`var` a nivel de archivo)                   | Cabecera de `game.js`                   |
| Listeners (`keydown`, `keyup`, `click`, `resize`, `blur`)        | `addEventListener`                      |
| Loop (`requestAnimationFrame` o `setInterval`) y cálculo de `dt` | `loop(`, `update(`, `draw(`             |
| Overlays propios (PAUSA, GAME OVER, menú, "pulsa una tecla")     | `#overlay`, textos dibujados en canvas  |
| HUD en el DOM (`#score`, `#lines`, `#level`, vidas)              | `getElementById`, `textContent`         |
| Varios canvas (p. ej. "siguiente pieza")                         | `index.html`                            |
| Persistencia propia (`localStorage` de high score)               | `localStorage`                          |
| Assets (`Image`, `Audio`, spritesheets)                          | `assets/`, `new Image`, `new Audio`     |
| Puntuación: eventos y valores                                    | donde se hace `score +=`                |
| Vidas, niveles, condición de fin                                 | `lives`, `level`, `gameOver`            |
| Aleatoriedad y temporizadores                                    | `Math.random`, `setTimeout`, contadores |

El resultado alimenta el spec: criterios de puntuación exactos, resolución, HUD, assets y riesgos.

## Reglas de conversión

1. **Globals → campos de clase.** Todo estado de módulo pasa a propiedades privadas de `<Engine>`. Nada en `window`.
2. **Listeners → `Input`.** Una clase `Input` en `lib/<id>/input.ts` con `attach()`/`detach()`; el motor llama a `attach()` en `start()` y a `detach()` en `destroy()`. Teclas del juego con `preventDefault`. Ignora las teclas si la partida terminó.
3. **Loop.** `requestAnimationFrame` guardando el id; `destroy()` hace `cancelAnimationFrame` y `detach()`. `dt = min(ts - last, 50)` y `last` se reinicia al reanudar.
4. **Pausa.** `P` y `Escape` alternan pausa dentro del motor. `pause()`/`resume()` son no-ops si ya están en ese estado. El texto "EN PAUSA" **no** se dibuja: lo pone el overlay React de `GamePlayer`.
5. **Fin de partida.** Se elimina el overlay GAME OVER y el reinicio por tecla. El motor llama **una vez** a `onGameOver(score)` y pasa a `gameover`. `endGame()` hace lo mismo bajo demanda (botón FIN) y es no-op si ya terminó. `restart()` deja todo a cero.
6. **HUD.** Lo que el original escribe en el DOM pasa a `onChange({ score, lives, level, status })`. Se emite solo si cambia alguno de los cuatro campos. Juego sin vidas o sin niveles: `null`.
7. **Un solo canvas.** Si el original usa varios (siguiente pieza, panel lateral), se dibujan en el mismo canvas dentro de una región reservada. La resolución interna debe caber en 4:3 (o se añaden bandas dibujadas dentro del canvas).
8. **Persistencia propia.** Se elimina el high score en `localStorage` del original: la fuente de verdad es Supabase.
9. **Assets.** Copiar a `public/games/<id>/` y cargar con rutas absolutas `/games/<id>/...`. Precargar en el constructor o en un `init()` asíncrono y no arrancar el loop hasta que estén listos. Audio solo tras interacción del usuario; si no se decidió incluir sonido, se omite.
10. **Colores.** Paleta neón de la plataforma: cian, magenta, amarillo, verde y blanco sobre fondo oscuro transparente o `#05050f`-like; `shadowBlur` moderado aplicado por grupo, no por elemento.
11. **Sin cambios de gameplay.** Velocidades, puntos, radios y tiempos se copian tal cual. Cualquier excepción se decide en la fase de preguntas y queda en "Decisiones".
12. **Tipos estrictos.** `strict` de TypeScript, sin `any`. Constantes en `constants.ts`, utilidades puras en `utils.ts`.

## Estructura de archivos

```
lib/<id>/
  constants.ts   // tamaños, velocidades, puntos, colores
  utils.ts       // funciones puras (clamp, rand, colisiones…)
  input.ts       // clase Input con attach()/detach()
  entities.ts    // clases con update(dt) y draw(ctx)   (o rules.ts para juegos de cuadrícula)
  engine.ts      // <Engine> implements GameEngine
```

Se usa `lib/<id>/` y no `lib/games/` para no chocar con `lib/games.ts`.

## Notas por juego de referencia

- **02-asteroids**: ya portado (SPEC 05).
- **03-tetris**: canvas del tablero 300×600 (1:2) + canvas "next" 120×120 + HUD en DOM; overlay compartido PAUSA/GAME OVER. Tarea de resolución: componer tablero, panel lateral y HUD de líneas en un único canvas 4:3. Vidas: `null`. Nivel: sí.
- **04-arkanoid**: canvas 800×600 (ya 4:3), `levels.js` con 5 niveles, spritesheet y 2 sonidos, overlays propios. Decidir assets y sonido en la fase de preguntas.
