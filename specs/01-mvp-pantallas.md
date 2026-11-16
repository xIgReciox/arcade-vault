# SPEC 01 — MVP visual: todas las pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** Ninguna (el tema CSS y las fuentes ya existen en `app/globals.css` y `app/layout.tsx`)
> **Date:** 2026-11-16
> **Objective:** Portar a Next.js App Router las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor, auth y salón de la fama) con datos mock y sin ningún juego real.

---

## Por qué existe este spec

El diseño ya está resuelto en `references/templates/` como una SPA React 18 con Babel en el navegador y routing por hash. Este spec traduce ese prototipo a la arquitectura real del proyecto (Next 16, App Router, TypeScript) sin cambiar el aspecto visual. Los juegos y el backend quedan para specs posteriores.

---

## Alcance

**Dentro:**

- Cinco rutas reales del App Router:
  - `/` — Biblioteca (hero, buscador, chips de categoría, grilla de tarjetas con tilt 3D).
  - `/juegos/[id]` — Detalle del juego (portada, tags, stats, ranking top 10).
  - `/juegos/[id]/jugar` — Reproductor (HUD, pantalla CRT, pausa, fin de juego, modal de puntuación).
  - `/auth` — Iniciar sesión / Crear cuenta / Jugar como invitado.
  - `/salon` — Salón de la Fama (tabs por juego, podio, tabla, fila "tu mejor marca").
- Layout global con `Nav` (logo, links, contador de créditos, botón de sesión, menú móvil con panel lateral) y footer, según `nav.jsx` y `app.jsx`.
- Datos mock tipados en TypeScript: los 8 juegos, las categorías y el generador determinista `seededScores`.
- Sesión simulada en `localStorage` (`av_user`) con un contexto React.
- Reproductor con puntuación simulada por intervalo y guardado en `localStorage` (`av_scores`).
- Estado 404 para un `id` de juego inexistente.
- Textos en español, igual que el template.

**Fuera de alcance (para specs futuros):**

- Cualquier juego real (canvas, lógica, controles). El reproductor muestra la arena decorativa del template.
- Backend, base de datos o autenticación real (OAuth, contraseñas, sesiones de servidor).
- Los botones GOOGLE y GITHUB de `/auth` son decorativos y no hacen nada.
- Persistir o mostrar en los rankings las puntuaciones guardadas en `av_scores`. Se guardan, pero ninguna pantalla las lee.
- Internacionalización, SEO avanzado, tests automatizados y accesibilidad más allá de lo que ya trae el template.
- Cambios al diseño visual respecto a los templates.

---

## Modelo de datos

Archivo nuevo: `lib/games.ts`.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;            // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;         // clase CSS de globals.css: "cover-bricks", ...
  color: CoverColor;
  best: number;          // mejor puntuación global (mock)
  plays: string;         // "12.4K" (texto ya formateado)
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;          // "DD/MM/2026"
}

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export const GAMES: Game[];
export function getGame(id: string): Game | undefined;
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión (`localStorage`, clave `av_user`):

```ts
export interface User { name: string } // mayúsculas, máx. 10 caracteres
```

Puntuaciones guardadas (`localStorage`, clave `av_scores`):

```ts
export interface SavedScore { game: string; score: number; name: string; at: number }
```

Convenciones:

- Los datos de `GAMES` y el algoritmo de `seededScores` se copian tal cual de `references/templates/data.jsx`, solo con tipos.
- Semillas idénticas al template: detalle `id.length * 17 + 3` (10 filas), salón `tab.length * 23 + 7` (12 filas).
- Números formateados con `toLocaleString("es-ES")`.
- Todo acceso a `localStorage` va dentro de `try/catch`.

---

## Plan de implementación

1. **Datos mock.** Crear `lib/games.ts` con tipos, `GAMES`, `CATS`, `getGame` y `seededScores`. Verificación: `npx tsc --noEmit` pasa.
2. **Sesión simulada.** Crear `components/auth-provider.tsx` (Client Component) con contexto `{ user, login, signOut }`. Lee `av_user` después de montar para evitar errores de hidratación. Verificación: `tsc` pasa.
3. **Layout global.** Crear `components/nav.tsx` y `components/footer.tsx`. Modificar `app/layout.tsx` para envolver en `AuthProvider`, renderizar `Nav`, `<main className="av-main">` y el footer. Mantener `av-bg` y `av-noise`. Verificación: `npm run dev`, el nav y el footer se ven en `/`. El menú hamburguesa abre y cierra el panel móvil.
4. **Biblioteca.** Crear `components/game-card.tsx` (tilt 3D, navega a `/juegos/[id]`) y `components/library.tsx` (hero, buscador, chips, estado vacío). Reemplazar el scaffold de `app/page.tsx`. Verificación: buscar y filtrar funciona, el estado vacío aparece con una búsqueda sin resultados.
5. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` y `notFound()` para ids inválidos. Seguir la guía de `params` asíncrono de `node_modules/next/dist/docs/`. Verificación: `/juegos/caida` muestra portada, stats y 10 filas de ranking; `/juegos/xyz` devuelve 404.
6. **Reproductor.** Crear `components/game-player.tsx` (Client Component: HUD, CRT, pausa, FIN, SALIR, modal de fin de juego, guardado en `av_scores`) y `app/juegos/[id]/jugar/page.tsx`. Verificación: la puntuación sube cada ~220 ms, PAUSA la detiene, FIN abre el modal, GUARDAR escribe en `av_scores`.
7. **Auth.** Crear `components/auth-form.tsx` y `app/auth/page.tsx` (tabs, campo de correo solo en "Crear cuenta", invitado, botones sociales decorativos). Verificación: enviar el formulario guarda `av_user`, redirige a `/` y el nav muestra el nombre; invitado redirige sin usuario.
8. **Salón de la Fama.** Crear `components/hall-of-fame.tsx` y `app/salon/page.tsx` (tabs, podio, tabla animada, fila "tu mejor marca" solo con sesión). Verificación: cambiar de tab cambia podio y tabla; la fila del usuario aparece solo con sesión.
9. **Pulido de metadatos y navegación.** Ajustar el estado activo del nav (`/juegos/*` marca Biblioteca) y definir `metadata` por ruta. Verificación: `npm run lint` y `npm run build` pasan sin errores.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth` y `/salon`, y todas cargan sin errores en la consola del navegador.
- [ ] `/` muestra 8 tarjetas de juego; al escribir "caida" en el buscador queda 1 tarjeta.
- [ ] El chip "SHOOTER" muestra exactamente INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra el mensaje "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]`.
- [ ] `/juegos/[id]` muestra 10 filas de ranking; las 3 primeras tienen las clases `top1`, `top2` y `top3`.
- [ ] `/juegos/inexistente` muestra la página 404.
- [ ] "JUGAR AHORA" navega a `/juegos/[id]/jugar` y "VOLVER AL VAULT" navega a `/`.
- [ ] En el reproductor, la puntuación aumenta con el tiempo, PAUSA la detiene y muestra "EN PAUSA", y REANUDAR la reanuda.
- [ ] En el reproductor, FIN abre el modal "FIN DEL JUEGO" con la puntuación final; GUARDAR PUNTUACIÓN añade una entrada a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA".
- [ ] En el reproductor, JUGAR DE NUEVO reinicia puntuación, vidas y nivel; SALIR navega a `/juegos/[id]`.
- [ ] El nombre en el reproductor es "INVITADO" sin sesión y el nombre del usuario con sesión.
- [ ] En `/auth`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de `/auth` guarda `localStorage["av_user"]` con el nombre en mayúsculas y máximo 10 caracteres, y redirige a `/`.
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin guardar `av_user`.
- [ ] Con sesión, el nav muestra el nombre de usuario; al hacer clic se cierra la sesión y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] Recargar la página conserva la sesión sin errores de hidratación en la consola.
- [ ] `/salon` muestra 8 tabs, un podio con 3 puestos y 12 filas en la tabla.
- [ ] En `/salon`, la fila "TU MEJOR MARCA" aparece con sesión y no aparece sin sesión.
- [ ] Con un ancho de 375 px, el menú hamburguesa abre el panel con los links y se cierra al pulsar el fondo.
- [ ] El nav marca "Biblioteca" como activo en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`, y "Salón de la Fama" como activo en `/salon`.
- [ ] `app/globals.css` no tiene cambios de diseño respecto a su estado actual, salvo que una clase faltante lo exija y quede documentada en el commit.

---

## Decisiones tomadas y descartadas

- **Sí:** rutas reales del App Router. Dan URLs compartibles, aprovechan `cacheComponents` y no arrastran el routing por hash del template.
- **No:** una sola ruta cliente con hash. Es más rápido, pero desaprovecha Next y rompe enlaces directos.
- **Sí:** reutilizar el `globals.css` ya portado (clases del template como `.card`, `.crt`, `.av-nav`). Garantiza fidelidad visual y la rama `01-styles` ya lo dejó hecho.
- **No:** reescribir con Tailwind o CSS Modules. Más trabajo y riesgo de divergir del diseño sin aportar valor al MVP.
- **Sí:** sesión simulada en `localStorage` con contexto React. Es lo que hace el template y cubre el flujo visual sin backend.
- **No:** autenticación real. Va en otro spec cuando exista backend.
- **Sí:** mock estático en TypeScript (`lib/games.ts`) con `seededScores` determinista. Los rankings no cambian entre renders ni recargas.
- **No:** leer `av_scores` en los rankings. Mezclar datos reales con mock complica el modelo; se difiere.
- **Sí:** reproductor con puntuación simulada, para poder probar el flujo completo de fin de juego y guardado.
- **No:** juego real en el reproductor. El alcance es solo la parte visual.
- **Sí:** Server Components por defecto; `"use client"` solo donde hay estado, efectos o `localStorage` (nav, biblioteca, tarjeta, reproductor, auth, salón).
- **Sí:** leer `localStorage` después del montaje. Evita desajustes de hidratación entre servidor y cliente.

---

## Riesgos identificados

| Riesgo                                                                                    | Mitigación                                                                                                |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Next 16 / `cacheComponents` cambia `params`, `useSearchParams` y el acceso a datos dinámicos | Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de cada paso y usar `Suspense` si hace falta. |
| Errores de hidratación por leer `localStorage` en el primer render                        | Estado inicial `null` y lectura en `useEffect`; el nav no depende del usuario para el HTML del servidor.   |
| `localStorage` bloqueado (modo privado)                                                   | `try/catch` en todo acceso; la app funciona sin persistir.                                                |
| `globals.css` no cubre alguna clase usada por los templates                               | Comparar contra `references/templates/styles.css` y añadir solo la clase faltante, documentándolo.        |
| Los efectos del reproductor (intervalo, subida de nivel) se duplican en modo estricto     | Limpiar el intervalo en el cleanup del efecto y evitar efectos que dependan de `Math.random` en el render. |

---

## Qué **no** entra en este spec

- Ningún juego real ni lógica de juego.
- Backend, base de datos, OAuth o contraseñas reales.
- Que los rankings muestren las puntuaciones guardadas en `av_scores`.
- Tests automatizados.
- Cambios de diseño sobre los templates.

Cada uno de estos puntos, si se aborda, va en su propio spec.
