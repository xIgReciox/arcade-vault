# Plantilla de spec de juego

Esqueleto para el spec que escribe `/add-game`. Sustituye todos los `<...>`; no dejes ninguno. Respeta la estructura de `.claude/skills/spec/template.md` y el idioma de los specs existentes. Añade los pasos, criterios y riesgos de `integration-checklist.md`.

---

````markdown
# SPEC <NN> — Juego <TÍTULO> jugable con leaderboard real

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** <YYYY-MM-DD leída del contexto de sesión>
> **Objective:** <Una frase: portar/crear <TÍTULO> como juego jugable en `/games/<id>/jugar` y registrarlo en el leaderboard real.>

---

## Por qué existe este spec

<Origen: `references/started-games/<carpeta>` (o idea desde cero). Qué aporta a la plataforma. Qué mock sustituye, si alguno. Dos o tres frases.>

---

## Alcance

**Dentro:**

- Registro en `GAMES` (`lib/games.ts`): id `<id>`, título `<TÍTULO>`, categoría `<CAT>`, portada `.cover-<id>`, posición <n>.
- Motor `<Engine>` en `lib/<id>/` que implementa `GameEngine`, portado de <origen> sin cambios de gameplay <o: con estas excepciones: ...>.
- Entrada `<id>` en `PLAYABLE_GAMES` (`lib/playable-games.ts`): <width>×<height>.
- Migración `supabase/migrations/<timestamp>_register_<id>.sql` que inserta `<id>` en `games`.
- Ranking real en `/games/<id>` (top 10) y `/salon` (top 12) sin cambios de código.
- HUD React: puntuación, <vidas | —>, <nivel | —>. En el canvas: <elementos dibujados>.
- Controles: <teclas>; `P`/`Escape` pausa; auto-pausa al perder foco.
- <Assets copiados a `public/games/<id>/> / <sin assets>.

**Fuera de alcance (para specs futuros):**

- <Sonido, si no entra.>
- Auth, "TU MEJOR MARCA", mejor marca por jugador.
- Antitrampas, rate limiting, moderación.
- Controles táctiles.
- Cambios en otros juegos.
- Tests automatizados.

---

## Modelo de datos

Registro en `GAMES`:

```ts
{
  id: "<id>",
  title: "<TÍTULO>",
  short: "<frase corta>",
  long: "<descripción larga>",
  cat: "<CAT>",
  cover: "cover-<id>",
  color: "<color>",
  best: <n mock>,
  plays: "<n mock>",
}
```

Entrada del registro jugable:

```ts
<id>: {
  load: async () => {
    const { <Engine> } = await import("@/lib/<id>/engine");
    return (canvas, cb) => new <Engine>(canvas, cb);
  },
  width: <w>,
  height: <h>,
  label: "Juego <TÍTULO>",
}
```

Migración:

```sql
insert into public.games (id, title) values ('<id>', '<TÍTULO>');
```

Estructura de archivos: `lib/<id>/constants.ts`, `utils.ts`, `input.ts`, `entities.ts` (o `rules.ts`), `engine.ts`.

Reglas de puntuación (copiadas del original): <evento → puntos>.

Sin cambios en `Game`, `ScoreRow`, `SavedScore`, `scores`, `av_scores` ni `av_player_name`.

---

## Plan de implementación

<Pasos 1–9 de integration-checklist.md, adaptados. Cada uno con su "Verificación:".>

---

## Criterios de aceptación

<Criterios estándar de integration-checklist.md con los huecos rellenos + criterios propios del juego.>

---

## Decisiones tomadas y descartadas

- **Sí/No:** <cada respuesta de la fase de preguntas, con su razón>.

---

## Riesgos identificados

<Tabla con los riesgos estándar que apliquen + los propios del juego.>

---

## Qué **no** entra en este spec

<Lista de reinforcement, igual que Alcance → Fuera.>

Cada uno de estos puntos, si se aborda, va en su propio spec.
````
