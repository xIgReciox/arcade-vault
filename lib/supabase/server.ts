import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Con cacheComponents, quien lo llame desde un Server Component debe hacerlo dentro de <Suspense>.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Se llamó desde un Server Component, donde no se pueden escribir cookies.
          // Se ignora: el refresco de sesión lo hará el proxy.ts del spec de Auth.
        }
      },
    },
  });
}
