import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "./config";
import type { Database } from "./tipos-db";

/** Cliente de Supabase para el navegador (por ejemplo, para iniciar sesión). */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA);
}
