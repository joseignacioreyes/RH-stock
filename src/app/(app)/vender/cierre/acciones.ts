"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerNumero } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function cerrarCaja(fecha: string, _estado: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: "En el negocio de ejemplo no se guarda el cierre. Crea tu cuenta para usarlo de verdad." };
  const contado = leerNumero(String(formData.get("contado") ?? ""));
  if (contado === null || contado < 0) return { error: "Escribe el efectivo con números, por ejemplo 45.000." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cerrar_caja", { p_fecha: fecha, p_efectivo_contado: Math.round(contado) });
  if (error) {
    console.error("cerrarCaja:", error);
    return { error: "No pudimos guardar el cierre. Revisa tu internet e intenta de nuevo." };
  }
  revalidatePath("/vender/cierre");
  redirect("/vender/cierre?listo=1");
}
