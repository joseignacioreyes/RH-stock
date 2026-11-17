import "server-only";
import { SITIO_URL } from "./config";
import { enviarCorreo } from "./correo";
import { correoResumenAvisos, notificacionDeAviso, type AvisoCorreo } from "./plantillas-correo";
import { enviarPush, type Notificacion } from "./push";
import { crearClienteAdmin } from "./supabase/admin";

// Envía los avisos que la base de datos dejó en la tabla "alertas":
//   - al celular, apenas se crean (enviarPushPendientes);
//   - por correo, un resumen al día para el dueño (enviarResumenesPorCorreo).
// Quién recibe qué: los avisos de "se está acabando" llegan a todo el equipo; los de costo
// y de pago, solo al dueño (los empleados no ven costos ni pagos). El negocio de ejemplo no recibe nada.

const HORAS_PUSH = 24;
const DIAS_CORREO = 3;
const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

type Alerta = { id: string; empresa_id: string; tipo: AvisoCorreo["tipo"]; mensaje: string; producto_id: string | null; leida: boolean };

async function empresasDeEjemplo(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await crearClienteAdmin().from("empresas").select("id").in("id", ids).eq("es_demo", true);
  return new Set((data ?? []).map((e) => e.id));
}

/** Notificaciones al celular de los avisos nuevos (de un negocio, o de todos si no se indica). */
export async function enviarPushPendientes(empresaId?: string): Promise<{ avisos: number; enviadas: number }> {
  const admin = crearClienteAdmin();
  let consulta = admin
    .from("alertas")
    .select("id, empresa_id, tipo, mensaje, producto_id, leida")
    .eq("enviada_push", false)
    .gte("created_at", hace(HORAS_PUSH))
    .order("created_at")
    .limit(200);
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data } = await consulta;
  const alertas = (data ?? []) as Alerta[];
  if (alertas.length === 0) return { avisos: 0, enviadas: 0 };

  // Se marcan primero, para que dos envíos al mismo tiempo no manden el mismo aviso dos veces.
  const { data: marcadas } = await admin
    .from("alertas")
    .update({ enviada_push: true })
    .in("id", alertas.map((a) => a.id))
    .eq("enviada_push", false)
    .select("id");
  const porEnviar = new Set((marcadas ?? []).map((m) => m.id));
  const empresas = [...new Set(alertas.map((a) => a.empresa_id))];
  const ejemplo = await empresasDeEjemplo(empresas);

  const { data: suscripciones } = await admin
    .from("suscripciones_push")
    .select("id, empresa_id, endpoint, p256dh, auth, usuario:usuarios(rol)")
    .in("empresa_id", empresas);

  let enviadas = 0;
  for (const alerta of alertas) {
    if (!porEnviar.has(alerta.id) || alerta.leida || ejemplo.has(alerta.empresa_id)) continue;
    const notificacion: Notificacion = notificacionDeAviso({ tipo: alerta.tipo, mensaje: alerta.mensaje, productoId: alerta.producto_id });
    const destinos = (suscripciones ?? []).filter(
      (s) => s.empresa_id === alerta.empresa_id && (alerta.tipo === "stock_bajo" || s.usuario?.rol === "dueno"),
    );
    for (const destino of destinos) if (await enviarPush(destino, notificacion)) enviadas++;
  }
  return { avisos: porEnviar.size, enviadas };
}

/** Un correo al día por negocio con los avisos que todavía no se han visto en la app. */
export async function enviarResumenesPorCorreo(): Promise<{ negocios: number; correos: number }> {
  const admin = crearClienteAdmin();
  const { data } = await admin
    .from("alertas")
    .select("id, empresa_id, tipo, mensaje, producto_id, leida")
    .eq("enviada_correo", false)
    .gte("created_at", hace(DIAS_CORREO * 24))
    .order("created_at")
    .limit(2000);
  const alertas = (data ?? []) as Alerta[];
  const empresas = [...new Set(alertas.map((a) => a.empresa_id))];
  if (empresas.length === 0) return { negocios: 0, correos: 0 };

  const [{ data: negocios }, { data: duenos }] = await Promise.all([
    admin.from("empresas").select("id, nombre_fantasia, es_demo").in("id", empresas),
    admin.from("usuarios").select("empresa_id, nombre, correo, avisos_por_correo").in("empresa_id", empresas).eq("rol", "dueno"),
  ]);

  let correos = 0;
  for (const negocio of negocios ?? []) {
    const suyas = alertas.filter((a) => a.empresa_id === negocio.id);
    const nuevas = suyas.filter((a) => !a.leida);
    const destinatarios = negocio.es_demo ? [] : (duenos ?? []).filter((d) => d.empresa_id === negocio.id && d.avisos_por_correo);

    let enviadoBien = true;
    if (nuevas.length > 0) {
      for (const dueno of destinatarios) {
        const correo = correoResumenAvisos({
          nombre: dueno.nombre.split(" ")[0] ?? dueno.nombre,
          negocio: negocio.nombre_fantasia,
          avisos: nuevas.map((a) => ({ tipo: a.tipo, mensaje: a.mensaje })),
          sitio: SITIO_URL,
        });
        const resultado = await enviarCorreo({ para: dueno.correo, ...correo });
        if (resultado.ok) correos++;
        else enviadoBien = false;
      }
    }
    // Si el correo falló, se reintenta al día siguiente (mientras el aviso tenga menos de 3 días).
    if (enviadoBien) await admin.from("alertas").update({ enviada_correo: true }).in("id", suyas.map((a) => a.id));
  }
  return { negocios: negocios?.length ?? 0, correos };
}
