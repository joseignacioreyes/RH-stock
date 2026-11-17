"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Acciones del administrador de RH Stock sobre pagos y planes.
// La base de datos vuelve a revisar que quien llama sea administrador.

export async function confirmarPago(pagoId: string): Promise<void> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("confirmar_pago", { p_pago_id: pagoId });
  revalidatePath("/admin", "layout");
  if (error) redirect(`/admin?error=${error.code === "RH004" ? "revisado" : "general"}`);
  redirect("/admin?listo=confirmado");
}

export async function rechazarPago(pagoId: string, formData: FormData): Promise<void> {
  await exigirAdmin();
  const elegido = String(formData.get("motivo") ?? "");
  const motivo = (elegido === "otro" ? String(formData.get("otro") ?? "") : elegido).trim();
  if (!motivo) redirect("/admin?error=motivo");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("rechazar_pago", { p_pago_id: pagoId, p_motivo: motivo.slice(0, 200) });
  revalidatePath("/admin", "layout");
  if (error) redirect(`/admin?error=${error.code === "RH004" ? "revisado" : "general"}`);
  redirect("/admin?listo=rechazado");
}

const esquemaCobro = z.discriminatedUnion("plan", [
  z.object({ plan: z.literal("piloto") }),
  z.object({
    plan: z.literal("mensual"),
    precio: z.coerce.number().int().min(0).max(10_000_000),
    vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);

export type EstadoCobro = { error?: string };

export async function configurarCobro(empresaId: string, _estado: EstadoCobro, formData: FormData): Promise<EstadoCobro> {
  await exigirAdmin();
  const datos = Object.fromEntries(formData);
  const validacion = esquemaCobro.safeParse({ ...datos, precio: String(datos.precio ?? "").replace(/\D/g, "") });
  if (!validacion.success) return { error: "Revisa el precio y la fecha del primer pago." };
  const d = validacion.data;
  if (d.plan === "mensual" && Number(d.vencimiento.slice(8, 10)) > 28) {
    return { error: "El día de pago debe ser entre el 1 y el 28 (para que exista en todos los meses)." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("admin_configurar_cobro", {
    p_empresa_id: empresaId,
    p_plan: d.plan,
    p_precio: d.plan === "mensual" ? d.precio : (null as unknown as number),
    p_primer_vencimiento: d.plan === "mensual" ? d.vencimiento : (null as unknown as string),
  });
  if (error) {
    console.error("configurarCobro:", error);
    return { error: "No pudimos guardar el plan. Intenta de nuevo." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/negocios/${empresaId}?listo=plan`);
}
