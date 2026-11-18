import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Cliente de Supabase para Client Components.
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
