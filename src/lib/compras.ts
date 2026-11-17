import "server-only";
import type { Alias } from "./asociar";
import { parsearLectura, type LecturaBoleta } from "./lector-boletas/esquema";
import { crearClienteServidor } from "./supabase/servidor";

export type EstadoDocumento = "procesando" | "por_confirmar" | "confirmado" | "revision_manual";

export type DocumentoResumen = {
  id: string;
  estado: EstadoDocumento;
  proveedor: string | null;
  fecha: string | null;
  total: number | null;
  creadoEn: string;
  productos: number;
};

/** Últimas compras del negocio, las más nuevas primero. */
export async function obtenerUltimasCompras(limite = 8): Promise<DocumentoResumen[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("documentos_compra")
    .select("id, estado, fecha, total, created_at, datos_extraidos, proveedor:proveedores(nombre), items:items_documento(count)")
    .order("created_at", { ascending: false })
    .limit(limite);

  return (data ?? []).map((d) => {
    const lectura = d.estado !== "confirmado" ? lecturaGuardada(d.datos_extraidos) : null;
    return {
      id: d.id,
      estado: d.estado as EstadoDocumento,
      proveedor: d.proveedor?.nombre ?? lectura?.proveedorNombre ?? null,
      fecha: d.fecha ?? lectura?.fecha ?? null,
      total: d.total ?? lectura?.total ?? null,
      creadoEn: d.created_at,
      productos: d.estado === "confirmado" ? (d.items[0]?.count ?? 0) : (lectura?.items.length ?? 0),
    };
  });
}

/** La lectura de la IA guardada en el documento (ya validada), o null. */
export function lecturaGuardada(datos: unknown): LecturaBoleta | null {
  if (!datos || typeof datos !== "object") return null;
  // Se guarda la lectura ya limpia; si alguien guardó la respuesta cruda de la IA, se vuelve a validar.
  if ("items" in datos && Array.isArray((datos as LecturaBoleta).items) && "proveedorNombre" in datos) return datos as LecturaBoleta;
  const resultado = parsearLectura(datos);
  return resultado.ok ? resultado.lectura : null;
}

export type DocumentoParaConfirmar = {
  id: string;
  estado: EstadoDocumento;
  imagenUrl: string | null;
  lectura: LecturaBoleta | null;
  items: { descripcion: string; cantidad: number; precioUnitario: number; total: number; productoId: string | null; producto: string | null }[];
  proveedor: string | null;
  fecha: string | null;
  total: number | null;
  numero: string | null;
};

export async function obtenerDocumento(id: string): Promise<DocumentoParaConfirmar | null> {
  const supabase = await crearClienteServidor();
  const { data: doc } = await supabase
    .from("documentos_compra")
    .select(
      "id, estado, numero, fecha, total, imagen_url, datos_extraidos, proveedor:proveedores(nombre), items:items_documento(descripcion_original, cantidad, precio_unitario, total, producto_id, producto:productos(nombre))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!doc) return null;

  let imagenUrl: string | null = null;
  if (doc.imagen_url) {
    // Enlace firmado que vence en 10 minutos (la foto nunca es pública).
    const { data } = await supabase.storage.from("boletas").createSignedUrl(doc.imagen_url, 600);
    imagenUrl = data?.signedUrl ?? null;
  }

  return {
    id: doc.id,
    estado: doc.estado as EstadoDocumento,
    imagenUrl,
    lectura: lecturaGuardada(doc.datos_extraidos),
    items: doc.items.map((i) => ({
      descripcion: i.descripcion_original,
      cantidad: Number(i.cantidad),
      precioUnitario: Number(i.precio_unitario),
      total: i.total,
      productoId: i.producto_id,
      producto: i.producto?.nombre ?? null,
    })),
    proveedor: doc.proveedor?.nombre ?? null,
    fecha: doc.fecha,
    total: doc.total,
    numero: doc.numero,
  };
}

/** Lo que la app aprendió, y el proveedor de la boleta si ya existe (para sugerir productos). */
export async function obtenerAprendido(proveedorNombre: string | null, proveedorRut: string | null) {
  const supabase = await crearClienteServidor();
  const [{ data: alias }, { data: proveedores }] = await Promise.all([
    supabase.from("alias_productos").select("proveedor_id, descripcion_original, producto_id"),
    supabase.from("proveedores").select("id, nombre, rut"),
  ]);
  const proveedor =
    (proveedores ?? []).find((p) => proveedorRut && p.rut === proveedorRut) ??
    (proveedores ?? []).find((p) => proveedorNombre && p.nombre.toLowerCase() === proveedorNombre.toLowerCase()) ??
    null;
  return {
    proveedorId: proveedor?.id ?? null,
    alias: (alias ?? []).map<Alias>((a) => ({ proveedorId: a.proveedor_id, descripcion: a.descripcion_original, productoId: a.producto_id })),
  };
}
