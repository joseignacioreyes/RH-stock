import "server-only";
import { cache } from "react";
import type { Unidad } from "./formato";
import { crearClienteServidor } from "./supabase/servidor";

export type TipoAviso = "stock_bajo" | "costo_sube" | "costo_baja";

export type Aviso = {
  id: string;
  tipo: TipoAviso;
  mensaje: string;
  leida: boolean;
  fecha: string;
  producto: { id: string; nombre: string; stock: number; unidad: Unidad; precioVenta: number } | null;
  precioSugerido: number | null;
};

/** Avisos del negocio: primero los sin leer, después los últimos leídos. (RLS: los de costo solo los ve el dueño.) */
export async function obtenerAvisos(): Promise<Aviso[]> {
  const supabase = await crearClienteServidor();
  const seleccion = "id, tipo, mensaje, leida, created_at, datos, producto:productos(id, nombre, stock_actual, unidad, precio_venta)";
  const [{ data: sinLeer }, { data: leidos }] = await Promise.all([
    supabase.from("alertas").select(seleccion).eq("leida", false).order("created_at", { ascending: false }).limit(50),
    supabase.from("alertas").select(seleccion).eq("leida", true).order("created_at", { ascending: false }).limit(10),
  ]);

  return [...(sinLeer ?? []), ...(leidos ?? [])].map((a) => {
    const datos = (a.datos ?? {}) as { precio_sugerido?: number };
    return {
      id: a.id,
      tipo: a.tipo as TipoAviso,
      mensaje: a.mensaje,
      leida: a.leida,
      fecha: a.created_at,
      producto: a.producto
        ? {
            id: a.producto.id,
            nombre: a.producto.nombre,
            stock: Number(a.producto.stock_actual),
            unidad: a.producto.unidad as Unidad,
            precioVenta: a.producto.precio_venta,
          }
        : null,
      precioSugerido: a.tipo === "costo_sube" && datos.precio_sugerido ? datos.precio_sugerido : null,
    };
  });
}

/** Cuántos avisos sin leer hay (para el número del botón "Avisos"). */
export const contarAvisosSinLeer = cache(async (): Promise<number> => {
  const supabase = await crearClienteServidor();
  const { count } = await supabase.from("alertas").select("id", { count: "exact", head: true }).eq("leida", false);
  return count ?? 0;
});
