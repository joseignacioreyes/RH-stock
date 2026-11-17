import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseConfigurado } from "./supabase/config";
import { crearClienteServidor } from "./supabase/servidor";

export type Rol = "dueno" | "empleado" | "admin";

export type Sesion = {
  usuario: { id: string; nombre: string; rol: Rol };
  empresa: { id: string; nombre: string; esDemo: boolean } | null;
};

/**
 * Quién inició sesión y de qué negocio es. Devuelve null si no hay sesión.
 * Se calcula una sola vez por visita aunque varias pantallas lo pidan.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  if (!supabaseConfigurado) return null;
  const supabase = await crearClienteServidor();

  const { data: datosSesion } = await supabase.auth.getClaims();
  const usuarioId = datosSesion?.claims?.sub;
  if (!usuarioId) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, empresa:empresas(id, nombre_fantasia, es_demo)")
    .eq("id", usuarioId)
    .maybeSingle();
  if (!usuario) return null;

  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol as Rol },
    empresa: usuario.empresa
      ? { id: usuario.empresa.id, nombre: usuario.empresa.nombre_fantasia, esDemo: usuario.empresa.es_demo }
      : null,
  };
});

/** Para pantallas de un negocio: exige sesión de dueño o empleado. */
export async function exigirSesionDeNegocio(): Promise<Sesion & { empresa: NonNullable<Sesion["empresa"]> }> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/entrar");
  if (sesion.usuario.rol === "admin" || !sesion.empresa) redirect("/admin");
  return sesion as Sesion & { empresa: NonNullable<Sesion["empresa"]> };
}

/** Para el panel de administrador: exige ser administrador de RH Stock. */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/entrar");
  if (sesion.usuario.rol !== "admin") redirect("/inicio");
  return sesion;
}

/** Primer nombre, para saludar: "José Reyes" → "José". */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
