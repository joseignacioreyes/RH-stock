// Lo que la IA debe devolver al leer un comprobante de transferencia, y cómo se limpia.
// (Sin dependencias del servidor: se prueba en src/lib/lector-comprobantes/esquema.test.ts)
import { z } from "zod";

export const EsquemaComprobanteIA = z.object({
  legible: z.boolean().describe("false si no se puede leer bien o no es un comprobante de transferencia o depósito"),
  problema: z
    .enum(["ninguno", "borrosa", "oscura", "cortada", "no_es_comprobante"])
    .describe("Si no es legible, por qué. Si se lee bien: ninguno"),
  monto: z.number().nullable().describe("Monto transferido en pesos, sin puntos"),
  fecha: z.string().nullable().describe("Fecha de la transferencia en formato AAAA-MM-DD"),
  banco_origen: z.string().nullable().describe("Banco desde donde se transfirió"),
  titular_origen: z.string().nullable().describe("Nombre de quien transfirió"),
  numero_operacion: z.string().nullable().describe("Número o código de la operación"),
});

export type LecturaComprobanteIA = z.infer<typeof EsquemaComprobanteIA>;

export type LecturaComprobante = {
  monto: number | null;
  fecha: string | null;
  banco: string | null;
  titular: string | null;
  operacion: string | null;
};

export type ResultadoComprobante =
  | { ok: true; lectura: LecturaComprobante }
  | { ok: false; motivo: "borrosa" | "oscura" | "cortada" | "no_es_comprobante" | "formato" };

export const MENSAJES_COMPROBANTE: Record<Exclude<ResultadoComprobante, { ok: true }>["motivo"], string> = {
  borrosa: "La foto salió borrosa. Intenta de nuevo con el celular quieto y más luz.",
  oscura: "La foto salió muy oscura. Intenta de nuevo con más luz.",
  cortada: "No se ve el comprobante completo. Saca la foto de nuevo, con todo el comprobante dentro.",
  no_es_comprobante: "No encontramos un comprobante de transferencia. Sube la captura o el PDF que te dio tu banco.",
  formato: "No pudimos leer el comprobante, pero lo recibimos igual y lo revisaremos.",
};

const texto = (valor: string | null) => {
  const limpio = valor?.trim().replace(/\s+/g, " ");
  return limpio ? limpio.slice(0, 80) : null;
};

/** "2026-12-03" válido y no en el futuro; si no, null. */
function fechaValida(fecha: string | null, hoy: Date): string | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const d = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) return null;
  if (d.getTime() > hoy.getTime() + 86_400_000) return null;
  return fecha;
}

/** Valida y limpia lo que devolvió la IA: monto entero positivo, fecha real, textos cortos. */
export function parsearComprobante(datos: unknown, hoy: Date = new Date()): ResultadoComprobante {
  const validacion = EsquemaComprobanteIA.safeParse(datos);
  if (!validacion.success) return { ok: false, motivo: "formato" };
  const d = validacion.data;
  if (!d.legible) return { ok: false, motivo: d.problema === "ninguno" ? "borrosa" : d.problema };

  return {
    ok: true,
    lectura: {
      monto: d.monto != null && d.monto > 0 ? Math.round(d.monto) : null,
      fecha: fechaValida(d.fecha, hoy),
      banco: texto(d.banco_origen),
      titular: texto(d.titular_origen),
      operacion: texto(d.numero_operacion),
    },
  };
}
