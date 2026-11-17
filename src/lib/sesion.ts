import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { suscripcionDesdeFila, type Suscripcion } from "./suscripcion";
import { supabaseConfigurado } from "./supabase/config";
import { crearClienteServidor } from "./supabase/servidor";

export type Rol = "dueno" | "empleado" | "admin";

export type Sesion = {
  usuario: { id: string; nombre: string; rol: Rol };
  empresa: {
    id: string;
    nombre: string;
    esDemo: boolean;
    /** Plan y estado del pago (calculado en el momento). */
    suscripcion: Suscripcion;
    /** Más de 10 días de atraso: puede mirar todo, pero no registrar nada hasta que se confirme el pago. */
    suspendida: boolean;
  } | null;
};

/** Mensaje cuando el negocio quedó solo para mirar por atraso en el pago. */
export const MENSAJE_SUSPENDIDA =
  "Tu cuenta está solo para mirar porque el pago está atrasado. Paga y sube el comprobante en Más → Mi plan para volver a usarla. Tus datos están seguros.";

const SUSCRIPCION_PILOTO: Suscripcion = {
  plan: "piloto",
  precioMensual: 0,
  diaPago: 5,
  proximoVencimiento: null,
  periodo: null,
  estado: "al_dia",
  soloLecturaDesde: null,
  pagoEnRevision: false,
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

  const [{ data: usuario }, { data: plan }] = await Promise.all([
    supabase.from("usuarios").select("id, nombre, rol, empresa:empresas(id, nombre_fantasia, es_demo)").eq("id", usuarioId).maybeSingle(),
    supabase.rpc("mi_suscripcion"),
  ]);
  if (!usuario) return null;

  const suscripcion = plan?.[0] ? suscripcionDesdeFila(plan[0]) : SUSCRIPCION_PILOTO;
  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol as Rol },
    empresa: usuario.empresa
      ? {
          id: usuario.empresa.id,
          nombre: usuario.empresa.nombre_fantasia,
          esDemo: usuario.empresa.es_demo,
          suscripcion,
          suspendida: !usuario.empresa.es_demo && suscripcion.estado === "suspendido",
        }
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
