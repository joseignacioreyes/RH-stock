"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { erroresPorCampo, primerError } from "@/lib/cuentas";
import { esquemaProductoEditar, esquemaProductoNuevo, esquemaSalida } from "@/lib/esquemas-productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error?: string; errores?: Record<string, string>; paso?: number };

const EN_DEMO = "Este es un negocio de ejemplo: puedes mirar todo, pero no se guardan cambios. Crea tu cuenta para usarlo de verdad.";
const ERROR_GENERAL = "No pudimos guardar. Revisa tu internet e intenta de nuevo.";

const PASO_DE_CAMPO: Record<string, number> = {
  nombre: 1,
  categoriaId: 1,
  unidad: 1,
  precioVenta: 2,
  costo: 2,
  codigoBarras: 2,
  stockInicial: 3,
  stockMinimo: 3,
};

function errorDeValidacion(error: Parameters<typeof erroresPorCampo>[0]): EstadoFormulario {
  const errores = erroresPorCampo(error);
  return { error: primerError(error), errores, paso: PASO_DE_CAMPO[Object.keys(errores)[0] ?? ""] ?? 1 };
}

const esCodigoRepetido = (error: { code?: string; message?: string } | null) =>
  error?.code === "23505" && (error.message ?? "").includes("codigo_barras");

export async function crearProducto(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: EN_DEMO };

  const validacion = esquemaProductoNuevo.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return errorDeValidacion(validacion.error);
  const d = validacion.data;

  const supabase = await crearClienteServidor();
  const { data: id, error } = await supabase.rpc("crear_producto", {
    p_nombre: d.nombre,
    p_categoria_id: d.categoriaId,
    p_unidad: d.unidad,
    p_codigo_barras: d.codigoBarras,
    p_precio_venta: d.precioVenta,
    p_costo: d.costo,
    p_stock_inicial: d.stockInicial,
    p_stock_minimo: d.stockMinimo,
  });
  if (esCodigoRepetido(error)) {
    return { error: "Ya tienes otro producto con ese código de barras.", errores: { codigoBarras: "Este código ya está usado." }, paso: 2 };
  }
  if (error || !id) {
    console.error("crearProducto:", error);
    return { error: ERROR_GENERAL };
  }

  revalidatePath("/mi-stock", "layout");
  redirect(`/mi-stock/productos/${id}?listo=nuevo`);
}

export async function editarProducto(productoId: string, _estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: EN_DEMO };

  const validacion = esquemaProductoEditar.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return errorDeValidacion(validacion.error);
  const d = validacion.data;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("productos")
    .update({
      nombre: d.nombre,
      categoria_id: d.categoriaId,
      unidad: d.unidad,
      precio_venta: d.precioVenta,
      codigo_barras: d.codigoBarras || null,
      stock_minimo: d.stockMinimo,
    })
    .eq("id", productoId)
    .select("id");
  if (esCodigoRepetido(error)) {
    return { error: "Ya tienes otro producto con ese código de barras.", errores: { codigoBarras: "Este código ya está usado." }, paso: 2 };
  }
  if (error || !data?.length) {
    console.error("editarProducto:", error);
    return { error: ERROR_GENERAL };
  }

  revalidatePath("/mi-stock", "layout");
  redirect(`/mi-stock/productos/${productoId}?listo=cambiado`);
}

export async function quitarProducto(productoId: string): Promise<void> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) redirect(`/mi-stock/productos/${productoId}?error=demo`);

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("productos").update({ activo: false }).eq("id", productoId);
  if (error) {
    console.error("quitarProducto:", error);
    redirect(`/mi-stock/productos/${productoId}?error=general`);
  }
  revalidatePath("/mi-stock", "layout");
  redirect("/mi-stock/productos?listo=quitado");
}

export async function registrarSalida(productoId: string, _estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: EN_DEMO };

  const validacion = esquemaSalida.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return { error: primerError(validacion.error), errores: erroresPorCampo(validacion.error) };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("registrar_salida", {
    p_producto_id: productoId,
    p_cantidad: validacion.data.cantidad,
    p_motivo: validacion.data.motivo,
  });
  if (error) {
    console.error("registrarSalida:", error);
    return { error: ERROR_GENERAL };
  }

  revalidatePath("/mi-stock", "layout");
  redirect(`/mi-stock/productos/${productoId}?listo=salida&cantidad=${encodeURIComponent(String(validacion.data.cantidad))}`);
}

export async function guardarConteo(conteos: { productoId: string; cantidadReal: number }[]): Promise<{ error?: string }> {
  const { empresa } = await exigirSesionDeNegocio();
  if (empresa.esDemo) return { error: EN_DEMO };
  if (conteos.some((c) => !Number.isFinite(c.cantidadReal) || c.cantidadReal < 0)) return { error: "Hay una cantidad que no se entiende. Revísala." };

  const supabase = await crearClienteServidor();
  const { data: cambios, error } = await supabase.rpc("registrar_conteo", {
    p_conteos: conteos.map((c) => ({ producto_id: c.productoId, cantidad_real: c.cantidadReal })),
  });
  if (error) {
    console.error("guardarConteo:", error);
    return { error: ERROR_GENERAL };
  }

  revalidatePath("/mi-stock", "layout");
  redirect(`/mi-stock?listo=conteo&cambios=${cambios ?? 0}`);
}

/** "Usar este precio": cambia el precio de venta al sugerido. */
export async function usarPrecioSugerido(productoId: string, precio: number): Promise<void> {
  const { empresa, usuario } = await exigirSesionDeNegocio();
  if (empresa.esDemo || usuario.rol !== "dueno") redirect(`/mi-stock/productos/${productoId}?error=demo`);
  if (!Number.isInteger(precio) || precio <= 0) redirect(`/mi-stock/productos/${productoId}?error=general`);
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("productos").update({ precio_venta: precio }).eq("id", productoId);
  if (error) redirect(`/mi-stock/productos/${productoId}?error=general`);
  await supabase.rpc("registrar_evento", { p_evento: "precio_sugerido_usado" }); // métrica del piloto
  revalidatePath("/", "layout");
  redirect(`/mi-stock/productos/${productoId}?listo=precio`);
}
