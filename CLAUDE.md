# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform for playing retro arcade games online and competing for the highest score (UI and copy in Spanish). Built with Spec Driven Design: every feature starts as a spec in `specs/NN-slug.md` (`/spec`) and is implemented step by step with `/spec-impl`.

Current state (specs 01–11 implemented):

- Screens: home/landing (`/`), about + contact form (`/about`), auth (`/auth`), library (`/games`), game detail with real leaderboard (`/games/[id]`), player (`/games/[id]/jugar`), Hall of Fame (`/salon`).
- Playable games (real canvas engines): **ASTEROIDS**, **TETRIS**, **ARKANOID**, **SNAKE** and more. Other entries in `GAMES` are mocks with a simulated player.
  (see references/implemented-games.md) when you need to check with games are implemented and how to implementent new ones.

- Touch controls (SPEC 11): the 4 real games are playable on mobile with a virtual gamepad (d-pad + up to 2 buttons) under the canvas; mobile player layout (≤ 720 px) with compact HUD and no CRT frame.
- Real leaderboards in Supabase (`games` + `scores` tables). Auth is still a localStorage mock (`components/auth-provider.tsx`, key `av_user`); scores are inserted anonymously (`user_id = null`).
- Contact form sends real email via Resend (`app/about/actions.ts`).

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config); single file: `npx eslint path/to/file.tsx`
- `npx tsc --noEmit` — type check
- No test runner. Verify UI manually with Playwright MCP; save all screenshots in `.playwright-screenshots/`.

## Next.js version warning

Next 16.4.6 / React 19.3 — APIs differ from older training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices. `next dev` re-adds the `AGENTS.md` block if removed.

## Skills

Usa siempre /frontend-design para diseñar interfaces de usuario.

Global skills (user level, `~/.claude/skills/` → real files in `~/.agents/skills/`; not in this repo):

- `/spec` — writes a spec in `specs/NN-slug.md` from `template.md` (status Borrador). From `Klerith/fernando-skills`.
- `/spec-impl` — implements a spec step by step. Configured per project in `specs/.spec-config.yml`: `AutoCreateBranch: true` (creates `spec-NN-slug` branch), `AutoCommitSteps: false` (never commits on its own).

Project skills (`.claude/skills/`):

- `/add-game` — designs the spec for adding a playable game with a real Supabase leaderboard, ported from `references/started-games/` or from scratch. Only writes the spec; follows the fixed recipe in `.claude/skills/add-game/integration-checklist.md` (plus `port-guide.md`, `spec-template.md`). Read that checklist before implementing any new game.

Project agents (`.claude/agents/`):

- `game-planner` — decides which game to add next and why it fits the platform (top 3 + one recommendation). Has persistent project memory in `.claude/agent-memory/game-planner/` (`suggestions.md` = history of proposed/accepted/implemented/discarded games) so it never repeats suggestions. Flow: `game-planner` → `/add-game` → `/spec-impl`.
- `game-jam` — given a theme, autonomously designs one original game and writes 3 chained specs (`01-<id>-juego.md`, `02-<id>-pulido.md`, `03-<id>-contenido.md`) in `specs/game-jam/<id>/`, in the format of SPEC 08–10 and status Borrador. Never asks questions; every choice goes in each spec's Decisiones. Memory in `.claude/agent-memory/game-jam/` (`jams.md` = history of themes/games); reads the game-planner's memory but never writes it. Flow: `game-jam <tema>` → human review/approval → `/spec-impl <path>`.
- `skin-designer` — audits that every playable game has the skins `clasico` (default), `neon` and `retro`, implements the missing ones (shared `lib/skins.ts`, per-game `lib/<id>/skins.ts`, `setSkin` on the engine, selector in the player) and checks contrast on the dark background (the site is dark-only). Args: none (all games), `<id>`, or "solo auditar" (report only). Memory in `.claude/agent-memory/skin-designer/` (`skins.md` = compliance table). Never commits.

## Architecture

- `app/` — App Router pages. Server Actions: `app/games/actions.ts` (`submitScore`), `app/about/actions.ts` (`sendContact`).
- `components/` — UI (nav, footer, library, game-card, hall-of-fame, auth-form, game-player); `components/home/`, `components/about/`, `components/games/game-canvas.tsx`.
- `lib/games.ts` — static game catalog `GAMES` (ids, copy, cover class `.cover-<id>` in `app/globals.css`) and shared types.
- `lib/home-data.ts` — landing page data.
- `references/` — read-only sources: HTML/JSX design templates (`references/templates/`), original vanilla JS games (`references/started-games/`), source assets. Never modify.
- `demos/` — scratch, not part of the app.

### Game engine contract

- `lib/game-engine.ts` defines `GameEngine` (`start/pause/resume/restart/endGame/destroy`), `GameSnapshot` (`score`, `lives|null`, `level|null`, `status`) and `GameCallbacks` (`onChange` only on changes, `onGameOver` once).
- Each game lives in `lib/<id>/` (`constants`, `utils`, `input`, `entities` or `rules`, `engine`, optional `assets`/`sprites`). Engines: no globals, `dt` capped at 50 ms, `P`/`Escape` toggle pause, no PAUSE/GAME OVER overlays on canvas (React draws them), input listeners attached/detached on `window`.
- `lib/playable-games.ts` — `PLAYABLE_GAMES` registry keyed by game id: lazy `load()` via `import()` (preloads assets, never rejects), canvas `width`/`height` (800×600), `label`. Client-only.
- `components/games/game-canvas.tsx` mounts the engine (Strict-Mode safe, auto-pause on tab hide); `components/game-player.tsx` owns HUD, pause, end-of-game modal and score saving. Games not in `PLAYABLE_GAMES` fall back to the simulated player.
- Touch controls: `PlayableGame.touch` (`TouchLayout`: `directions`, `buttons` A/B with `code`, `repeat`) in `lib/playable-games.ts`; `components/games/touch-controls.tsx` renders the gamepad and `lib/touch-input.ts` (`createKeyHold`) dispatches synthetic `KeyboardEvent`s on `window` (same `code` as the keyboard, auto-repeat 170/50 ms only where listed in `repeat`), so engines are untouched. Shown only with `(hover: none) and (pointer: coarse)` (CSS). A new game gets a gamepad by declaring `touch`; its `input.ts` must read `e.code` on `window`. Verify with a Playwright context `hasTouch` + `isMobile` (`browser_run_code_unsafe`), not `browser_resize`.
- Game assets go in `public/games/<id>/` and are loaded as `/games/<id>/...`.
- Skins: every playable game must offer `clasico` (default), `neon` and `retro` (palettes in `lib/<id>/skins.ts`, hot-swappable via `GameEngine.setSkin`, listed in `PlayableGame.skins`). Run the `skin-designer` agent to audit/implement.

### Supabase

- Clients: `lib/supabase/server.ts` (`server-only`, cookies) and `lib/supabase/client.ts`; env in `lib/supabase/env.ts` (literal `process.env.NEXT_PUBLIC_*` access, required for client bundling). Types in `lib/supabase/database.types.ts`.
- Schema (`supabase/migrations/`): `games(id, title)` and `scores(game_id, user_id, player_name, score, created_at)` with RLS — public read, anonymous insert only with `user_id is null` and an existing `game_id`. Each new game is registered with a migration `<timestamp>_register_<id>.sql` (`insert into public.games ...`), applied via the Supabase MCP `apply_migration`.
- `lib/scores.ts` (server-only): `getRegisteredGameIds`, `getLeaderboard` (score desc, created_at asc). `lib/scores-shared.ts`: `PLAYER_NAME_RE = /^[A-Z0-9_]{3,12}$/`, `MAX_SCORE = 10_000_000` (shared client/server, mirrored in DB checks).
- Supabase MCP is configured in `.mcp.json`. After schema changes run `get_advisors` (security).

### Environment

See `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SUPABASE_DB_PASSWORD`. Real values live in `.env.local` (git-ignored).

## Configuration notes

- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. With `cacheComponents`, anything reading cookies/params (e.g. Supabase `createClient()`, `await params`) must run in an async component inside `<Suspense>` — see `app/salon/page.tsx` and `app/games/[id]/jugar/page.tsx`.
- Tailwind CSS v4 is wired via a Turbopack rule that runs `@tailwindcss/turbopack` on `*.css` (not the PostCSS plugin).
- Path alias: `@/*` maps to the repo root (e.g. `@/lib/...`).
- App Router only (`app/` at repo root, no `src/`).
- Prettier (`printWidth: 100`). A PostToolUse hook (`.claude/settings.json` → `.claude/hooks/format-on-write.mjs`) runs Prettier + ESLint on every file written/edited by Claude.
- localStorage keys: `av_user` (mock session), `av_scores` (mock games' scores), `av_player_name` (last ranking name), `av_skins` (chosen skin per game id).
