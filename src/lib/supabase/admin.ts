import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import type { Database } from "./tipos-db";

/**
 * Cliente con la clave SECRETA de Supabase: se salta las reglas RLS.
 * Úsalo solo en el servidor y solo para tareas puntuales (crear cuentas, el demo).
 * Nunca lo importes desde un componente "use client".
 */
export function crearClienteAdmin() {
  const claveSecreta = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !claveSecreta) {
    throw new Error("Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(SUPABASE_URL, claveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
