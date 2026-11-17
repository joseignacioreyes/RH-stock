"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enviarPushPendientes } from "@/lib/envio-avisos";
import { enviarPush } from "@/lib/push";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
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

// ---------------------------------------------------------------------------
// Avisos en el celular y por correo
// ---------------------------------------------------------------------------

export type SuscripcionNavegador = { endpoint?: string; keys?: Record<string, string> };

/** Este celular acepta recibir avisos. */
export async function guardarSuscripcionPush(suscripcion: SuscripcionNavegador): Promise<{ ok: boolean }> {
  await exigirSesionDeNegocio();
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_suscripcion_push", {
    p_endpoint: suscripcion.endpoint ?? "",
    p_p256dh: suscripcion.keys?.p256dh ?? "",
    p_auth: suscripcion.keys?.auth ?? "",
  });
  if (error) console.error("guardarSuscripcionPush:", error);
  return { ok: !error };
}

export async function quitarSuscripcionPush(endpoint: string): Promise<void> {
  await exigirSesionDeNegocio();
  const supabase = await crearClienteServidor();
  await supabase.rpc("quitar_suscripcion_push", { p_endpoint: endpoint });
}

/** "Mandarme un aviso de prueba": a los celulares de la persona conectada. */
export async function probarAvisoEnCelular(): Promise<{ enviadas: number }> {
  const { usuario } = await exigirSesionDeNegocio();
  const { data } = await crearClienteAdmin().from("suscripciones_push").select("id, endpoint, p256dh, auth").eq("usuario_id", usuario.id);
  let enviadas = 0;
  for (const s of data ?? []) {
    if (await enviarPush(s, { titulo: "✅ RH Stock", cuerpo: "Así te llegarán los avisos a este celular.", url: "/avisos" })) enviadas++;
  }
  return { enviadas };
}

/** Envía al celular los avisos recién creados (por ejemplo, después de vender). */
export async function avisarPendientes(): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  if (!empresa.esDemo) await enviarPushPendientes(empresa.id);
}

export async function cambiarAvisosPorCorreo(activo: boolean): Promise<void> {
  const { empresa, usuario } = await exigirSesionDeNegocio();
  if (empresa.esDemo) redirect("/avisos?error=demo");
  if (usuario.rol === "dueno") {
    const supabase = await crearClienteServidor();
    await supabase.rpc("cambiar_avisos_por_correo", { p_activo: activo });
  }
  revalidatePath("/avisos");
  redirect(`/avisos?listo=${activo ? "correo-si" : "correo-no"}`);
}
