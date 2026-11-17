import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "./config";
import type { Database } from "./tipos-db";

/**
 * Cliente de Supabase para el servidor, con la sesión de la persona (cookies).
 * Respeta las reglas RLS: solo ve los datos de su negocio.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) => almacenCookies.set(name, value, options));
        } catch {
          // Desde una pantalla (Server Component) no se pueden escribir cookies.
          // No pasa nada: src/proxy.ts renueva la sesión en cada visita.
        }
      },
    },
  });
}
