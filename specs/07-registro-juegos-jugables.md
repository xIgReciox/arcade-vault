# SPEC 07 — Registro genérico de juegos jugables

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-18
> **Objective:** Sustituir la rama fija `isAsteroids` de `GamePlayer` por un contrato común de motor y un registro de juegos jugables, de modo que añadir un juego nuevo sea registrar una entrada, sin cambiar el comportamiento de ASTEROIDS.

---

## Por qué existe este spec

SPEC 05 y SPEC 06 dejaron ASTEROIDS jugable y con leaderboard real, pero acoplado a dos sitios: `components/game-player.tsx` (`isAsteroids`, `asteroidsName`, `handleSaveAsteroids`) y `components/games/asteroids-canvas.tsx` (instancia `AsteroidsEngine` y fija 800×600). SPEC 05 pospuso explícitamente el sistema genérico "hasta que llegue el segundo juego real". Este spec lo introduce **antes** de ese segundo juego, para que el skill `/add-game` solo tenga que añadir una entrada al registro. El resto del flujo del leaderboard ya es genérico: `getRegisteredGameIds()`, `getLeaderboard()`, `submitScore`, `/games/[id]` y `/salon` deciden "ranking real" por la tabla `games`.

---

## Alcance

**Dentro:**

- `lib/game-engine.ts` (sin `server-only`): contrato común `GameEngine`, `GameSnapshot`, `GameCallbacks`, `GameStatus` y `GameEngineFactory`.
- `AsteroidsEngine` pasa a implementar `GameEngine`; sus tipos `AsteroidsStatus`, `AsteroidsSnapshot` y `AsteroidsCallbacks` se convierten en alias de los comunes.
- `lib/playable-games.ts`: registro cliente `PLAYABLE_GAMES` con carga diferida del motor, resolución interna y etiqueta accesible. Entrada única: `asteroids`.
- `components/games/game-canvas.tsx`: componente genérico que sustituye a `asteroids-canvas.tsx` (se borra). Misma lógica: Strict Mode seguro, auto-pausa por `visibilitychange`/`blur`, props `paused`, `restartKey`, `ended`.
- `components/game-player.tsx`: `isAsteroids` se sustituye por `playable = getPlayable(game.id)`; nombres neutros para el estado del ranking real; el HUD muestra `—` cuando `lives` o `level` son `null`.
- Un juego es "jugable real" si está en `PLAYABLE_GAMES`; es "con leaderboard" si además está en la tabla `games` (se mantiene la regla de SPEC 06).

**Fuera de alcance (para specs futuros):**

- Añadir juegos nuevos (lo hace el skill `/add-game`, un spec por juego).
- Cualquier cambio en Supabase, migraciones, RLS o `lib/scores.ts`.
- Catálogo, `best` y `plays` leídos de la BD.
- Sonido, controles táctiles, ajustes por juego.
- Mejor marca por jugador y "TU MEJOR MARCA" (vuelven con Auth).
- Tests automatizados.

---

## Modelo de datos

Contrato común (`lib/game-engine.ts`):

```ts
export type GameStatus = "playing" | "dead" | "paused" | "gameover";

export interface GameSnapshot {
  score: number;
  lives: number | null; // null = el juego no tiene vidas (el HUD muestra "—")
  level: number | null; // null = el juego no tiene niveles (el HUD muestra "—")
  status: GameStatus;
}

export interface GameCallbacks {
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score/lives/level/status
  onGameOver: (finalScore: number) => void;
}

export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  endGame(): void; // usado por el botón FIN
  destroy(): void; // cancela rAF y quita listeners
}

export type GameEngineFactory = (canvas: HTMLCanvasElement, callbacks: GameCallbacks) => GameEngine;
```

Registro (`lib/playable-games.ts`):

```ts
export interface PlayableGame {
  load: () => Promise<GameEngineFactory>; // import() diferido del motor
  width: number; // resolución interna del canvas
  height: number;
  label: string; // aria-label del canvas
}

export const PLAYABLE_GAMES: Record<string, PlayableGame> = {
  asteroids: {
    load: async () => {
      const { AsteroidsEngine } = await import("@/lib/asteroids/engine");
      return (canvas, cb) => new AsteroidsEngine(canvas, cb);
    },
    width: 800,
    height: 600,
    label: "Juego ASTEROIDS",
  },
};

export function getPlayable(id: string): PlayableGame | undefined;
```

Convenciones:

- La clave del registro es el mismo `id` de `lib/games.ts` y de la tabla `games`.
- Todos los motores renderizan en un único `<canvas>` escalado al 100 % de `.crt-screen` (4:3).
- Sin cambios en `Game`, `SavedScore`, `av_scores`, `av_player_name` ni en el esquema de Supabase.

---

## Plan de implementación

1. **Contrato.** Crear `lib/game-engine.ts` con los tipos anteriores. Verificación: `npx tsc --noEmit` pasa.
2. **Motor de ASTEROIDS.** En `lib/asteroids/engine.ts`, hacer que `AsteroidsEngine implements GameEngine` y que `AsteroidsStatus`/`AsteroidsSnapshot`/`AsteroidsCallbacks` sean alias de los tipos comunes (`lives` y `level` siguen siendo `number`). Verificación: `tsc` pasa.
3. **Registro.** Crear `lib/playable-games.ts` con `PLAYABLE_GAMES` y `getPlayable()`. Antes de escribirlo, leer en `node_modules/next/dist/docs/` la guía de Client Components. Verificación: `tsc` pasa.
4. **Canvas genérico.** Crear `components/games/game-canvas.tsx` a partir de `asteroids-canvas.tsx`: recibe `playable: PlayableGame`, crea el motor tras resolver `playable.load()` (cancelando si el efecto se limpió antes), usa `playable.width/height/label`. Mantiene auto-pausa, `paused`, `ended` y `restartKey`. Verificación: `tsc` pasa.
5. **Reproductor.** En `components/game-player.tsx`: sustituir `isAsteroids` por `playable`, renderizar `GameCanvas`, renombrar `asteroidsName*`/`storedName`/`handleSaveAsteroids` a `rankName*`/`handleSaveReal`, derivar `lives`/`level` de `GameSnapshot` y pintar `—` si son `null`. Los juegos sin entrada en el registro conservan arena decorativa, puntuación simulada y `av_scores`. Verificación: `/games/asteroids/jugar` es jugable y `/games/rocas/jugar` igual que antes.
6. **Limpieza.** Borrar `components/games/asteroids-canvas.tsx` y comprobar con `Grep` que no quedan referencias a `isAsteroids` ni a `AsteroidsCanvas`. Verificación: `tsc` y `npm run lint` pasan.
7. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`) de una partida completa de ASTEROIDS con guardado y de `/games/rocas/jugar`; limpiar las filas de prueba de `scores` con `execute_sql`. Verificación: se cumplen los criterios de aceptación.

---

## Criterios de aceptación

- [ ] Existen `lib/game-engine.ts`, `lib/playable-games.ts` y `components/games/game-canvas.tsx`.
- [ ] `components/games/asteroids-canvas.tsx` ya no existe y no hay referencias a `AsteroidsCanvas` ni a `isAsteroids` en el repo.
- [ ] `AsteroidsEngine` declara `implements GameEngine`.
- [ ] `PLAYABLE_GAMES` contiene exactamente la clave `asteroids`, con `width: 800` y `height: 600`.
- [ ] El motor de ASTEROIDS se carga con `import()` diferido: no está en el bundle de `/games` ni de `/salon`.
- [ ] En `/games/asteroids/jugar` hay un `<canvas>` 800×600 dentro de `.crt-screen` con `aria-label="Juego ASTEROIDS"` y no existe `.game-arena`.
- [ ] Controles, pausa (`P`, `Escape`, botón), auto-pausa al cambiar de pestaña, FIN y JUGAR DE NUEVO funcionan igual que tras SPEC 05.
- [ ] Guardar en ASTEROIDS crea una fila en `scores` con `user_id = NULL`, recuerda `av_player_name`, no modifica `av_scores` y muestra "PUNTUACIÓN GUARDADA_" (igual que SPEC 06).
- [ ] Si un motor emite `lives: null` o `level: null`, el HUD muestra `—` en ese campo.
- [ ] `/games/rocas/jugar` y el resto de juegos sin entrada en el registro conservan la arena decorativa, la puntuación simulada y el guardado en `av_scores`.
- [ ] Navegar fuera del reproductor no deja `requestAnimationFrame` ni listeners activos; en Strict Mode no se crean dos motores simultáneos.
- [ ] No hay errores en la consola del navegador en `/games/asteroids/jugar` ni `/games/rocas/jugar`.
- [ ] Las filas de prueba creadas durante la verificación se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** contrato `GameEngine` común con los métodos que ya tiene `AsteroidsEngine`. El motor ya cumple el contrato; solo se extrae.
- **No:** clase base abstracta. Los juegos comparten interfaz, no implementación.
- **Sí:** registro en un archivo cliente (`lib/playable-games.ts`) con `load()` diferido. Cada juego nuevo no engorda el bundle de las demás páginas.
- **No:** importar todos los motores de forma estática en `GamePlayer`.
- **Sí:** `lives` y `level` como `number | null`. Permite juegos sin vidas o sin niveles sin inventar valores falsos en el HUD.
- **Sí:** un único `<canvas>` por juego, 4:3. Es el contrato visual de `.crt-screen`; los juegos con otra proporción dibujan su HUD lateral dentro del canvas.
- **Sí:** "jugable real" (registro cliente) y "con leaderboard" (tabla `games`) siguen siendo dos cosas separadas. Un juego puede ser jugable sin estar aún en `games`; entonces guarda en `av_scores`, como los mocks.
- **No:** leer el registro desde Supabase. Supabase decide el ranking, el código decide cómo se juega.
- **Sí:** un spec por cada juego nuevo, generado con `/add-game`. Cada port tiene decisiones propias (resolución, assets, HUD).
- **No:** tocar `lib/scores.ts`, `app/games/actions.ts`, `/games/[id]` ni `/salon`. Ya son genéricos desde SPEC 06.

---

## Riesgos identificados

| Riesgo                                                                    | Mitigación                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| La carga diferida abre una carrera: el efecto se limpia antes de resolver | `GameCanvas` usa una bandera `cancelled` y no crea el motor si el cleanup ya corrió; Strict Mode cubierto. |
| Regresión de ASTEROIDS al renombrar estado del modal                      | Criterios de aceptación que repiten el comportamiento de SPEC 05/06 y prueba manual completa en el cierre. |
| Pausa o `ended` llegan antes de que el motor exista (carga asíncrona)     | Los efectos de props aplican el estado actual cuando el motor termina de crearse.                          |
| Motores futuros con `lives`/`level` ausentes rompen el HUD                | `null` pintado como `—`; criterio de aceptación específico.                                                |
| Juego en `PLAYABLE_GAMES` pero no en `games` (o al revés)                 | Documentado en Decisiones; `/add-game` genera siempre ambas entradas en el mismo spec.                     |

---

## Qué **no** entra en este spec

- Juegos nuevos (Tetris, Arkanoid u otros): cada uno, su propio spec vía `/add-game`.
- Cambios en Supabase, RLS o en el flujo de guardado.
- Catálogo, `best` y `plays` desde la BD.
- Sonido, controles táctiles y ajustes por juego.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
