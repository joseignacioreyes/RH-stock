"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerNumero } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoAjuste = { error?: string };
const EN_DEMO = "Este es un negocio de ejemplo: puedes mirar todo, pero no se guardan cambios.";

async function exigirDueno() {
  const sesion = await exigirSesionDeNegocio();
  if (sesion.usuario.rol !== "dueno") redirect("/mas");
  return sesion;
}

export async function guardarMargen(categoriaId: string, _estado: EstadoAjuste, formData: FormData): Promise<EstadoAjuste> {
  const { empresa } = await exigirDueno();
  if (empresa.esDemo) return { error: EN_DEMO };
  const margen = leerNumero(String(formData.get("margen") ?? "").replace("%", ""));
  if (margen === null || margen < 1 || margen > 90) return { error: "Escribe un porcentaje entre 1 y 90, por ejemplo 25." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("categorias").update({ margen_objetivo: margen }).eq("id", categoriaId).select("id");
  if (error || !data?.length) return { error: "No pudimos guardar. Intenta de nuevo." };
  revalidatePath("/", "layout");
  redirect("/mas/margenes?listo=1");
}

export async function guardarUmbral(_estado: EstadoAjuste, formData: FormData): Promise<EstadoAjuste> {
  const { empresa } = await exigirDueno();
  if (empresa.esDemo) return { error: EN_DEMO };
  const umbral = leerNumero(String(formData.get("umbral") ?? "").replace("%", ""));
  if (umbral === null || umbral < 1 || umbral > 50) return { error: "Escribe un porcentaje entre 1 y 50, por ejemplo 5." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("empresas").update({ umbral_aviso_costo: umbral }).eq("id", empresa.id).select("id");
  if (error || !data?.length) return { error: "No pudimos guardar. Intenta de nuevo." };
  revalidatePath("/", "layout");
  redirect("/mas?listo=umbral");
}
