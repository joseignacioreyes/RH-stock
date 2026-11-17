// Tarea diaria (Vercel Cron, ver vercel.json): recalcula el estado de pago de cada negocio y deja
// en Avisos los recordatorios (3 días antes), los atrasos y el paso a "solo para mirar".
// Vercel llama con "Authorization: Bearer <CRON_SECRET>"; sin esa clave no hace nada.
// (El envío por correo y push de estos avisos se suma cuando estén Resend y las claves de push.)

import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await crearClienteAdmin().rpc("actualizar_suscripciones");
  if (error) {
    console.error("suscripciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
