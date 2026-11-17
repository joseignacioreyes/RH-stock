// Lo que la IA debe devolver al leer una boleta o factura, y cómo se limpia antes de usarlo.
// (Sin dependencias del servidor: se prueba en src/lib/lector-boletas/esquema.test.ts)
import { z } from "zod";
import { normalizarRut } from "../rut";

/**
 * Esquema fijo que se le pide a la IA (salida estructurada).
 * Se mantiene simple a propósito: las reglas de negocio se aplican después, en parsearLectura().
 */
export const EsquemaLecturaIA = z.object({
  legible: z.boolean().describe("false si la foto no se puede leer bien o no es una boleta/factura de compra"),
  problema: z
    .enum(["ninguno", "borrosa", "oscura", "cortada", "no_es_documento"])
    .describe("Si no es legible, por qué. Si se lee bien: ninguno"),
  tipo: z.enum(["boleta", "factura"]),
  proveedor_nombre: z.string().nullable().describe("Nombre o razón social de quien vende"),
  proveedor_rut: z.string().nullable().describe("RUT de quien vende, tal como aparece"),
  numero: z.string().nullable().describe("Número de la boleta o factura"),
  fecha: z.string().nullable().describe("Fecha de emisión en formato AAAA-MM-DD"),
  items: z.array(
    z.object({
      descripcion: z.string().describe("Texto del producto tal como aparece en el documento"),
      cantidad: z.number().describe("Cantidad comprada (unidades, kilos o litros)"),
      precio_unitario: z.number().nullable().describe("Precio de UNA unidad, en pesos, sin puntos"),
      total: z.number().nullable().describe("Total de la línea en pesos, sin puntos"),
    }),
  ),
  neto: z.number().nullable(),
  iva: z.number().nullable(),
  total: z.number().nullable(),
});

export type LecturaIA = z.infer<typeof EsquemaLecturaIA>;

export type ItemLeido = { descripcion: string; cantidad: number; precioUnitario: number; total: number };

export type LecturaBoleta = {
  tipo: "boleta" | "factura";
  proveedorNombre: string | null;
  proveedorRut: string | null;
  numero: string | null;
  fecha: string | null;
  items: ItemLeido[];
  neto: number | null;
  iva: number | null;
  total: number;
};

export type ResultadoLectura =
  | { ok: true; lectura: LecturaBoleta }
  | { ok: false; motivo: "borrosa" | "oscura" | "cortada" | "no_es_documento" | "sin_productos" | "formato" };

/** Mensajes para la persona, según lo que pasó con la foto. */
export const MENSAJES_PROBLEMA: Record<Exclude<ResultadoLectura, { ok: true }>["motivo"], string> = {
  borrosa: "La foto salió borrosa. Intenta de nuevo con el celular quieto y más luz.",
  oscura: "La foto salió muy oscura. Intenta de nuevo con más luz.",
  cortada: "No se ve la boleta completa. Saca la foto de nuevo, con toda la boleta dentro.",
  no_es_documento: "No encontramos una boleta o factura en la foto. Intenta de nuevo.",
  sin_productos: "No pudimos leer los productos de la boleta. Intenta de nuevo con más luz.",
  formato: "No pudimos leer bien la boleta. Puedes intentar con otra foto o ingresarla a mano.",
};

/** Saca el JSON de un texto (por si viene entre ```json … ```). Devuelve null si no hay JSON válido. */
export function extraerJson(texto: string): unknown {
  const sinCercas = texto.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const inicio = sinCercas.indexOf("{");
  const fin = sinCercas.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(sinCercas.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

const redondear = (n: number, decimales = 3) => Math.round(n * 10 ** decimales) / 10 ** decimales;

/** "2026-11-14" válido y no en el futuro; si no, null. */
function fechaValida(fecha: string | null, hoy: Date): string | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const d = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) return null;
  if (d.getTime() > hoy.getTime() + 86_400_000) return null;
  return fecha;
}

/**
 * Valida y limpia lo que devolvió la IA:
 * RUT con dígito verificador, fecha real, precios en pesos enteros, líneas sin cantidad fuera,
 * precio unitario calculado desde el total si falta, y total del documento si no se leyó.
 */
export function parsearLectura(datos: unknown, hoy: Date = new Date()): ResultadoLectura {
  const validacion = EsquemaLecturaIA.safeParse(datos);
  if (!validacion.success) return { ok: false, motivo: "formato" };
  const d = validacion.data;

  if (!d.legible) return { ok: false, motivo: d.problema === "ninguno" ? "borrosa" : d.problema };

  const items: ItemLeido[] = d.items
    .map((item) => {
      const cantidad = redondear(item.cantidad);
      const precioUnitario =
        item.precio_unitario != null && item.precio_unitario >= 0
          ? Math.round(item.precio_unitario * 100) / 100
          : item.total != null && cantidad > 0
            ? Math.round((item.total / cantidad) * 100) / 100
            : null;
      if (!(cantidad > 0) || precioUnitario === null) return null;
      const total = item.total != null && item.total >= 0 ? Math.round(item.total) : Math.round(cantidad * precioUnitario);
      return { descripcion: item.descripcion.trim().replace(/\s+/g, " "), cantidad, precioUnitario, total };
    })
    .filter((item): item is ItemLeido => item !== null && item.descripcion.length > 0);

  if (items.length === 0) return { ok: false, motivo: "sin_productos" };

  const sumaItems = items.reduce((suma, item) => suma + item.total, 0);
  const entero = (n: number | null) => (n != null && n >= 0 ? Math.round(n) : null);

  return {
    ok: true,
    lectura: {
      tipo: d.tipo,
      proveedorNombre: d.proveedor_nombre?.trim() || null,
      proveedorRut: d.proveedor_rut ? normalizarRut(d.proveedor_rut) : null,
      numero: d.numero?.trim() || null,
      fecha: fechaValida(d.fecha, hoy),
      items,
      neto: entero(d.neto),
      iva: entero(d.iva),
      total: entero(d.total) ?? sumaItems,
    },
  };
}
