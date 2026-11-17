// Descargas: productos, compras, movimientos y ventas en CSV (Excel), y "todos mis datos" en JSON.
// Respeta las reglas RLS: cada uno descarga solo lo de su negocio.

import { NextResponse, type NextRequest } from "next/server";
import { aCsv, fechaCsv, nombreArchivo, type Columna } from "@/lib/exportar";
import { describirMovimiento, obtenerProductos } from "@/lib/productos";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/lib/supabase/tipos-db";

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>;

/** Trae todas las filas (Supabase entrega de a 1.000). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) return filas;
  }
}

const MEDIOS: Record<string, string> = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia" };
const UNIDADES: Record<string, string> = { unidad: "Unidad", kg: "Kilo", litro: "Litro", caja: "Caja" };

function descarga(contenido: string, nombre: string, tipo: string) {
  return new NextResponse(contenido, {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function productosCsv(sesion: NonNullable<Awaited<ReturnType<typeof obtenerSesion>>>) {
  const productos = await obtenerProductos(sesion);
  type P = (typeof productos)[number];
  const columnas: Columna<P>[] = [
    { titulo: "Producto", valor: (p) => p.nombre },
    { titulo: "Categoría", valor: (p) => p.categoria?.nombre ?? "" },
    { titulo: "Se vende por", valor: (p) => UNIDADES[p.unidad] },
    { titulo: "Código de barras", valor: (p) => p.codigoBarras },
    { titulo: "Me queda", valor: (p) => p.stock },
    { titulo: "Avisar cuando queden", valor: (p) => p.stockMinimo },
    { titulo: "Costo promedio ($)", valor: (p) => (p.costo !== null ? Math.round(p.costo) : null) },
    { titulo: "Precio de venta ($)", valor: (p) => p.precioVenta },
    { titulo: "Margen (%)", valor: (p) => p.margen },
    { titulo: "Valor del stock a costo ($)", valor: (p) => (p.costo !== null ? Math.round(Math.max(p.stock, 0) * p.costo) : null) },
    { titulo: "Se está acabando", valor: (p) => p.seAcaba },
  ];
  return aCsv(columnas, productos);
}

async function comprasCsv(supabase: Supabase) {
  const filas = await todas((desde, hasta) =>
    supabase
      .from("items_documento")
      .select(
        "descripcion_original, cantidad, precio_unitario, total, producto:productos(nombre), documento:documentos_compra!inner(fecha, tipo, numero, estado, proveedor:proveedores(nombre, rut))",
      )
      .eq("documento.estado", "confirmado")
      .order("created_at")
      .range(desde, hasta),
  );
  type F = (typeof filas)[number];
  const columnas: Columna<F>[] = [
    { titulo: "Fecha", valor: (f) => fechaCsv(f.documento.fecha) },
    { titulo: "Proveedor", valor: (f) => f.documento.proveedor?.nombre },
    { titulo: "RUT proveedor", valor: (f) => f.documento.proveedor?.rut },
    { titulo: "Documento", valor: (f) => (f.documento.tipo === "factura" ? "Factura" : "Boleta") },
    { titulo: "N°", valor: (f) => f.documento.numero },
    { titulo: "Dice en la boleta", valor: (f) => f.descripcion_original },
    { titulo: "Producto", valor: (f) => f.producto?.nombre },
    { titulo: "Cantidad", valor: (f) => Number(f.cantidad) },
    { titulo: "Precio unitario ($)", valor: (f) => Number(f.precio_unitario) },
    { titulo: "Total ($)", valor: (f) => f.total },
  ];
  return aCsv(columnas, filas);
}

async function movimientosCsv(supabase: Supabase) {
  const filas = await todas((desde, hasta) =>
    supabase.from("movimientos_stock").select("fecha, tipo, motivo, cantidad, producto:productos(nombre, unidad)").order("fecha").range(desde, hasta),
  );
  type F = (typeof filas)[number];
  const columnas: Columna<F>[] = [
    { titulo: "Fecha", valor: (f) => fechaCsv(f.fecha) },
    { titulo: "Producto", valor: (f) => f.producto?.nombre },
    { titulo: "Qué pasó", valor: (f) => describirMovimiento(f).texto },
    { titulo: "Cantidad (+ entra, − sale)", valor: (f) => Number(f.cantidad) },
    { titulo: "Unidad", valor: (f) => (f.producto ? UNIDADES[f.producto.unidad] : "") },
  ];
  return aCsv(columnas, filas);
}

async function ventasCsv(supabase: Supabase) {
  const filas = await todas((desde, hasta) =>
    supabase
      .from("items_venta")
      .select("cantidad, precio_unitario, total, producto:productos(nombre), venta:ventas!inner(id_local, fecha, medio_pago, vendedor:vendedores(nombre))")
      .order("created_at")
      .range(desde, hasta),
  );
  type F = (typeof filas)[number];
  const columnas: Columna<F>[] = [
    { titulo: "Fecha", valor: (f) => fechaCsv(f.venta.fecha) },
    { titulo: "Hora", valor: (f) => new Date(f.venta.fecha).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }) },
    { titulo: "N° de venta", valor: (f) => f.venta.id_local.slice(0, 8).toUpperCase() },
    { titulo: "Vendedor", valor: (f) => f.venta.vendedor?.nombre ?? "Dueño" },
    { titulo: "Medio de pago", valor: (f) => MEDIOS[f.venta.medio_pago] },
    { titulo: "Producto", valor: (f) => f.producto?.nombre },
    { titulo: "Cantidad", valor: (f) => Number(f.cantidad) },
    { titulo: "Precio ($)", valor: (f) => f.precio_unitario },
    { titulo: "Total ($)", valor: (f) => f.total },
  ];
  return aCsv(columnas, filas);
}

/** Todos los datos del negocio (derecho de acceso y portabilidad, Ley 21.719). */
async function todoJson(supabase: Supabase, sesion: NonNullable<Awaited<ReturnType<typeof obtenerSesion>>>) {
  // Consulta genérica por nombre de tabla (para el archivo completo no hace falta el tipo exacto de cada fila).
  type Fila = Record<string, unknown>;
  type ConsultaGenerica = {
    select: (c: string) => { order: (c: string) => { range: (a: number, b: number) => PromiseLike<{ data: Fila[] | null; error: unknown }> } };
  };
  const tabla = (nombre: keyof Database["public"]["Tables"], columnas = "*") =>
    todas<Fila>((desde, hasta) => (supabase.from(nombre) as unknown as ConsultaGenerica).select(columnas).order("created_at").range(desde, hasta));

  const esDueno = sesion.usuario.rol === "dueno";
  const [negocio, personas, consentimientos] = await Promise.all([
    supabase.from("empresas").select("rut, razon_social, nombre_fantasia, comuna, plan, estado_suscripcion, dia_pago, creada_en").maybeSingle(),
    tabla("usuarios", "rut, nombre, correo, rol, created_at"),
    tabla("consentimientos", "tipo, version, aceptado, fecha, ip"),
  ]);
  const datos: Record<string, unknown> = {
    archivo: "Todos tus datos en RH Stock",
    generado_en: new Date().toISOString(),
    negocio: negocio.data,
    personas,
    consentimientos,
  };

  if (esDueno) {
    const [categorias, productos, costos, proveedores, documentos, itemsCompra, aprendido, movimientos, ventas, itemsVenta, cierres, avisos, vendedores] =
      await Promise.all([
        tabla("categorias", "nombre, margen_objetivo"),
        tabla("productos", "id, nombre, unidad, codigo_barras, stock_actual, stock_minimo, precio_venta, activo, created_at"),
        supabase.rpc("costos_de_mi_negocio"),
        tabla("proveedores", "id, nombre, rut"),
        tabla("documentos_compra", "id, proveedor_id, tipo, numero, fecha, neto, iva, total, estado, imagen_url, datos_extraidos, created_at"),
        tabla("items_documento", "documento_id, descripcion_original, cantidad, precio_unitario, total, producto_id"),
        tabla("alias_productos", "proveedor_id, descripcion_original, producto_id"),
        tabla("movimientos_stock", "producto_id, tipo, motivo, cantidad, referencia_id, fecha"),
        tabla("ventas", "id, id_local, vendedor_id, fecha, total, medio_pago"),
        tabla("items_venta", "venta_id, producto_id, cantidad, precio_unitario, total"),
        tabla("cierres_caja", "fecha, total_sistema, efectivo_sistema, efectivo_contado, diferencia"),
        tabla("alertas", "tipo, producto_id, mensaje, leida, created_at"),
        tabla("vendedores", "id, nombre, activo"),
      ]);
    const costoPorProducto = new Map((costos.data ?? []).map((c) => [c.producto_id, Number(c.costo_promedio)]));

    // Enlaces a las fotos de boletas (vencen en 24 horas).
    const conFoto = (documentos as unknown as { id: string; imagen_url: string | null }[]).filter((d) => d.imagen_url);
    const { data: enlaces } = conFoto.length
      ? await supabase.storage.from("boletas").createSignedUrls(conFoto.map((d) => d.imagen_url!), 86_400)
      : { data: [] };

    Object.assign(datos, {
      categorias,
      productos: (productos as unknown as { id: string }[]).map((p) => ({ ...p, costo_promedio: costoPorProducto.get(p.id) ?? null })),
      proveedores,
      compras: { documentos, productos: itemsCompra, lo_que_aprendio_la_app: aprendido },
      movimientos_de_stock: movimientos,
      ventas: { ventas, productos: itemsVenta, cierres_de_caja: cierres },
      avisos,
      vendedores,
      fotos_de_boletas: {
        nota: "Enlaces para descargar tus fotos. Vencen 24 horas después de generar este archivo.",
        enlaces: (enlaces ?? []).map((e, i) => ({ documento_id: conFoto[i].id, enlace: e.signedUrl })),
      },
    });
  }

  return JSON.stringify(datos, null, 2);
}

const TIPOS = ["productos", "compras", "movimientos", "ventas", "todo"] as const;

export async function GET(request: NextRequest, { params }: RouteContext<"/api/exportar/[tipo]">) {
  const { tipo } = await params;
  const sesion = await obtenerSesion();
  if (!sesion?.empresa) return NextResponse.redirect(new URL("/entrar", request.url));
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) return NextResponse.json({ error: "No existe esa descarga" }, { status: 404 });
  // Los archivos de Excel incluyen costos: solo el dueño. "Todos mis datos": cada persona descarga lo suyo.
  if (tipo !== "todo" && sesion.usuario.rol !== "dueno") return NextResponse.redirect(new URL("/mas", request.url));

  const supabase = await crearClienteServidor();
  try {
    if (tipo === "todo") return descarga(await todoJson(supabase, sesion), nombreArchivo("mis-datos", "json"), "application/json; charset=utf-8");
    const csv =
      tipo === "productos"
        ? await productosCsv(sesion)
        : tipo === "compras"
          ? await comprasCsv(supabase)
          : tipo === "movimientos"
            ? await movimientosCsv(supabase)
            : await ventasCsv(supabase);
    return descarga(csv, nombreArchivo(tipo), "text/csv; charset=utf-8");
  } catch (error) {
    console.error(`exportar ${tipo}:`, error);
    return NextResponse.redirect(new URL("/mas/exportar?error=1", request.url));
  }
}
