"use server";

import { redirect } from "next/navigation";
import { correoInterno, RUT_DEMO } from "@/lib/cuentas";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** "Probar sin registrarse": entra al Almacén Don Pepe (solo para mirar). */
export async function entrarAlDemo() {
  const claveDemo = process.env.DEMO_CLAVE;
  if (!claveDemo) redirect("/?demo=no-disponible");

  const supabase = await crearClienteServidor();
  const credenciales = { email: correoInterno(RUT_DEMO), password: claveDemo };
  let { error } = await supabase.auth.signInWithPassword(credenciales);

  // Si alguien le cambió la clave al demo, se repara sola y se vuelve a intentar.
  if (error?.code === "invalid_credentials") {
    const reparada = await repararClaveDemo(claveDemo);
    if (reparada) ({ error } = await supabase.auth.signInWithPassword(credenciales));
  }

  if (error) {
    console.error("No se pudo entrar al demo:", error.message);
    redirect("/?demo=no-disponible");
  }
  redirect("/inicio");
}

async function repararClaveDemo(claveDemo: string): Promise<boolean> {
  try {
    const admin = crearClienteAdmin();
    const { data: dueno } = await admin.from("usuarios").select("id").eq("rut", RUT_DEMO).maybeSingle();
    if (!dueno) return false;
    const { error } = await admin.auth.admin.updateUserById(dueno.id, { password: claveDemo });
    return !error;
  } catch {
    return false;
  }
}

/** Desde la franja del demo: sale del negocio de ejemplo y abre el registro. */
export async function salirDelDemoYRegistrarme() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/registro");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/?sesion=cerrada");
}
