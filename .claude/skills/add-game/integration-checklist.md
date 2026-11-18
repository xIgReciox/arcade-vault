# Checklist de integración (receta fija de SPEC 05 + 06 + 07)

Todo spec generado por `/add-game` debe incluir **estos pasos, criterios y riesgos**, adaptados al juego. Sustituye `<id>` por el id del juego y `<Engine>` por el nombre de su clase.

## Pasos del plan de implementación

Cada paso deja el sistema funcional. Orden fijo:

1. **Catálogo y portada.** Añadir (o actualizar, si sustituye a un mock) el registro en `GAMES` de `lib/games.ts` en la posición acordada, y la clase `.cover-<id>` en `app/globals.css` (mismo estilo que los `cover-*` existentes) o reutilizar la del mock sustituido. Verificación: `/games` muestra la tarjeta; `/games/<id>` carga.
2. **Constantes y utilidades.** Crear `lib/<id>/constants.ts` y `utils.ts` copiando valores del original (sin cambiar gameplay). Verificación: `npx tsc --noEmit`.
3. **Entrada.** Crear `lib/<id>/input.ts` con listeners en `window` registrados en `attach()` y eliminados en `detach()`; `preventDefault` en flechas y Espacio. Verificación: `tsc`.
4. **Entidades.** Portar entidades a `lib/<id>/entities.ts` con `update(dt)` y `draw(ctx)`; colores neón de la plataforma y `shadowBlur` moderado. Verificación: `tsc`. (Si el juego es una cuadrícula sin entidades, este paso se llama "Estado y reglas" y vive en `lib/<id>/rules.ts`.)
5. **Motor.** Crear `lib/<id>/engine.ts` con `<Engine> implements GameEngine` (de `lib/game-engine.ts`): `start`, `pause`, `resume`, `restart`, `endGame`, `destroy`; `dt` capado a 50 ms; `P`/`Escape` alternan pausa; sin overlays de PAUSA ni GAME OVER (los pone React); `onChange` solo cuando cambia score, vidas, nivel o estado; `onGameOver(finalScore)` una sola vez. Verificación: `tsc`.
6. **Registro jugable.** Añadir la entrada `<id>` a `PLAYABLE_GAMES` en `lib/playable-games.ts` (`load` con `import()` diferido, `width`, `height`, `label`). Verificación: `/games/<id>/jugar` carga el juego; `/games/rocas/jugar` (mock) sigue igual.
7. **Leaderboard real.** Migración `supabase/migrations/<timestamp>_register_<id>.sql` con `insert into public.games (id, title) values ('<id>', '<TÍTULO>');`, aplicada con `apply_migration`. No hay cambios de esquema ni de tipos (`database.types.ts` no cambia, salvo que se haya decidido cambiar `MAX_SCORE`). Verificación: `list_migrations` la muestra; `select * from games` incluye `<id>`; `get_advisors` (security) sin avisos nuevos.
8. **Ranking visible.** Sin código: comprobar que `/games/<id>` muestra el panel real (estado vacío con 0 filas) y que `/salon` con la pestaña `<id>` muestra podio y tabla reales. Si hay un mock sustituido con ranking sembrado, comprobar que ya no aparece.
9. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`): jugar, llegar a GAME OVER, guardar y ver la fila en detalle y Salón; limpiar las filas de prueba de `scores` con `execute_sql` (`delete ... where game_id = '<id>'`).

Si el juego usa assets (imágenes, sonido): añade un paso entre 5 y 6 que los copie a `public/games/<id>/` y los cargue con rutas `/games/<id>/...`. El motor los precarga antes de `start()`.

## Criterios de aceptación estándar

- [ ] `GAMES` contiene `<id>` (posición acordada) y la tarjeta usa `.cover-<id>`.
- [ ] `PLAYABLE_GAMES` tiene la clave `<id>` con `width`, `height` y `label`.
- [ ] `<Engine>` declara `implements GameEngine` y no usa globals.
- [ ] En `/games/<id>/jugar` hay un `<canvas>` de `<width>×<height>` dentro de `.crt-screen` y no existe `.game-arena`.
- [ ] Los controles del juego funcionan y la página no hace scroll con flechas ni Espacio.
- [ ] Las reglas de puntuación coinciden con el original: <lista concreta de eventos y puntos>.
- [ ] PAUSA, `P` y `Escape` detienen el juego y muestran "EN PAUSA"; REANUDAR o la misma tecla lo reanudan.
- [ ] Cambiar de pestaña pausa el juego automáticamente.
- [ ] El HUD refleja puntuación en tiempo real, y vidas y nivel (o `—` si el juego no los tiene).
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación real; FIN lo abre con la puntuación actual.
- [ ] JUGAR DE NUEVO reinicia el juego y el estado de guardado.
- [ ] `games` contiene la fila `<id>` y la migración aparece en `list_migrations`.
- [ ] GUARDAR con un nombre `^[A-Z0-9_]{3,12}$` crea una fila en `scores` con `game_id = '<id>'`, `user_id = NULL` y la puntuación mostrada; la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación guardada aparece en `/games/<id>` y en `/salon` (pestaña `<id>`) sin redeploy.
- [ ] Con 0 filas, `/games/<id>` y `/salon` muestran el estado vacío; el podio muestra `—` en los puestos sin fila.
- [ ] ASTEROIDS, `/games/rocas/jugar` y el resto de juegos existentes se comportan exactamente como antes.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos; sin errores en consola en `/games/<id>`, `/games/<id>/jugar` ni `/salon`.
- [ ] `references/started-games/<carpeta>/` no se modifica (si el juego viene de referencia).
- [ ] Las filas de prueba se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Riesgos estándar (incluir los que apliquen)

| Riesgo                                                           | Mitigación                                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Strict Mode monta/desmonta dos veces y duplica loops o listeners | `GameCanvas` crea el motor en `useEffect` y `destroy()` en el cleanup cancela rAF y quita listeners.     |
| Flechas/Espacio hacen scroll o activan el botón con foco         | `preventDefault` en esas teclas; los botones hacen `blur()` tras el click.                               |
| Pausa desincronizada entre el botón React y `P`/`Escape`         | El motor reporta `status` por `onChange` y `GamePlayer` deriva `paused` de él.                           |
| Callbacks en cada frame provocan re-renders excesivos            | `onChange` solo se emite cuando cambia score, vidas, nivel o estado.                                     |
| Salto de `dt` al volver de una pestaña oculta                    | `dt` capado a 50 ms y `lastTime` se reinicia al reanudar.                                                |
| `shadowBlur` caro en equipos lentos                              | Glow moderado, aplicado por grupo de entidades y no por partícula.                                       |
| Assets o sonidos con 404 o autoplay bloqueado                    | Rutas `/games/<id>/...` verificadas en el cierre; el audio solo se reproduce tras una tecla del jugador. |
| `games.id` no existe y la FK rechaza el guardado                 | La migración de registro es un paso del plan y un criterio de aceptación.                                |
| Puntuación máxima supera `MAX_SCORE`                             | Se calcula en la fase de preguntas; si no cabe, el spec incluye el cambio de `CHECK` y de `MAX_SCORE`.   |
| Carrera en la carga diferida del motor                           | Ya cubierta por `GameCanvas` (SPEC 07); no replicar lógica de carga en el juego.                         |
| Cualquiera puede insertar puntuaciones falsas                    | Fuera de alcance (antitrampas y rate limiting en un spec posterior), igual que SPEC 06.                  |
| APIs distintas en Next 16 / React 19.3                           | Leer la guía correspondiente de `node_modules/next/dist/docs/` antes de tocar código de Next.            |

## Sección "Qué no entra" estándar

Cambios en otros juegos, Supabase Auth y "TU MEJOR MARCA", mejor marca por jugador, antitrampas y moderación, catálogo leído de la BD, controles táctiles, sonido (si no se decidió lo contrario), tests automatizados.
