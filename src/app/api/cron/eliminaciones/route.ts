// Tarea diaria (Vercel Cron, ver vercel.json): borra las cuentas cuya eliminación se pidió hace 30 días.
// Borra las fotos de boletas, las cuentas de acceso del equipo y todos los datos del negocio.
// Vercel llama con "Authorization: Bearer <CRON_SECRET>"; sin esa clave no hace nada.

import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = crearClienteAdmin();
  const { data: vencidas, error } = await admin
    .from("solicitudes_eliminacion")
    .select("id, empresa_id")
    .eq("estado", "pendiente")
    .lte("eliminar_desde", new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resultado: { solicitud: string; ok: boolean; error?: string }[] = [];
  for (const solicitud of vencidas ?? []) {
    try {
      const empresaId = solicitud.empresa_id;
      if (empresaId) {
        // 1. Fotos de boletas (de a 100).
        for (;;) {
          const { data: fotos } = await admin.storage.from("boletas").list(empresaId, { limit: 100 });
          if (!fotos?.length) break;
          await admin.storage.from("boletas").remove(fotos.map((f) => `${empresaId}/${f.name}`));
        }
        // 2. Cuentas de acceso del equipo.
        const { data: personas } = await admin.from("usuarios").select("id").eq("empresa_id", empresaId);
        for (const persona of personas ?? []) await admin.auth.admin.deleteUser(persona.id);
        // 3. Todos los datos del negocio (se borran en cascada).
        const { error: errorBorrar } = await admin.from("empresas").delete().eq("id", empresaId);
        if (errorBorrar) throw errorBorrar;
      }
      await admin.from("solicitudes_eliminacion").update({ estado: "realizada", realizada_en: new Date().toISOString() }).eq("id", solicitud.id);
      resultado.push({ solicitud: solicitud.id, ok: true });
    } catch (e) {
      console.error("eliminaciones:", e);
      resultado.push({ solicitud: solicitud.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ procesadas: resultado.length, resultado });
}
