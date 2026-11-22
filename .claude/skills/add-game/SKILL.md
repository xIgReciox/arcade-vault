---
name: add-game
description: Diseña el spec para añadir un juego jugable a Arcade Vault con su leaderboard real en Supabase. El juego puede portarse desde references/started-games o crearse desde cero. Hace preguntas y escribe specs/NN-<juego>.md en Borrador; no implementa.
disable-model-invocation: true
argument-hint: "carpeta de references/started-games (ej. 03-tetris) o descripción del juego"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /add-game — Spec para añadir un juego con leaderboard

## Contexto de sesión

Fecha de hoy (úsala para la cabecera del spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay references/started-games/"`

Registro de juegos jugables (debe existir, lo crea SPEC 07):
!`cat lib/playable-games.ts 2>/dev/null || echo "NO EXISTE lib/playable-games.ts"`

---

Este skill produce **un spec** para convertir un juego en jugable dentro de `/games/<id>/jugar` y registrarlo en el leaderboard real (tabla `games` de Supabase). **No escribes código de la app ni tocas Supabase aquí.** La implementación la hace `/spec-impl` cuando el usuario apruebe el spec.

Es la versión repetible de lo que hicieron SPEC 05 (port de ASTEROIDS), SPEC 06 (leaderboard) y SPEC 07 (registro genérico). Responde en el idioma del prompt inicial (normalmente español).

Método base: este skill **extiende** `/spec`. Antes de escribir el archivo, la Fase 4 obliga a leer `~/.claude/skills/spec/SKILL.md` y `~/.claude/skills/spec/template.md` (skill global) y a seguirlos.

Archivos de apoyo, en esta misma carpeta:

- `spec-template.md` — esqueleto del spec de juego.
- `integration-checklist.md` — pasos, criterios y riesgos que **todo** spec de juego debe incluir.
- `port-guide.md` — cómo convertir un canvas vanilla en un motor encapsulado.

## Fase 1 — Contexto

1. Si el bloque "Registro de juegos jugables" dice `NO EXISTE`, **para**: indica que primero hay que aprobar e implementar `specs/07-registro-juegos-jugables.md` (`/spec-impl 07`). No continúes.
2. Lee `CLAUDE.md` y `AGENTS.md` (aviso de Next 16: leer las guías de `node_modules/next/dist/docs/` antes de escribir código Next).
3. Lee `specs/05-asteroids-juego.md`, `specs/06-leaderboard-y-tabla-juegos.md` y `specs/07-registro-juegos-jugables.md`, y el spec más reciente si es otro: son el patrón y el idioma a imitar.
4. Lee `lib/games.ts` (catálogo y juegos mock) y `lib/asteroids/engine.ts` (motor de referencia que implementa `GameEngine`).
5. Consulta los juegos ya registrados con `mcp__supabase__execute_sql`: `select id, title from public.games;` (solo lectura, nunca escribas).

Si `$ARGUMENTS` está vacío, pregunta qué juego se quiere añadir: carpeta de `references/started-games/` o idea desde cero. Si no cabe en una frase, propón dividirlo.

## Fase 2 — Origen del juego

**Desde referencia** (`$ARGUMENTS` coincide con una carpeta de `references/started-games/`, por número, slug o nombre completo):

- Lee `CLAUDE.md`, `README.md`, `index.html`, `game.js` y los extras (`levels.js`, `style.css`, `assets/`).
- Haz el inventario que pide `port-guide.md` (globals, listeners, tamaño del canvas, overlays propios, HUD en DOM, sonidos y assets, pausa y game over, cálculo de puntuación, vidas y niveles).
- **Nunca modifiques `references/`.** El spec lo declara como criterio de aceptación.

**Desde cero:**

- Pregunta mecánica, controles, puntuación, vidas, niveles y condición de fin. Pide la descripción mínima para poder escribir criterios verificables.

## Fase 3 — Preguntas (obligatoria, nunca la saltes)

Usa `AskUserQuestion` en bloques de 3 a 4. Pon tu recomendación primero. Cubre siempre:

1. **Identidad:** `id` (kebab-case, será también la clave de `PLAYABLE_GAMES` y de `games.id`), título en mayúsculas, categoría (`ARCADE | PUZZLE | SHOOTER | VERSUS`), color de portada (`cyan | magenta | yellow | green`).
2. **Catálogo:** ¿sustituye a un juego mock con concepto parecido (p. ej. `caida` ↔ Tetris, `bloque-buster` ↔ Arkanoid; revisa `lib/games.ts`) o es una entrada nueva? Si sustituye, ¿se conserva el `id` mock (pasa de ranking sembrado a real) o se crea uno nuevo y se retira el mock? Posición en `GAMES`.
3. **Canvas:** resolución interna y encaje en el 4:3 de `.crt-screen`. Si el original no es 4:3, el panel lateral (siguiente pieza, etc.) se dibuja dentro del canvas.
4. **HUD:** qué va al HUD React (la puntuación siempre; vidas y nivel o `null`) y qué se dibuja en el canvas.
5. **Assets y sonido:** copiar a `public/games/<id>/` o dejar fuera de alcance. Si hay sonido, ¿entra o es otro spec?
6. **Gameplay:** por defecto el port **no cambia** velocidades, puntos ni reglas del original. Confirma cualquier excepción.
7. **Puntuación máxima realista:** debe ser ≤ `MAX_SCORE` (10 000 000). Si no, hay que cambiar el `CHECK` en BD: avisa de que eso es un cambio de esquema y pregunta.
8. **Control:** teclas (siempre `P`/`Escape` para pausa), y si el original usa Espacio/flechas, `preventDefault`.

Para cuando puedas responder sin asumir: qué archivos aparecen o cambian, cuál es el primer y el último paso ejecutable, y cómo se verifica que está terminado.

## Fase 4 — Leer el skill `/spec` y redactar

**Antes de crear el archivo del spec, lee obligatoriamente, con `Read` y en este orden:**

1. `.claude/skills/spec/SKILL.md` — es la fuente de verdad del método: Fase 3 (escritura y orden de secciones), Fase 4 (numeración, slug, fecha, estado `Borrador`, `specs/.spec-config.yml`, confirmación final) y "Hard rules".
2. `.claude/skills/spec/template.md` — estructura y reglas globales del documento (una frase por idea, nombres concretos, sin TODOs, sin código largo, markdown estándar, criterios verificables).

Si alguno no existe, **para** y avisa al usuario: no escribas el spec de memoria.

Reglas de precedencia:

- El método y el formato general los fija `/spec`. `spec-template.md` e `integration-checklist.md` solo **concretan** ese formato para juegos: aportan contenido (pasos, criterios, riesgos), no lo sustituyen.
- Si hay conflicto entre un archivo de apoyo de `/add-game` y `/spec`, gana `/spec`.
- Aplica a este spec las "Hard rules" y las "Global rules" que acabas de leer, y el idioma de los specs existentes.

Después:

1. Numeración, slug, fecha y estado: exactamente como indica la Fase 4 de `/spec`. Número = el más alto de `specs/` + 1, con dos dígitos; slug = `<id>-juego` (ej. `08-tetris-juego.md`); fecha leída del contexto de sesión; estado `Borrador` (la palabra que usen los specs existentes).
2. Redacta con las secciones y el orden de `/spec` (cabecera, alcance, modelo de datos, plan, criterios, decisiones, riesgos, "qué no entra"), partiendo de `spec-template.md`. Sustituye todos los huecos `<...>` y añade **todo** lo de `integration-checklist.md`. Un spec sin TODOs: o se decide o se registra como decisión con razón.
3. Cabecera: `Depends on: SPEC 05, SPEC 06, SPEC 07` (más cualquier spec posterior que toque el reproductor o el catálogo).
4. Comprueba que cada spec referenciado existe en `specs/`.
5. Si la información está completa, escribe el spec entero y guárdalo sin pedir confirmación sección a sección (Fase 3 de `/spec`). Si falta información, desarrolla las secciones una a una.
6. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto de la Fase 4 de `/spec`; si existe, no lo toques.
7. Confirma al usuario: ruta del archivo, estado `Borrador`, y el siguiente paso: "revísalo, cámbialo a `Aprobado` y ejecuta `/spec-impl NN-slug`". **Detente ahí.**

## Reglas duras

- No escribes el spec sin haber leído antes `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta misma sesión.
- No escribes código de la app, migraciones ni cambios en Supabase. Solo `select` de lectura y el archivo `.md` del spec (y `specs/.spec-config.yml` si falta).
- No propones implementar el spec tras guardarlo.
- No marcas el spec como `Aprobado`: lo hace el humano.
- No modificas `references/`.
- Un juego por spec. Si piden varios, genera un spec por juego, uno tras otro, con su propio bloque de preguntas.
- Si el usuario quiere saltarse las preguntas, avísale ("las preguntas ahora ahorran horas después") y, si insiste, registra en Decisiones: "Definición rápida sin aclaraciones detalladas".
