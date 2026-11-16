# SPEC 02 — Home (landing page) y reubicación de la Biblioteca en /games

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-16
> **Objective:** Convertir `/` en la landing page del template `references/templates/home-about/home.jsx` y mover la Biblioteca y las rutas de juego de `/` y `/juegos/*` a `/games` y `/games/*`.

---

## Por qué existe este spec

El SPEC 01 dejó la Biblioteca en `/` porque no había landing. El template `home-about` define un Home de marketing (hero, beneficios, juegos, stats, actividad, precios, CTA final) que debe ser la puerta de entrada. Eso obliga a mover la Biblioteca y a renombrar las rutas de juego para que sean coherentes (`/games`, `/games/[id]`, `/games/[id]/jugar`). Este spec reemplaza las rutas del SPEC 01; el resto de su comportamiento no cambia.

---

## Alcance

**Dentro:**

- Nueva landing en `/` con las secciones del template `home.jsx`, en este orden:
  - Hero: eyebrow "INSERTA UNA MONEDA", título de 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" y "CREAR CUENTA", indicador "DESLIZA" y 8 siluetas pixel flotantes (SVG decorativos).
  - `// 01` ¿POR QUÉ ARCADE VAULT?: 4 tarjetas de beneficios con icono pixel SVG.
  - `// 02` JUEGOS DISPONIBLES AHORA: 6 mini-tarjetas (`GAMES.slice(0, 6)`) y botón "VER TODOS LOS JUEGOS →".
  - Banda de stats (3 bloques).
  - `// 03` ACTIVIDAD EN VIVO: "Últimas puntuaciones" (7 filas) y "Top jugadores · hoy" (5 filas con barra) con link "VER SALÓN →".
  - `// 04` PRECIOS: tarjeta "JUGADOR VAULT" y 3 preguntas frecuentes.
  - CTA final "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →".
- Animación de aparición al hacer scroll (clase `.reveal` → `.in` con `IntersectionObserver`), como en el template.
- Mover la Biblioteca a `/games` (mismo componente `Library`, sin cambios de diseño).
- Renombrar `app/juegos/` a `app/games/`: `/games/[id]` (detalle) y `/games/[id]/jugar` (reproductor). Actualizar todos los links internos, los tipos `PageProps<...>` y el `metadata`.
- Cambiar las redirecciones y botones que hoy apuntan a `/` para que apunten a `/games`: login e invitado en `/auth`, "VOLVER AL VAULT" del reproductor y el botón de vuelta del Salón.
- Nav (escritorio y panel móvil) con el link nuevo "Inicio" (`/`), seguido de "Biblioteca" (`/games`) y "Salón de la Fama" (`/salon`). El logo sigue apuntando a `/`.
- Estado activo del nav: "Inicio" solo en `/`; "Biblioteca" en `/games` y `/games/*`; "Salón de la Fama" en `/salon`.
- Datos mock tipados de la landing en `lib/home-data.ts`.
- Estilos del Home copiados de `references/templates/home-about/styles.css` a `app/globals.css`.
- Textos en español, tal cual el template.

**Fuera de alcance (para specs futuros):**

- Página "Acerca de" (`about.jsx`), su formulario de contacto y el link "Acerca de" del nav. Va en su propio spec.
- Datos reales: "Últimas puntuaciones" y "Top jugadores · hoy" son texto fijo, no leen `av_scores` ni backend.
- Adaptar la landing a la sesión (por ejemplo, ocultar "CREAR CUENTA" si hay usuario). Los CTAs son estáticos.
- Redirecciones 301 de las URLs viejas `/juegos/*`. El proyecto no está publicado, no hay enlaces externos que proteger.
- Cambios de diseño sobre el template, tests automatizados, SEO avanzado e internacionalización.
- Preferencia `prefers-reduced-motion` para las animaciones, más allá de lo que ya traiga el CSS del template.

---

## Modelo de datos

Archivo nuevo: `lib/home-data.ts`. Datos copiados tal cual de `home.jsx`, solo con tipos.

```ts
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature { icon: FeatureIconKind; title: string; desc: string; color: NeonColor }
export interface HomeStat { n: string; u: string; s: string }
export interface RecentScore { player: string; game: string; score: number; when: string; color: NeonColor }
export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];       // 4
export const HOME_STATS: HomeStat[];    // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];  // 5
export const PRICING_PERKS: string[];   // 6
export const FAQ: FaqItem[];            // 3
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`.
- La barra de cada fila de `TOP_PLAYERS` mide `100 - índice * 16` por ciento, como en el template.
- Los ids de juego de la landing salen de `GAMES` en `lib/games.ts`; no se duplican.

Este spec no cambia `Game`, `ScoreRow`, `User` ni `SavedScore`.

---

## Plan de implementación

1. **Estilos del Home.** Copiar al final de `app/globals.css` las secciones `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css`, más cualquier clase usada por `home.jsx` que falte (`.reveal`, `.fade-in`, `@keyframes`). No copiar `ABOUT PAGE` ni `GAMEPAD`. Documentar en el commit las clases añadidas. Verificación: `npm run dev` carga sin errores de CSS y las pantallas existentes no cambian.
2. **Mover rutas de juego.** Mover `app/juegos/` a `app/games/` con `git mv`. Crear `app/games/page.tsx` que renderice `<Library />` con su `metadata`. Actualizar `game-card.tsx`, `game-player.tsx`, `app/games/[id]/page.tsx` y `app/games/[id]/jugar/page.tsx` (links, `PageProps`, `generateStaticParams`). Verificación: `/games`, `/games/caida` y `/games/caida/jugar` funcionan; `/juegos/caida` devuelve 404.
3. **Redirecciones a /games.** Cambiar `router.push("/")` en `components/auth-form.tsx`, el link "VOLVER AL VAULT" en `components/game-player.tsx` y el botón de `components/hall-of-fame.tsx` para que apunten a `/games`. Verificación: login e invitado terminan en `/games`.
4. **Datos del Home.** Crear `lib/home-data.ts` con los tipos y constantes. Verificación: `npx tsc --noEmit` pasa.
5. **Piezas de la landing.** Crear `components/home/silhouettes.tsx` (8 SVG decorativos con `aria-hidden`), `components/home/feature-icon.tsx` (4 iconos SVG), `components/home/mini-card.tsx` (usa `Link` a `/games/[id]`) y `components/home/reveal-observer.tsx` (Client Component que observa `.reveal`, añade `.in` y limpia con `disconnect()`). Verificación: `tsc` pasa.
6. **Landing en `/`.** Crear `components/home/home.tsx` (Server Component con las 6 secciones y los CTAs como `Link`) y reemplazar `app/page.tsx` para que renderice `Home` y `RevealObserver`, con `metadata` propio. Verificación: `/` muestra todas las secciones, los botones navegan a `/games`, `/auth` y `/salon`, y las secciones aparecen al hacer scroll.
7. **Nav.** En `components/nav.tsx` añadir "Inicio" en escritorio y en el panel móvil, apuntar "Biblioteca" a `/games` y ajustar `isActive` según el alcance. Verificación: el estado activo es correcto en `/`, `/games`, `/games/caida`, `/games/caida/jugar` y `/salon`.
8. **Cierre.** Revisar que no queden referencias a `/juegos` (`grep`) y ejecutar `npm run lint` y `npm run build`. Verificación: ambos pasan sin errores.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] No existe ninguna referencia a `/juegos` en `app/`, `components/` ni `lib/`.
- [ ] `/` renderiza el hero con el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" y 8 siluetas decorativas con `aria-hidden="true"`.
- [ ] `/` muestra 4 tarjetas de beneficios, 6 mini-tarjetas, 3 bloques de stats, 7 filas de últimas puntuaciones, 5 filas de top jugadores, 1 tarjeta de precios con 6 beneficios y 3 preguntas frecuentes.
- [ ] Las 6 mini-tarjetas corresponden a los 6 primeros elementos de `GAMES` y cada una navega a `/games/[id]`.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] Las filas de top jugadores 1, 2 y 3 tienen las clases `top1`, `top2` y `top3`.
- [ ] Las secciones con clase `.reveal` empiezan sin la clase `in` y la reciben al entrar en el viewport.
- [ ] `/games` muestra 8 tarjetas y el buscador, los chips y el estado vacío funcionan igual que en el SPEC 01.
- [ ] `/games/[id]` y `/games/[id]/jugar` funcionan; `/games/xyz` muestra 404 y `/juegos/caida` devuelve 404.
- [ ] Tras iniciar sesión o pulsar "JUGAR COMO INVITADO" en `/auth` se navega a `/games`.
- [ ] "VOLVER AL VAULT" en el reproductor y el botón de vuelta en `/salon` navegan a `/games`.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" en ese orden, en escritorio y en el panel móvil.
- [ ] "Inicio" está activo solo en `/`; "Biblioteca" está activo en `/games`, `/games/[id]` y `/games/[id]/jugar`; "Salón de la Fama" está activo en `/salon`.
- [ ] Con un ancho de 375 px, la landing no tiene scroll horizontal y el panel móvil incluye "Inicio".
- [ ] Ninguna pantalla muestra errores en la consola del navegador, incluyendo recargar `/` con sesión iniciada (sin errores de hidratación).
- [ ] `app/globals.css` solo gana las clases del Home; las reglas existentes no cambian.

---

## Decisiones tomadas y descartadas

- **Sí:** `/` es la landing y la Biblioteca va a `/games`. Es lo que pidió el usuario y deja a la landing como puerta de entrada natural.
- **No:** dejar la Biblioteca en `/` y poner el Home en `/inicio`. Evita tocar rutas, pero la landing no sería la página principal.
- **Sí:** renombrar `/juegos/*` a `/games/*`. Evita mezclar `/games` y `/juegos/...` en la misma sección.
- **No:** mantener `/juegos/[id]`. Menos cambios, pero deja una URL inconsistente.
- **No:** redirecciones desde `/juegos/*`. No hay tráfico ni enlaces externos aún.
- **Sí:** login, invitado y "VOLVER AL VAULT" van a `/games`. El usuario que acaba de entrar quiere jugar, no releer la landing.
- **Sí:** solo Home en este spec. "Acerca de" y su formulario de contacto quedan para otro spec; por eso el nav no incluye ese link todavía.
- **Sí:** datos de la landing en `lib/home-data.ts`, tipados y estáticos. Sigue el patrón de `lib/games.ts` y separa datos de marcado.
- **No:** hardcodear los datos en los componentes. Menos archivos, pero mezcla contenido y presentación.
- **Sí:** copiar las secciones de CSS a `app/globals.css`. Mantiene la convención de un solo archivo de estilos del SPEC 01.
- **No:** un `home.css` aparte. Aísla estilos, pero rompe esa convención.
- **Sí:** el Home es un Server Component; solo `RevealObserver` es cliente. El contenido es estático y no necesita estado.
- **Sí:** los textos se copian tal cual del template, incluido "12+ JUEGOS" aunque hoy haya 8 mock. Es contenido de marketing del diseño; cambiarlo es decisión de producto, no de este spec.
- **Sí:** mini-tarjetas con `Link` en lugar de `onClick` + `navigate`. Da navegación real y accesible.

---

## Riesgos identificados

| Riesgo                                                                                        | Mitigación                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Referencias olvidadas a `/` (como biblioteca) o `/juegos` tras el renombrado                  | Paso 8: `grep` de `/juegos` y revisión manual de los links que apuntaban a `/`.                                                             |
| Las secciones `.reveal` quedan invisibles si el observer no se ejecuta (JS lento o fallo)     | El hero no usa `.reveal`; el observer se limpia con `disconnect()` y, si no existe `IntersectionObserver`, añade `in` a todas las secciones. |
| `PageProps<"/games/[id]">` falla hasta regenerar los tipos de rutas de Next                   | Ejecutar `next dev` o `next build` tras mover las carpetas para regenerarlos; leer la guía de `params` en `node_modules/next/dist/docs/`.   |
| Conflictos de nombres de clase al copiar el CSS (`.fade-in`, `.section-title`, etc.)          | Comparar contra `globals.css` antes de pegar y añadir solo lo que falte, documentándolo en el commit.                                       |
| `cacheComponents` exige envolver en `Suspense` lo que acceda a datos dinámicos                | La landing usa solo datos estáticos y no accede a `cookies`, `headers` ni `searchParams`.                                                   |

---

## Qué **no** entra en este spec

- La página "Acerca de" y el formulario de contacto.
- Datos reales o dinámicos en "Actividad en vivo".
- Landing adaptada a la sesión del usuario.
- Redirecciones desde las URLs viejas `/juegos/*`.
- Cambios de diseño sobre el template.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
