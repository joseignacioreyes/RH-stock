"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Abre el producto del aviso (o "Mi plan", si es un aviso de pago) y lo marca como leído. */
export async function abrirAviso(avisoId: string, productoId: string | null, dePago = false): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  // En el demo los avisos quedan siempre igual (solo se mira).
  if (!empresa.esDemo) {
    const supabase = await crearClienteServidor();
    await supabase.from("alertas").update({ leida: true }).eq("id", avisoId);
    revalidatePath("/", "layout");
  }
  if (dePago) redirect("/mas/mi-plan");
  redirect(productoId ? `/mi-stock/productos/${productoId}?aviso=${avisoId}` : "/avisos");
}

export async function marcarTodosLeidos(): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) redirect("/avisos?error=demo");
  const supabase = await crearClienteServidor();
  await supabase.from("alertas").update({ leida: true }).eq("leida", false);
  revalidatePath("/", "layout");
  redirect("/avisos?listo=leidos");
}
