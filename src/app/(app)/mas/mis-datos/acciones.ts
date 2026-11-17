"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function solicitarEliminacion(): Promise<void> {
  const { empresa, usuario } = await exigirSesionDeNegocio();
  if (empresa.esDemo || usuario.rol !== "dueno") redirect("/mas/mis-datos?error=permiso");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("solicitar_eliminacion");
  if (error) redirect("/mas/mis-datos?error=general");
  revalidatePath("/mas/mis-datos");
  redirect("/mas/mis-datos?listo=solicitada");
}

export async function cancelarEliminacion(): Promise<void> {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas/mis-datos?error=permiso");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cancelar_eliminacion");
  if (error) redirect("/mas/mis-datos?error=general");
  revalidatePath("/mas/mis-datos");
  redirect("/mas/mis-datos?listo=cancelada");
}
