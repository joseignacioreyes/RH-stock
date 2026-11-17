import "server-only";
import type { PagoParaRevisar } from "@/app/admin/PagoPorRevisar";
import type { LecturaComprobante } from "./lector-comprobantes/esquema";
import { crearClienteServidor } from "./supabase/servidor";

const SELECCION = "id, empresa_id, nombre_negocio, periodo, monto, estado, comprobante_url, datos_extraidos, informado_en, fecha_confirmacion, motivo_rechazo";

/** Enlaces firmados (10 minutos) para ver los comprobantes. Solo el administrador o el dueño pueden crearlos (RLS). */
async function enlaces(rutas: string[]): Promise<Map<string, string>> {
  if (rutas.length === 0) return new Map();
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("comprobantes").createSignedUrls(rutas, 600);
  const mapa = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa.set(d.path, d.signedUrl);
  return mapa;
}

type FilaPago = {
  id: string;
  nombre_negocio: string;
  periodo: string;
  monto: number;
  comprobante_url: string | null;
  datos_extraidos: unknown;
  informado_en: string | null;
};

async function paraRevisar(filas: FilaPago[]): Promise<PagoParaRevisar[]> {
  const urls = await enlaces(filas.map((p) => p.comprobante_url).filter((r): r is string => Boolean(r)));
  return filas.map((p) => ({
    id: p.id,
    negocio: p.nombre_negocio,
    periodo: p.periodo,
    monto: p.monto,
    informadoEn: p.informado_en,
    leido: (p.datos_extraidos ?? null) as LecturaComprobante | null,
    urlComprobante: p.comprobante_url ? (urls.get(p.comprobante_url) ?? null) : null,
    esPdf: Boolean(p.comprobante_url?.endsWith(".pdf")),
  }));
}

/** Pagos informados que esperan que José los revise (los más antiguos primero). */
export async function obtenerPagosPorRevisar(): Promise<PagoParaRevisar[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("pagos").select(SELECCION).eq("estado", "informado").order("informado_en");
  return paraRevisar(data ?? []);
}

/** Historial de pagos de un negocio, con enlace al comprobante. */
export async function obtenerPagosDeNegocio(empresaId: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("pagos").select(SELECCION).eq("empresa_id", empresaId).order("created_at", { ascending: false });
  const filas = data ?? [];
  const revisables = await paraRevisar(filas);
  return filas.map((p, i) => ({ ...p, revisar: revisables[i]! }));
}

/** Total confirmado este mes (hora de Chile), con IVA. */
export async function recibidoEsteMes(): Promise<number> {
  const supabase = await crearClienteServidor();
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).format(new Date());
  const { data } = await supabase.from("pagos").select("monto").eq("estado", "confirmado").gte("fecha_confirmacion", `${mes}-01T00:00:00-03:00`);
  return (data ?? []).reduce((t, p) => t + p.monto, 0);
}
