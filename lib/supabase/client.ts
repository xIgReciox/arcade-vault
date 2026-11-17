import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "./env";

// Cliente de Supabase para Client Components.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
