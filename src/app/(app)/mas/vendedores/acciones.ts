"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSesionDeNegocio, MENSAJE_SUSPENDIDA } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoVendedor = { error?: string; errores?: Record<string, string> };

async function exigirDueno() {
  const sesion = await exigirSesionDeNegocio();
  if (sesion.usuario.rol !== "dueno") redirect("/mas");
  return sesion;
}

export async function agregarVendedor(_estado: EstadoVendedor, formData: FormData): Promise<EstadoVendedor> {
  const { empresa } = await exigirDueno();
  if (empresa.suspendida) return { error: MENSAJE_SUSPENDIDA };
  if (empresa.esDemo) return { error: "En el negocio de ejemplo no se agregan vendedores. Crea tu cuenta para usarlo de verdad." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const repetir = String(formData.get("repetir") ?? "").trim();
  const errores: Record<string, string> = {};
  if (!nombre) errores.nombre = "Escribe el nombre del vendedor.";
  if (!/^\d{4}$/.test(pin)) errores.pin = "El PIN son 4 números, por ejemplo 2580.";
  else if (pin !== repetir) errores.repetir = "Los dos PIN no son iguales.";
  if (Object.keys(errores).length) return { error: Object.values(errores)[0], errores };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("agregar_vendedor", { p_nombre: nombre, p_pin: pin });
  if (error) return { error: "No pudimos agregar al vendedor. Intenta de nuevo." };
  revalidatePath("/mas/vendedores");
  redirect("/mas/vendedores?listo=agregado");
}

export async function desactivarVendedor(vendedorId: string): Promise<void> {
  const { empresa } = await exigirDueno();
  if (empresa.suspendida) redirect("/mas/mi-plan?pausada=1");
  if (empresa.esDemo) redirect("/mas/vendedores?error=demo");
  const supabase = await crearClienteServidor();
  await supabase.from("vendedores").update({ activo: false }).eq("id", vendedorId);
  revalidatePath("/mas/vendedores");
  redirect("/mas/vendedores?listo=desactivado");
}
