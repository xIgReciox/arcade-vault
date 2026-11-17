# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-16
> **Objective:** Crear la página `/about` idéntica al template `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real al equipo mediante Resend desde una Server Action.

---

## Por qué existe este spec

El SPEC 02 dejó fuera la página "Acerca de" y su formulario. El template ya define el diseño completo (misión, 3 highlights, divisor pixelado, formulario con estado de éxito tipo terminal), pero su envío es simulado (`setSent(...)`). Este spec lo convierte en un envío real, lo que introduce una dependencia externa (Resend), variables de entorno y estados de error que el template no tiene.

---

## Alcance

**Dentro:**

- Nueva ruta `/about` con el contenido de `about.jsx`, sin cambios de diseño ni de texto:
  - Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 highlights con icono pixel SVG (`HEART`, `BROWSER`, `PLANT`).
  - Divisor decorativo `.about-divider` con 24 píxeles animados (`aria-hidden`).
  - Sección de contacto: kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips con LED y formulario (NOMBRE, CORREO ELECTRÓNICO, MENSAJE, botón "▶  ENVIAR MENSAJE").
  - Estado de éxito `terminal-success` con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}." y botón "ENVIAR OTRO MENSAJE".
- Animación de aparición al hacer scroll (`.reveal` → `.in`) reutilizando `components/home/reveal-observer.tsx`.
- Efecto `shake` del formulario cuando falta algún campo (comportamiento del template).
- Envío real con Resend desde una Server Action (`app/about/actions.ts`):
  - Validación en servidor: los 3 campos obligatorios, correo con formato válido, longitudes máximas.
  - Un único correo al equipo (`CONTACT_TO_EMAIL`) con nombre, correo y mensaje; `reply_to` es el correo del usuario. No hay correo de confirmación al usuario.
  - Cuerpo del correo en texto plano (sin HTML) y asunto sin saltos de línea.
  - Campo honeypot oculto: si viene relleno, la acción responde éxito sin enviar nada.
  - Estado de error visible en el formulario si la validación o Resend fallan, sin perder lo escrito.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`.
- Dependencia `resend` en `package.json`.
- Link "Acerca de" (`/about`) en el nav, escritorio y panel móvil, después de "Salón de la Fama", con estado activo en `/about`.
- Estilos `ABOUT PAGE` copiados de `references/templates/home-about/styles.css` a `app/globals.css`, más una clase mínima para el mensaje de error.
- Textos en español, tal cual el template.

**Fuera de alcance (para specs futuros):**

- Correo de confirmación o autorespuesta al usuario.
- Rate limiting por IP o CAPTCHA; solo se incluye el honeypot.
- Dominio verificado en Resend: se usa el remitente de prueba `onboarding@resend.dev` (solo entrega al correo de la cuenta de Resend). Pasar a dominio propio es cambiar `CONTACT_FROM_EMAIL`.
- Guardar los mensajes en base de datos o panel de administración.
- Cambios de diseño sobre el template, tests automatizados, SEO avanzado e internacionalización.
- Reintentos automáticos o cola de envíos si Resend falla.
- Sección `GAMEPAD` del CSS del template (no la usa `about.jsx`).

---

## Modelo de datos

No hay persistencia. Estructuras nuevas, solo de tipos, en `app/about/actions.ts`:

```ts
export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

// FormData esperado: name, email, msg, website (honeypot, debe llegar vacío)
```

Convenciones:

- Límites: `name` ≤ 80, `email` ≤ 254, `msg` ≤ 2000 caracteres, tras `trim()`.
- Asunto: `[Arcade Vault] Mensaje de {name}` con saltos de línea eliminados de `name`.
- `from`: `CONTACT_FROM_EMAIL`; `to`: `CONTACT_TO_EMAIL`; `replyTo`: correo del usuario.
- La clave `RESEND_API_KEY` solo se lee en el servidor; nunca lleva prefijo `NEXT_PUBLIC_`.

Este spec no cambia `Game`, `User`, `ScoreRow` ni los tipos de `lib/home-data.ts`.

---

## Plan de implementación

1. **Dependencia y entorno.** Ejecutar `npm install resend`. Crear `.env.example` con las 3 variables y añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignora). Verificación: `npm run dev` arranca y `.env.example` aparece en `git status`.
2. **Estilos de About.** Copiar al final de `app/globals.css` la sección `ABOUT PAGE` (líneas 1071–1150 del template) y la clase `.form-error` (borde y texto magenta, mismo estilo que los mensajes de `/auth`). Comprobar que `@keyframes shake` exista; añadirlo si falta. No copiar `GAMEPAD`. Verificación: `npm run dev` sin errores de CSS y las pantallas existentes no cambian.
3. **Iconos de highlights.** Crear `components/about/highlight-icon.tsx` con `HEART`, `BROWSER` y `PLANT` copiados de `about.jsx`. Verificación: `npx tsc --noEmit` pasa.
4. **Server Action.** Crear `app/about/actions.ts` con `"use server"` y `sendContact(prev, formData): Promise<ContactState>`: honeypot, validación, envío con `new Resend(process.env.RESEND_API_KEY).emails.send(...)`, y `try/catch` que devuelve `{ status: "error" }` con mensaje en español sin exponer detalles internos. Leer la guía de Server Actions en `node_modules/next/dist/docs/` antes de escribirla. Verificación: `tsc` pasa.
5. **Formulario cliente.** Crear `components/about/contact-form.tsx` (Client Component) con `useActionState(sendContact, { status: "idle" })`, el `shake` cuando falta un campo (comprobación previa en cliente, sin llamar a la acción), el campo honeypot oculto (`name="website"`, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`), el estado `terminal-success` y el mensaje `.form-error`. "ENVIAR OTRO MENSAJE" vuelve al formulario vacío. Verificación: `tsc` pasa.
6. **Página.** Crear `components/about/about.tsx` (Server Component con hero, divisor y sección de contacto que incluye `ContactForm`) y `app/about/page.tsx` que renderice `About` y `RevealObserver`, con `metadata` propio. Verificación: `/about` se ve igual que el template y el formulario envía un correo de prueba a `CONTACT_TO_EMAIL`.
7. **Nav.** En `components/nav.tsx` añadir "Acerca de" en escritorio y panel móvil, después de "Salón de la Fama", y ajustar `isActive` para `/about`. Verificación: el estado activo es correcto en `/`, `/games`, `/salon` y `/about`.
8. **Cierre.** Ejecutar `npm run lint` y `npm run build`; comprobar que `RESEND_API_KEY` no aparece en `.next/static`. Verificación: ambos pasan y el grep no devuelve resultados.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/about` muestra el título "ACERCA DE ARCADE VAULT", el párrafo de misión y 3 highlights con sus iconos.
- [ ] `/about` muestra el divisor con 24 píxeles, marcado `aria-hidden="true"`.
- [ ] La sección de contacto muestra "CONTÁCTANOS", 3 tips y los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [ ] Las secciones `.reveal` empiezan sin la clase `in` y la reciben al entrar en el viewport.
- [ ] Enviar con algún campo vacío aplica la clase `shake` durante 400 ms y no dispara ninguna petición.
- [ ] Con datos válidos y variables configuradas, llega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {name}`, el mensaje en texto plano y `reply_to` igual al correo del usuario.
- [ ] Tras un envío correcto aparece el panel terminal con "GRACIAS, {NOMBRE EN MAYÚSCULAS}." y "ENVIAR OTRO MENSAJE" devuelve el formulario vacío.
- [ ] Un correo sin formato válido, un campo por encima de su longitud máxima o un campo vacío enviado directamente a la acción devuelven `status: "error"` sin llamar a Resend.
- [ ] Si Resend falla (por ejemplo con una `RESEND_API_KEY` inválida), el formulario muestra un mensaje de error en español y conserva lo escrito.
- [ ] Con el honeypot relleno, la acción devuelve éxito y no se envía ningún correo.
- [ ] Un nombre con saltos de línea no produce saltos de línea en el asunto.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en `.next/static`.
- [ ] `.env.example` existe, está versionado y lista las 3 variables sin valores reales.
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de" en ese orden, en escritorio y panel móvil.
- [ ] "Acerca de" está activo solo en `/about`.
- [ ] Con un ancho de 375 px, `/about` no tiene scroll horizontal.
- [ ] Ninguna pantalla muestra errores en la consola del navegador, incluyendo recargar `/about` (sin errores de hidratación).
- [ ] `app/globals.css` solo gana las clases de About y `.form-error`; las reglas existentes no cambian.

---

## Decisiones tomadas y descartadas

- **Sí:** Server Action para el envío. No expone un endpoint público, encaja con App Router y `useActionState` y mantiene la API key en el servidor.
- **No:** Route Handler `POST /api/contact`. Funciona, pero añade un endpoint expuesto y más código de cliente sin necesitarlo.
- **Sí:** remitente `onboarding@resend.dev` y destino por variable de entorno. Permite probar hoy sin dominio; migrar a dominio verificado solo cambia `CONTACT_FROM_EMAIL`.
- **No:** exigir dominio verificado desde ya. Bloquearía la implementación por un trámite externo.
- **Sí:** un solo correo al equipo con `reply_to` al usuario. Responder desde el cliente de correo llega directo al usuario.
- **No:** autorespuesta al usuario. Duplica envíos y exige dominio verificado.
- **Sí:** validación en servidor además del chequeo de campos vacíos en cliente. El cliente solo mejora la UX; la acción nunca confía en él.
- **Sí:** honeypot como único anti-spam. Costo casi nulo y frena bots simples.
- **No:** rate limit o CAPTCHA. Requieren almacenamiento o un servicio externo; si el spam aparece, va en otro spec.
- **Sí:** cuerpo del correo en texto plano. Evita inyección de HTML con contenido del usuario.
- **Sí:** ruta `/about` en inglés, igual que `/games`. Mantiene la convención de rutas del SPEC 02.
- **Sí:** añadir una clase `.form-error` y un estado de error aunque el template no los tenga. Con un envío real, el fallo es un caso normal y no puede ser silencioso. Es la única desviación visual del template.
- **Sí:** página como Server Component; solo `ContactForm` y `RevealObserver` son cliente.
- **Sí:** reutilizar `RevealObserver` del SPEC 02 en lugar de duplicar el `IntersectionObserver` de `about.jsx`.

---

## Riesgos identificados

| Riesgo                                                                                      | Mitigación                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding@resend.dev` solo entrega al correo de la cuenta de Resend                       | `CONTACT_TO_EMAIL` debe ser ese correo mientras no haya dominio verificado; se documenta en `.env.example`.                     |
| Faltan las variables de entorno y el envío falla en silencio                                | La acción comprueba que existan y devuelve `status: "error"` con mensaje genérico; el detalle solo se registra con `console.error`. |
| Fuga de la API key al cliente                                                               | Solo se lee en `actions.ts` (`"use server"`), sin prefijo `NEXT_PUBLIC_`; criterio de aceptación comprueba `.next/static`.      |
| `.env.example` ignorado por `.env*` en `.gitignore`                                         | Paso 1 añade la excepción `!.env.example`.                                                                                      |
| Next 16 cambia el comportamiento de Server Actions o `useActionState` respecto a lo conocido | Leer la guía en `node_modules/next/dist/docs/` antes del paso 4, como pide `AGENTS.md`.                                         |
| Abuso por bots que ignoran el honeypot                                                      | Aceptado en este spec; el rate limit queda para uno futuro.                                                                     |
| `cacheComponents` exige `Suspense` para datos dinámicos                                     | `/about` no accede a `cookies`, `headers` ni `searchParams`; la acción solo corre en el envío.                                  |

---

## Qué **no** entra en este spec

- Correo de confirmación al usuario.
- Rate limiting, CAPTCHA o cualquier anti-spam más allá del honeypot.
- Dominio verificado en Resend.
- Almacenar los mensajes o un panel para leerlos.
- Cambios de diseño sobre el template (salvo el mensaje de error).
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
