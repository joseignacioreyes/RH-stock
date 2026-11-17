import "server-only";
import { crearClienteServidor } from "./supabase/servidor";

export type Periodo = "7" | "30" | "todo";
export const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "7", texto: "Últimos 7 días" },
  { valor: "30", texto: "Últimos 30 días" },
  { valor: "todo", texto: "Desde el inicio" },
];
export const esPeriodo = (v: unknown): v is Periodo => v === "7" || v === "30" || v === "todo";

export function desdePeriodo(periodo: Periodo): string {
  if (periodo === "todo") return "2000-01-01T00:00:00Z";
  return new Date(Date.now() - Number(periodo) * 86_400_000).toISOString();
}

export type MetricasNegocio = {
  negocio: string;
  comuna: string;
  creadaEn: string;
  diasActivos: number;
  ultimaActividad: string | null;
  boletasSubidas: number;
  boletasConfirmadas: number;
  boletasAMano: number;
  itemsLeidos: number;
  itemsCorregidos: number;
  /** % de los productos leídos por la IA que hubo que corregir (null si no hay lecturas). */
  tasaCorreccion: number | null;
  productosCreados: number;
  ventas: number;
  ventasSinInternet: number;
  montoVendido: number;
  vendedoresActivos: number;
  conteos: number;
  perdidas: number;
  avisosStock: number;
  avisosCosto: number;
  avisosVistos: number;
  preciosSugeridosUsados: number;
};

/** % redondeado a 1 decimal, o null si no hay base. */
export function porcentaje(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 1000) / 10 : null;
}

/** Métricas de uso por negocio (solo el administrador; la base de datos lo exige). */
export async function obtenerMetricas(periodo: Periodo): Promise<MetricasNegocio[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("metricas_uso", { p_desde: desdePeriodo(periodo) });
  if (error) throw new Error(`No se pudieron leer las métricas: ${error.message}`);
  return (data ?? []).map((m) => ({
    negocio: m.negocio,
    comuna: m.comuna,
    creadaEn: m.creada_en,
    diasActivos: Number(m.dias_activos),
    ultimaActividad: m.ultima_actividad,
    boletasSubidas: Number(m.boletas_subidas),
    boletasConfirmadas: Number(m.boletas_confirmadas),
    boletasAMano: Number(m.boletas_a_mano),
    itemsLeidos: Number(m.items_leidos),
    itemsCorregidos: Number(m.items_corregidos),
    tasaCorreccion: porcentaje(Number(m.items_corregidos), Number(m.items_leidos)),
    productosCreados: Number(m.productos_creados),
    ventas: Number(m.ventas),
    ventasSinInternet: Number(m.ventas_sin_internet),
    montoVendido: Number(m.monto_vendido),
    vendedoresActivos: Number(m.vendedores_activos),
    conteos: Number(m.conteos),
    perdidas: Number(m.perdidas),
    avisosStock: Number(m.avisos_stock),
    avisosCosto: Number(m.avisos_costo),
    avisosVistos: Number(m.avisos_vistos),
    preciosSugeridosUsados: Number(m.precios_sugeridos_usados),
  }));
}

/** Las columnas del panel y de la descarga, en un solo lugar. */
export const COLUMNAS_METRICAS: { titulo: string; ayuda: string; valor: (m: MetricasNegocio) => number | string | null }[] = [
  { titulo: "Días activos", ayuda: "Días con algún movimiento de stock", valor: (m) => m.diasActivos },
  { titulo: "Boletas subidas", ayuda: "Fotos de boletas subidas", valor: (m) => m.boletasSubidas },
  { titulo: "Boletas confirmadas", ayuda: "Sumadas al stock", valor: (m) => m.boletasConfirmadas },
  { titulo: "Ingresadas a mano", ayuda: "Sin lectura de la IA", valor: (m) => m.boletasAMano },
  { titulo: "Productos leídos", ayuda: "Líneas que leyó la IA", valor: (m) => m.itemsLeidos },
  { titulo: "Correcciones", ayuda: "Líneas que hubo que cambiar o sacar", valor: (m) => m.itemsCorregidos },
  { titulo: "% corregido", ayuda: "Correcciones / productos leídos", valor: (m) => m.tasaCorreccion },
  { titulo: "Ventas", ayuda: "Ventas registradas en la caja", valor: (m) => m.ventas },
  { titulo: "Ventas sin internet", ayuda: "Llegaron más de 2 minutos después", valor: (m) => m.ventasSinInternet },
  { titulo: "Vendedores", ayuda: "Vendedores con ventas", valor: (m) => m.vendedoresActivos },
  { titulo: "Conteos", ayuda: "Productos corregidos al contar", valor: (m) => m.conteos },
  { titulo: "Pérdidas", ayuda: "Mermas, vencidos, consumo, regalos", valor: (m) => m.perdidas },
  { titulo: "Avisos de stock", ayuda: "“Se está acabando”", valor: (m) => m.avisosStock },
  { titulo: "Avisos de costo", ayuda: "Alzas o bajas de costo", valor: (m) => m.avisosCosto },
  { titulo: "Avisos vistos", ayuda: "Abiertos por la persona", valor: (m) => m.avisosVistos },
  { titulo: "Precios sugeridos usados", ayuda: "Tocó “Usar $…”", valor: (m) => m.preciosSugeridosUsados },
];
