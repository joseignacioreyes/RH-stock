import "server-only";
import { cache } from "react";
import type { Unidad } from "./formato";
import { margen, margenBajoObjetivo, seEstaAcabando, sinMovimientoReciente } from "./inventario";
import type { Sesion } from "./sesion";
import { crearClienteServidor } from "./supabase/servidor";

export type Categoria = { id: string; nombre: string; icono: string; margenObjetivo: number; orden: number };

export type ProductoVista = {
  id: string;
  nombre: string;
  unidad: Unidad;
  codigoBarras: string | null;
  stock: number;
  stockMinimo: number;
  precioVenta: number;
  /** Solo el dueño ve el costo; para empleados es null. */
  costo: number | null;
  categoria: Categoria | null;
  ultimoMovimiento: string | null;
  seAcaba: boolean;
  sinMovimiento: boolean;
  margen: number | null;
  margenBajo: boolean;
};

export type Filtro = "faltan" | "sin-venta" | "margen-bajo";

export const FILTROS: Record<Filtro, { titulo: string; vacio: string }> = {
  faltan: { titulo: "Se están acabando", vacio: "¡Bien! No se te está acabando nada." },
  "sin-venta": { titulo: "Sin venta hace un mes", vacio: "Todo tu stock se está moviendo." },
  "margen-bajo": { titulo: "Ganas poco con estos", vacio: "Todos tus precios dejan el margen que quieres." },
};

export const esFiltro = (valor: unknown): valor is Filtro => typeof valor === "string" && valor in FILTROS;

/** Todos los productos activos del negocio, con sus avisos ya calculados. */
export const obtenerProductos = cache(async (sesion: Sesion): Promise<ProductoVista[]> => {
  const supabase = await crearClienteServidor();
  const esDueno = sesion.usuario.rol === "dueno";

  const [{ data: productos, error }, costos] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, unidad, codigo_barras, stock_actual, stock_minimo, precio_venta, ultimo_movimiento_en, categoria:categorias(id, nombre, icono, margen_objetivo, orden)",
      )
      .eq("activo", true)
      .order("nombre"),
    esDueno ? supabase.rpc("costos_de_mi_negocio") : Promise.resolve({ data: [] }),
  ]);
  if (error) throw new Error(`No se pudieron leer los productos: ${error.message}`);

  const costoPorProducto = new Map((costos.data ?? []).map((c) => [c.producto_id, Number(c.costo_promedio)]));
  const ahora = new Date();

  return (productos ?? []).map((p) => {
    const categoria = p.categoria
      ? {
          id: p.categoria.id,
          nombre: p.categoria.nombre,
          icono: p.categoria.icono,
          margenObjetivo: Number(p.categoria.margen_objetivo),
          orden: p.categoria.orden,
        }
      : null;
    const stock = Number(p.stock_actual);
    const stockMinimo = Number(p.stock_minimo);
    const costo = esDueno ? (costoPorProducto.get(p.id) ?? 0) : null;
    return {
      id: p.id,
      nombre: p.nombre,
      unidad: p.unidad as Unidad,
      codigoBarras: p.codigo_barras,
      stock,
      stockMinimo,
      precioVenta: p.precio_venta,
      costo,
      categoria,
      ultimoMovimiento: p.ultimo_movimiento_en,
      seAcaba: seEstaAcabando(stock, stockMinimo),
      sinMovimiento: sinMovimientoReciente(p.ultimo_movimiento_en, ahora),
      margen: costo !== null ? margen(p.precio_venta, costo) : null,
      margenBajo: costo !== null && categoria !== null && margenBajoObjetivo(p.precio_venta, costo, categoria.margenObjetivo),
    };
  });
});

export async function obtenerProducto(sesion: Sesion, id: string): Promise<ProductoVista | null> {
  return (await obtenerProductos(sesion)).find((p) => p.id === id) ?? null;
}

export function filtrarProductos(productos: ProductoVista[], filtro: Filtro | null): ProductoVista[] {
  if (filtro === "faltan") return productos.filter((p) => p.seAcaba);
  if (filtro === "sin-venta") return productos.filter((p) => p.sinMovimiento);
  if (filtro === "margen-bajo") return productos.filter((p) => p.margenBajo);
  return productos;
}

export const obtenerCategorias = cache(async (): Promise<Categoria[]> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("categorias").select("id, nombre, icono, margen_objetivo, orden").order("orden");
  return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, icono: c.icono, margenObjetivo: Number(c.margen_objetivo), orden: c.orden }));
});

export type MovimientoVista = { id: string; tipo: string; cantidad: number; motivo: string | null; fecha: string };

/** Lo último que le pasó a un producto. */
export async function obtenerMovimientos(productoId: string, limite = 6): Promise<MovimientoVista[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("movimientos_stock")
    .select("id, tipo, cantidad, motivo, fecha")
    .eq("producto_id", productoId)
    .order("fecha", { ascending: false })
    .limit(limite);
  return (data ?? []).map((m) => ({ ...m, cantidad: Number(m.cantidad) }));
}

/** Cómo se dice cada movimiento en palabras simples. */
export function describirMovimiento(m: Pick<MovimientoVista, "tipo" | "motivo">): { texto: string; icono: string } {
  if (m.tipo === "compra") return { texto: "Lo que compré", icono: "📷" };
  if (m.tipo === "venta") return { texto: "Lo que vendí", icono: "🛒" };
  switch (m.motivo) {
    case "stock_inicial":
      return { texto: "Stock con que partí", icono: "🏁" };
    case "conteo":
      return { texto: "Corregido al contar", icono: "🔢" };
    case "merma":
      return { texto: "Se echó a perder", icono: "🗑️" };
    case "vencido":
      return { texto: "Vencido", icono: "📅" };
    case "consumo_propio":
      return { texto: "Consumo propio", icono: "🏠" };
    case "regalo":
      return { texto: "Regalo", icono: "🎁" };
    default:
      return { texto: "Ajuste", icono: "✏️" };
  }
}
