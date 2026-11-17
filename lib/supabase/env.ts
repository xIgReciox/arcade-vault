// Las variables se referencian de forma literal para que Next las inyecte en el cliente.
// No usar process.env[nombre]: el acceso dinámico no se sustituye en el bundle del navegador.

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Defínela en .env.local (consulta .env.example).`,
    );
  }
  return valor;
}

export const supabaseUrl = requerida(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const supabasePublishableKey = requerida(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
