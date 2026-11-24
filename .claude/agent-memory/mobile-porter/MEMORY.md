# Memoria de mobile-porter

Historial de cumplimiento: [mobile.md](mobile.md).

## Umbrales

- Viewports móvil: 390×844 y 360×740 (contexto `hasTouch` + `isMobile`); escritorio 1280×800.
- Breakpoint de layout móvil: ≤ 720 px (el mismo que usa `app/globals.css`).
- Mando: objetivos ≥ 56 px, botones circulares ≥ 64 px. Resto de la web: objetivos ≥ 44 px.
- Inputs ≥ 16 px (iOS no hace zoom). Texto ≥ 12 px. Sin scroll horizontal; en el reproductor, sin scroll vertical.

## Contrato (SPEC 11)

- `PlayableGame.touch` (`directions`, `buttons` A/B con `code`, `repeat`) en `lib/playable-games.ts`.
- `components/games/touch-controls.tsx` + `lib/touch-input.ts` (`createKeyHold`, repeat 170/50 ms).
- Mando visible solo con `(hover: none) and (pointer: coarse)`. Motores intactos.

## Preferencias del equipo

- Web solo oscura, UI en español.
- Screenshots en `.playwright-screenshots/`.
- Cambios visuales con `/frontend-design`.

## Lecciones

- `browser_resize` no emula `pointer: coarse`: usar contexto nuevo con `hasTouch` + `isMobile` en `browser_run_code_unsafe`.
- El navegador del MCP Playwright puede estar compartido con otros agentes (te cambia la URL): usar un script propio con el `playwright` de la caché npx (`~/AppData/Local/npm-cache/_npx/*/node_modules/playwright`, `channel: "chrome"`).
- El hook Prettier reformatea entero cualquier CSS editado (`globals.css`): ten en cuenta el diff grande; los estilos nuevos de un componente, mejor en Tailwind dentro del componente.
- Con `cacheComponents`, lo que lee cookies/params va en un componente async dentro de `<Suspense>`.
- Una tecla pegada es el fallo típico del mando: probar `pointercancel`, pausa, fin y `blur`.
