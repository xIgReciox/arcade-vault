# SPEC 06 — Tabla `games` y leaderboard real de ASTEROIDS en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-11-18
> **Objective:** Crear en Supabase las tablas `games` (solo con ASTEROIDS) y `scores`, guardar ahí las puntuaciones de ASTEROIDS mediante una Server Action con nombre libre (sin Auth) y mostrarlas como ranking real en el detalle del juego y en el Salón de la Fama.

---

## Por qué existe este spec

Hoy el proyecto de Supabase (`wljsonyvaxqxsgqfucjw`) no tiene tablas, las puntuaciones se guardan solo en `localStorage` (`av_scores`) y todos los rankings salen de `seededScores`. ASTEROIDS ya es jugable (SPEC 05), pero su puntuación final no llega a ningún sitio compartido. Este spec crea el esquema mínimo, conecta el modal "FIN DEL JUEGO" con la base de datos y sustituye el ranking falso de ASTEROIDS por datos reales. La autenticación real queda fuera: `user_id` existe pero es opcional y siempre será `NULL` hasta el spec de Auth.

---

## Alcance

**Dentro:**

- Migración SQL `supabase/migrations/<timestamp>_games_and_scores.sql`, aplicada al proyecto con la herramienta MCP `apply_migration`, que crea:
  - Tabla `games`: referencia de los juegos de la plataforma que tienen leaderboard. Se siembra **solo** con `asteroids`.
  - Tabla `scores`: una fila por partida guardada.
  - RLS en ambas: lectura pública; en `scores`, `INSERT` permitido a `anon` y `authenticated` solo con datos válidos; sin `UPDATE` ni `DELETE`.
- Tipos generados `lib/supabase/database.types.ts` y `createClient()` (navegador y servidor) tipados con `<Database>`.
- `lib/scores.ts` (solo servidor, `import "server-only"`): validación del nombre y la puntuación, `getRegisteredGameIds()` y `getLeaderboard(gameId, limit)`.
- Server Action `submitScore` en `app/games/actions.ts`: valida e inserta en `scores`.
- Modal "FIN DEL JUEGO" de `GamePlayer`, **solo para ASTEROIDS**:
  - El nombre sale del campo del modal, prellenado desde `localStorage` (`av_player_name`) y, si no existe, desde `av_user`.
  - Al guardar con éxito se recuerda el nombre en `av_player_name`.
  - GUARDAR llama a `submitScore` en lugar de escribir en `av_scores`. Estados: guardando, guardado y error.
- Detalle `/games/[id]`: para juegos registrados en `games` (ASTEROIDS) el panel "MEJORES PUNTUACIONES" muestra el top 10 real; con 0 filas, un estado vacío.
- Salón `/salon`: para ASTEROIDS, podio y tabla top 12 reales con estado vacío y podio parcial; sin la fila "TU MEJOR MARCA".
- Lectura dentro de `<Suspense>` en ambas páginas, respetando `cacheComponents`.

**Fuera de alcance (para specs futuros):**

- Supabase Auth, perfiles, `proxy.ts` y la sustitución de `auth-provider` / `av_user`. `user_id` queda siempre `NULL`.
- Fila "TU MEJOR MARCA" para ASTEROIDS (vuelve con Auth).
- Que `GAMES` / biblioteca / home / detalle lean el catálogo de la tabla `games`: la UI sigue usando `lib/games.ts`.
- `best` y `plays` reales en tarjetas, home y detalle (siguen mock).
- Ranking real para los otros 8 juegos: no están en `games`, conservan `seededScores`.
- Una sola fila por jugador / mejor marca por nombre (el ranking es top N de todas las partidas).
- Antitrampas (validación de que la puntuación sea alcanzable), rate limiting y CAPTCHA.
- Moderación de nombres, edición o borrado de puntuaciones.
- Realtime / actualización en vivo del ranking.
- Tests automatizados.

---

## Modelo de datos

Migración (resumen del DDL; el archivo definitivo lo escribe el paso 1):

```sql
create table public.games (
  id         text primary key,                 -- mismo id que lib/games.ts
  title      text not null,
  created_at timestamptz not null default now()
);

insert into public.games (id, title) values ('asteroids', 'ASTEROIDS');

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  user_id     uuid references auth.users (id) on delete set null,  -- opcional; NULL hasta el spec de Auth
  player_name text not null check (player_name ~ '^[A-Z0-9_]{3,12}$'),
  score       integer not null check (score >= 0 and score <= 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública"  on public.games  for select to anon, authenticated using (true);
create policy "scores: lectura pública" on public.scores for select to anon, authenticated using (true);
create policy "scores: insertar anónimo" on public.scores for insert to anon, authenticated
  with check (user_id is null and exists (select 1 from public.games g where g.id = game_id));
```

Tipos de aplicación (`lib/scores.ts`):

```ts
import "server-only";
import type { ScoreRow } from "@/lib/games"; // { rank, name, score, date }

export const PLAYER_NAME_RE = /^[A-Z0-9_]{3,12}$/;
export const MAX_SCORE = 10_000_000;

export interface SubmitScoreInput {
  gameId: string;
  playerName: string;
  score: number;
}
export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

export function getRegisteredGameIds(): Promise<string[]>;
export function getLeaderboard(gameId: string, limit: number): Promise<ScoreRow[]>; // ordenado score desc, created_at asc
```

`ScoreRow.date` se formatea `DD/MM/YYYY` desde `created_at` (misma forma que `seededScores`). Nota: `lib/scores.ts` lleva `import "server-only"`, por lo que `PLAYER_NAME_RE` y `MAX_SCORE` que necesite el modal (cliente) se exportan desde un archivo sin `server-only` (`lib/scores-shared.ts`) y `lib/scores.ts` los reutiliza.

Almacenamiento en el navegador (nuevo):

- `localStorage["av_player_name"]` — último nombre usado al guardar (string; se ignora si no cumple `PLAYER_NAME_RE`).

Sin cambios: `Game`, `User`, `ScoreRow`, `SavedScore` y `av_scores` para los juegos que no son ASTEROIDS.

---

## Plan de implementación

1. **Esquema en Supabase.** Inspeccionar con `list_tables`, escribir `supabase/migrations/<timestamp>_games_and_scores.sql` con el DDL anterior y aplicarlo con `apply_migration`. Verificación: `list_tables` muestra `games` (1 fila: `asteroids`) y `scores` (vacía) con RLS activa; `get_advisors` (security) no reporta tablas sin RLS.
2. **Tipos.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types` y tipar `createBrowserClient<Database>` / `createServerClient<Database>` en `client.ts` y `server.ts`. Verificación: `npx tsc --noEmit` pasa.
3. **Capa de datos.** Crear `lib/scores-shared.ts` (regex y límite) y `lib/scores.ts` con `getRegisteredGameIds()` y `getLeaderboard()` usando el cliente de servidor. Antes de escribirlo, leer en `node_modules/next/dist/docs/` la guía de `cacheComponents` / datos dinámicos y `cookies`. Verificación: `tsc` pasa.
4. **Server Action.** Crear `app/games/actions.ts` (`"use server"`) con `submitScore(input)`: valida `gameId` (string), `playerName` contra `PLAYER_NAME_RE` y `score` (entero, 0–`MAX_SCORE`); inserta con `user_id` nulo; devuelve `SubmitScoreResult` con mensajes en español, sin exponer detalles internos del error. Verificación: `tsc` pasa; probar con una llamada desde el modal en el paso 5 y comprobar la fila con `execute_sql`.
5. **Modal de fin de juego.** En `components/game-player.tsx`, solo si `isAsteroids`: nombre prellenado desde `av_player_name` → `av_user` → vacío (leído tras montar para evitar desajustes de hidratación); el input fuerza mayúsculas y filtra caracteres no válidos, máx. 12; GUARDAR deshabilitado si el nombre no cumple la regex; al pulsarlo llama a `submitScore`, muestra "GUARDANDO…", luego "PUNTUACIÓN GUARDADA_" y guarda `av_player_name`; en error muestra el mensaje y permite reintentar. Se deja de escribir `av_scores` para ASTEROIDS; los demás juegos conservan `saveScore` actual. JUGAR DE NUEVO reinicia el estado de guardado. Verificación: jugar hasta GAME OVER, guardar, comprobar la fila en `scores` y que `av_scores` no cambia.
6. **Detalle del juego.** En `app/games/[id]/page.tsx`, dentro del `<Suspense>` existente: si el id está en `getRegisteredGameIds()`, el panel usa `getLeaderboard(id, 10)` (estado vacío "AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO" con 0 filas); si no, mantiene `seededScores`. Verificación: `/games/asteroids` muestra las filas reales; `/games/rocas` igual que antes.
7. **Salón de la Fama.** `app/salon/page.tsx` pasa a leer, dentro de `<Suspense>`, `getRegisteredGameIds()` y `getLeaderboard(id, 12)` de cada juego registrado, y se los entrega a `HallOfFame` como prop (`realRows: Record<string, ScoreRow[]>`). En `components/hall-of-fame.tsx`: para pestañas con datos reales, podio y tabla leen esas filas, los puestos de podio sin fila muestran `—`, 0 filas muestra el estado vacío y no se pinta "TU MEJOR MARCA"; el resto de pestañas no cambian. Verificación: `/salon` muestra ASTEROIDS con datos reales (o vacío) y `/salon` con la pestaña ROCAS igual que antes.
8. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; prueba manual con Playwright (capturas en `.playwright-screenshots/`) de guardar una puntuación y verla en detalle y Salón; limpiar las filas de prueba de `scores` con `execute_sql`. Verificación: los tres comandos pasan y se cumplen los criterios de aceptación.

---

## Criterios de aceptación

- [ ] Existe `supabase/migrations/*_games_and_scores.sql` y está aplicada: `list_migrations` la muestra.
- [ ] `games` contiene exactamente una fila (`asteroids`, `ASTEROIDS`).
- [ ] `scores` tiene `id`, `game_id`, `user_id` (nullable), `player_name`, `score`, `created_at`, y ambas tablas tienen RLS activa.
- [ ] Un `INSERT` en `scores` con rol `anon` con nombre inválido (p. ej. `ab`, `abc` en minúsculas o 13 caracteres), `score` negativo o `> 10000000`, `game_id` inexistente o `user_id` no nulo es rechazado.
- [ ] No hay políticas `UPDATE` ni `DELETE` en `scores`: esas operaciones con rol `anon` no afectan filas.
- [ ] `get_advisors` (security) no reporta tablas sin RLS ni políticas permisivas excesivas en `games` / `scores`.
- [ ] `lib/supabase/database.types.ts` existe y los dos `createClient()` usan `<Database>`.
- [ ] `lib/scores.ts` empieza con `import "server-only"` y ningún Client Component lo importa.
- [ ] En `/games/asteroids/jugar`, al llegar a GAME OVER el modal permite introducir un nombre; GUARDAR queda deshabilitado con un nombre que no cumple `^[A-Z0-9_]{3,12}$`.
- [ ] Guardar con un nombre válido crea una fila en `scores` con `game_id = 'asteroids'`, `user_id = NULL`, el nombre y la puntuación mostrados, y la UI muestra "PUNTUACIÓN GUARDADA_".
- [ ] Tras guardar, `localStorage.av_player_name` contiene el nombre; al volver a jugar y llegar al modal, el input aparece prellenado con ese nombre.
- [ ] Guardar ASTEROIDS ya no modifica `localStorage.av_scores`.
- [ ] Si la Server Action falla (p. ej. sin conexión), el modal muestra un mensaje de error y GUARDAR sigue disponible para reintentar.
- [ ] JUGAR DE NUEVO tras guardar permite guardar la nueva partida (el estado "guardado" se reinicia).
- [ ] `/games/asteroids` muestra hasta 10 filas reales ordenadas por puntuación descendente; con 0 filas muestra el estado vacío y no `seededScores`.
- [ ] `/salon` con la pestaña ASTEROIDS muestra datos reales: podio con `—` en puestos sin fila, tabla de hasta 12 filas y estado vacío con 0 filas; no aparece "TU MEJOR MARCA".
- [ ] `/games/rocas`, `/salon` con otras pestañas y `/games/rocas/jugar` se comportan exactamente como antes (ranking `seededScores`, guardado en `av_scores`).
- [ ] Una puntuación guardada aparece en `/games/asteroids` y `/salon` sin redeploy ni reinicio del servidor.
- [ ] No hay errores en la consola del navegador en `/games/asteroids`, `/games/asteroids/jugar` ni `/salon`.
- [ ] Las filas de prueba creadas durante la verificación se eliminan de `scores`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones tomadas y descartadas

- **Sí:** tabla `games` como referencia de juegos con leaderboard, sembrada solo con `asteroids`. Decisión del usuario: los 8 juegos restantes no existen todavía y se añaden cuando se implementen.
- **No:** sembrar los 9 juegos de `lib/games.ts`. Registraría juegos que no son jugables.
- **No:** que la UI lea el catálogo desde `games` ahora. Tocaría biblioteca, home, Salón y detalle sin aportar valor; `lib/games.ts` sigue siendo el catálogo de presentación.
- **Sí:** tabla `scores` en Supabase como fuente de verdad del leaderboard.
- **No:** mantener `av_scores` como respaldo de ASTEROIDS. Duplicaría fuentes de verdad.
- **Sí:** `user_id` nullable referenciando `auth.users`, siempre `NULL` por ahora. Decisión del usuario: no obligar a autenticarse para jugar; la columna deja lista la futura vinculación.
- **No:** Auth real en este spec. Abre perfiles, `proxy.ts`, login y sustitución de `auth-provider`; va en su propio spec.
- **Sí:** el nombre sale del modal y se recuerda en `localStorage` (`av_player_name`). Decisión del usuario; cuando llegue Auth se sustituirá por el usuario.
- **Sí:** formato de nombre `^[A-Z0-9_]{3,12}$` validado en cliente, en la Server Action y con `CHECK` en BD. Es consistente con el estilo arcade (iniciales/alias en mayúsculas) y la BD no depende del cliente. _Supuesto del spec: el usuario no fijó las reglas; ajustables antes de aprobar._
- **Sí:** inserción mediante Server Action con el cliente de servidor. Decisión del usuario; permite validar en servidor y no exponer la lógica de escritura al cliente.
- **No:** `INSERT` directo desde el navegador.
- **Sí:** RLS con `INSERT` anónimo condicionado (`user_id is null`, juego existente) y sin `UPDATE`/`DELETE`. Impide suplantar un `user_id` y modificar o borrar entradas ajenas.
- **Sí:** ranking = top N de todas las partidas (10 en detalle, 12 en Salón), desempate por antigüedad. Decisión del usuario; sin agregaciones.
- **No:** una fila por jugador. Los nombres no son únicos sin Auth.
- **Sí:** mantener `seededScores` para los otros 8 juegos en detalle y Salón. Decisión del usuario; no cambia lo que hoy se ve.
- **Sí:** quitar "TU MEJOR MARCA" para ASTEROIDS. Sin `user_id` real no se puede identificar "tu" marca.
- **Sí:** los juegos no ASTEROIDS siguen escribiendo en `av_scores` en el reproductor. Su comportamiento no cambia y no existen en `games` (la FK rechazaría el guardado).
- **Sí:** generar `database.types.ts` y tipar los clientes. SPEC 04 lo pospuso "hasta que existan tablas".
- **Sí:** leer los datos dentro de `<Suspense>`. Con `cacheComponents` el cliente de servidor lee cookies, y así las filas nuevas aparecen sin redeploy.

---

## Riesgos identificados

| Riesgo                                                                                               | Mitigación                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntuaciones falsas (el score se calcula en el cliente) y spamear la tabla | Fuera de alcance explícito. `CHECK` de rango en BD y validación en servidor limitan el daño; antitrampas y rate limiting van en un spec posterior. |
| Nombres ofensivos                                                                                    | El formato restringido reduce el problema pero no lo elimina; moderación fuera de alcance.                                                         |
| Con `cacheComponents`, leer cookies/datos fuera de `<Suspense>` rompe el build                       | Las lecturas se hacen en componentes async dentro de `<Suspense>` en `/games/[id]` y `/salon`; se leen las guías locales de Next antes del paso 3. |
| Desajuste de hidratación al prellenar el nombre desde `localStorage`                                 | Se lee tras montar (en efecto/estado inicial diferido), igual que la sesión actual.                                                                |
| `localStorage` bloqueado (modo privado)                                                              | `try/catch` en lectura y escritura de `av_player_name`; el guardado en Supabase no depende de él.                                                  |
| El podio de `HallOfFame` asume 3 filas (`rows[0..2]`) y falla con 0–2 filas reales                   | El paso 7 trata filas ausentes con `—` y el estado vacío; criterio de aceptación específico.                                                       |
| Que la Server Action falle por red o RLS deje al jugador sin feedback                                | `SubmitScoreResult` y estado de error en el modal con reintento.                                                                                   |
| `generateStaticParams` de `/games/[id]` pregenera el detalle con datos vacíos                        | El ranking se lee dentro de `<Suspense>` en cada petición, no en la parte estática.                                                                |
| Filas de prueba contaminan el leaderboard real                                                       | El paso 8 las elimina con `execute_sql` y es criterio de aceptación.                                                                               |

---

## Qué **no** entra en este spec

- Supabase Auth, perfiles y `proxy.ts`.
- "TU MEJOR MARCA" y cualquier vínculo real jugador ↔ puntuación.
- Catálogo, `best` y `plays` leídos de la BD.
- Rankings reales de los otros 8 juegos.
- Mejor marca por jugador.
- Antitrampas, rate limiting y moderación.
- Realtime.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
