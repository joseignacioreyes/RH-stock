"use server";

import { redirect } from "next/navigation";
import { erroresPorCampo, esquemaNuevaClave, primerError } from "@/lib/cuentas";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoNuevaClave = { error?: string; errores?: Record<string, string> };

export async function guardarNuevaClave(_estado: EstadoNuevaClave, formData: FormData): Promise<EstadoNuevaClave> {
  const validacion = esquemaNuevaClave.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return { error: primerError(validacion.error), errores: erroresPorCampo(validacion.error) };
  }

  const sesion = await obtenerSesion();
  if (sesion?.empresa?.esDemo) {
    return { error: "En el negocio de ejemplo no se puede cambiar la clave." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: validacion.data.clave });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Esa es tu clave anterior. Elige una distinta.", errores: { clave: "Elige una clave distinta." } };
    }
    if (error.code === "weak_password") {
      return { error: "Esa clave es muy fácil de adivinar. Usa otra más larga.", errores: { clave: "Elige una clave más segura." } };
    }
    return { error: "No pudimos guardar tu clave. Pide un enlace nuevo por WhatsApp." };
  }

  redirect("/inicio?clave=cambiada");
}
