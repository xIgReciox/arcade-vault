# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform for playing games online and competing for the highest score (per README, in Spanish). The project follows Spec Driven Design using the `/spec` and `/spec-impl` skills from `Klerith/fernando-skills` (installed via `npx skills@latest add Klerith/fernando-skills`). Currently it is a fresh Create Next App scaffold (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`) with no game code yet.



## Next.js version warning

Next 16.4.6 / React 19.3 — APIs differ from older training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices. `next dev` re-adds the `AGENTS.md` block if removed.

## Skills
Usa siempre /frontend-design para diseñar interfaces de usuario


## Configuration notes

- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. `cacheComponents` changes caching/data-fetching semantics (e.g. dynamic data access must be handled with Suspense or explicit caching), so consult the docs before writing data-fetching code.
- Tailwind CSS v4 is wired via a Turbopack rule that runs `@tailwindcss/turbopack` on `*.css` (not the PostCSS plugin).
- Path alias: `@/*` maps to the repo root (e.g. `@/app/...`).
- App Router only (`app/` at repo root, no `src/`).
