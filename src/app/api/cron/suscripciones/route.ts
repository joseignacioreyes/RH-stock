// Tarea diaria (Vercel Cron, ver vercel.json), temprano en la mañana:
//   1. recalcula el estado de pago de cada negocio y deja en Avisos el recordatorio
//      (3 días antes), el atraso y el paso a "solo para mirar";
//   2. envía al celular los avisos que falten;
//   3. envía a cada dueño el resumen del día por correo.
// Vercel llama con "Authorization: Bearer <CRON_SECRET>"; sin esa clave no hace nada.

import { NextResponse, type NextRequest } from "next/server";
import { enviarPushPendientes, enviarResumenesPorCorreo } from "@/lib/envio-avisos";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: suscripciones, error } = await crearClienteAdmin().rpc("actualizar_suscripciones");
  if (error) console.error("suscripciones:", error);
  const push = await enviarPushPendientes().catch((e) => (console.error("push:", e), null));
  const correo = await enviarResumenesPorCorreo().catch((e) => (console.error("correo:", e), null));
  return NextResponse.json({ suscripciones, push, correo }, { status: error ? 500 : 200 });
}
