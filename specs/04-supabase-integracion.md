# SPEC 04 — Integración base de Supabase en Next.js

> **Status:** Implementado
  **Depends on:** SPEC 03
> **Date:** 2026-11-17
> **Objective:** Instalar y configurar los clientes de Supabase (navegador y servidor) con `@supabase/ssr` y la publishable key, sin tocar todavía ninguna pantalla, tabla ni flujo de login.

---

## Por qué existe este spec

La app solo tiene datos falsos en localStorage (`av_user`, `av_scores`) y mocks (`seededScores`). El proyecto de Supabase (`wljsonyvaxqxsgqfucjw`) ya existe, configurado en `.mcp.json`, pero está vacío y la app no tiene ninguna dependencia de Supabase. Este spec solo pone la base: dependencias, variables de entorno y dos fábricas de cliente. Así, los specs de Auth y de puntuaciones parten de una integración ya probada y no la mezclan con lógica de producto.

---

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js`, `@supabase/ssr` y `server-only` en `package.json`.
- Variables de entorno públicas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  - Documentadas en `.env.example`, sin valores reales.
  - Con su valor real en `.env.local`, obtenido del proyecto (URL `https://wljsonyvaxqxsgqfucjw.supabase.co` y la publishable key `sb_publishable_...`).
- `lib/supabase/client.ts`: función `createClient()` para Client Components, basada en `createBrowserClient`.
- `lib/supabase/server.ts`: función async `createClient()` para Server Components, Server Actions y Route Handlers. Usa `createServerClient` con `cookies()` de `next/headers` (`getAll` / `setAll`) y lleva `import "server-only"`.
- `lib/supabase/env.ts`: lee las dos variables y lanza un error claro en español si falta alguna.

**Fuera de alcance (para specs futuros):**

- Login, registro, OAuth y la sustitución de `components/auth-provider.tsx` / `av_user` (spec de Auth).
- `proxy.ts` con `updateSession` para refrescar la sesión (spec de Auth).
- Tablas, perfiles, RLS y migraciones (`supabase/migrations`).
- Puntuaciones reales, Salón de la Fama con datos reales y sustitución de `av_scores` / `seededScores`.
- Tipos generados de la base de datos (`database.types.ts`) y clientes tipados con `<Database>`.
- Ruta de health check o script de prueba de conexión.
- Clave `service_role` / secret key y cliente admin.
- Cualquier cambio visual o de comportamiento en las pantallas existentes.

---

## Modelo de datos

Este spec no introduce tablas ni estructuras persistentes. Solo añade variables de entorno:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Convenciones:

- Ambas llevan `NEXT_PUBLIC_` porque las usa el cliente de navegador. La publishable key es pública por diseño.
- `SUPABASE_DB_PASSWORD` (ya en `.env.example`) no se usa en este spec y no se toca.
- Los clientes no se tipan con `<Database>` hasta que existan tablas.

Este spec no cambia `Game`, `User`, `ScoreRow`, `SavedScore` ni los tipos de `lib/home-data.ts`.

---

## Plan de implementación

1. **Dependencias.** Ejecutar `npm install @supabase/supabase-js @supabase/ssr server-only`. Verificación: `npm run dev` arranca y las pantallas no cambian.
2. **Entorno.** Añadir las 2 variables a `.env.example` (con comentario de dónde obtenerlas: Dashboard → Project Settings → API Keys). Poner los valores reales en `.env.local`, obtenidos con las herramientas MCP `get_project_url` y `get_publishable_keys`. Verificación: `git status` muestra `.env.example` modificado y `.env.local` sigue ignorado.
3. **Lectura de entorno.** Crear `lib/supabase/env.ts`, que exporta `supabaseUrl` y `supabasePublishableKey`. Las variables se referencian de forma literal (`process.env.NEXT_PUBLIC_SUPABASE_URL`) para que Next las inyecte en el cliente, y se lanza un `Error` en español si falta alguna. Verificación: `npx tsc --noEmit` pasa.
4. **Cliente de navegador.** Crear `lib/supabase/client.ts` con `createClient()` → `createBrowserClient(supabaseUrl, supabasePublishableKey)`. Verificación: `tsc` pasa.
5. **Cliente de servidor.** Antes de escribirlo, leer `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` y `02-guides/data-security.md`. Crear `lib/supabase/server.ts` con `import "server-only"` y `async createClient()`:
   - `const cookieStore = await cookies()`.
   - `getAll` devuelve `cookieStore.getAll()`.
   - `setAll` llama a `cookieStore.set(...)` dentro de `try/catch`, porque falla en Server Components y se ignora; el refresco de sesión lo hará el `proxy.ts` del spec de Auth.

   Verificación: `tsc` pasa.

6. **Cierre.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`. Verificación: los tres pasan sin errores.

---

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js`, `@supabase/ssr` y `server-only` en `dependencies`.
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales y conserva las 4 variables anteriores.
- [ ] `.env.local` tiene ambas variables con los valores del proyecto `wljsonyvaxqxsgqfucjw` y no aparece en `git status`.
- [ ] Existen `lib/supabase/env.ts`, `lib/supabase/client.ts` y `lib/supabase/server.ts`, cada uno con los exports descritos.
- [ ] `lib/supabase/server.ts` empieza con `import "server-only"` y usa `await cookies()`.
- [ ] Si falta una de las 2 variables, `env.ts` lanza un error en español con el nombre de la variable.
- [ ] No existe `proxy.ts` ni `middleware.ts` en el repo.
- [ ] Ningún archivo de `app/` ni `components/` importa de `lib/supabase/`.
- [ ] El proyecto de Supabase sigue sin tablas ni migraciones.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/`, `/games`, `/auth`, `/salon` y `/about` se ven y funcionan igual que antes.

---

## Decisiones tomadas y descartadas

- **Sí:** solo infraestructura en este spec. Mantiene el cambio pequeño y deja Auth y puntuaciones en specs propios.
- **No:** juntar infraestructura, Auth y puntuaciones. Tocaría demasiadas áreas a la vez.
- **Sí:** `@supabase/ssr` con un cliente de navegador y otro de servidor. Es el patrón oficial para App Router y guarda la sesión en cookies cuando llegue el login.
- **No:** usar solo `@supabase/supabase-js` con un cliente global. No comparte la sesión entre servidor y cliente.
- **Sí:** publishable key (`sb_publishable_...`). Es el formato que recomienda Supabase y se puede rotar de forma independiente.
- **No:** anon key JWT legacy.
- **No:** `proxy.ts` todavía. Sin login no hay sesión que refrescar; se añade en el spec de Auth.
- **No:** tipos generados por ahora. Con el esquema vacío no aportan nada; llegan con las primeras tablas.
- **No:** health check ni script de conexión. Por decisión del usuario, la verificación es `tsc` + `lint` + `build`.
- **No:** migraciones ni tablas. Llegan con el spec que las necesite.
- **Sí:** `lib/supabase/` como ubicación. Sigue la convención de `lib/` del proyecto y el alias `@/lib/supabase/...`.
- **Sí:** `env.ts` con validación. Un error explícito por variable ahorra depurar fallos crípticos de `createClient`.

---

## Riesgos identificados

| Riesgo                                                                                   | Mitigación                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents` exige `Suspense` para leer cookies; el cliente de servidor las lee     | Nadie usa el cliente de servidor en este spec. Los specs que lo usen deben llamarlo dentro de un `<Suspense>`, y queda documentado aquí. |
| `setAll` lanza error si se llama desde un Server Component                               | Va dentro de `try/catch`; el `proxy.ts` del spec de Auth se encarga del refresco.                                                        |
| Se usa el cliente de servidor desde un Client Component                                  | `import "server-only"` hace fallar el build.                                                                                             |
| Acceso dinámico a `process.env[...]` impide que Next inyecte las variables en el cliente | `env.ts` las referencia de forma literal.                                                                                                |
| Diferencias de API en Next 16 (`cookies()` async)                                        | El paso 5 obliga a leer la guía local de `cookies` antes de escribir el código.                                                          |
| Variables ausentes en otro entorno (CI o deploy)                                         | `.env.example` las documenta y `env.ts` falla con un mensaje claro.                                                                      |

---

## Qué **no** entra en este spec

- Login, registro, OAuth y `proxy.ts`.
- Tablas, RLS, perfiles y migraciones.
- Puntuaciones reales y Salón de la Fama con datos reales.
- Tipos generados de la base de datos.
- Health check o pruebas de conexión.
- Clave `service_role` y cliente admin.
- Cambios en las pantallas existentes.

Cada uno de estos puntos, si se aborda, va en su propio spec.
