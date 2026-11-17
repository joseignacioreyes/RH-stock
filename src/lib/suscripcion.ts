// Plan y pagos de la suscripción: textos, montos con IVA y datos de transferencia.
// (Sin dependencias del servidor: se prueba en src/lib/suscripcion.test.ts)

import { formatearPesos } from "./formato";

export type PlanSuscripcion = "piloto" | "mensual";
export type EstadoSuscripcion = "al_dia" | "por_vencer" | "atrasado" | "suspendido";
export type EstadoPago = "pendiente" | "informado" | "confirmado" | "rechazado";

export type Suscripcion = {
  plan: PlanSuscripcion;
  precioMensual: number;
  diaPago: number;
  /** Próximo vencimiento, AAAA-MM-DD (null en el piloto). */
  proximoVencimiento: string | null;
  /** Mes que se paga, AAAA-MM. */
  periodo: string | null;
  estado: EstadoSuscripcion;
  /** Desde qué día la app queda solo para mirar si no paga. */
  soloLecturaDesde: string | null;
  /** Ya subió el comprobante de este mes y falta que José lo revise. */
  pagoEnRevision: boolean;
};

/** Fila de mi_suscripcion() → objeto de la app. */
export function suscripcionDesdeFila(fila: {
  plan: string;
  precio_mensual: number;
  dia_pago: number;
  proximo_vencimiento: string | null;
  periodo: string | null;
  estado: string;
  solo_lectura_desde: string | null;
  pago_en_revision: boolean;
}): Suscripcion {
  return {
    plan: fila.plan === "mensual" ? "mensual" : "piloto",
    precioMensual: fila.precio_mensual,
    diaPago: fila.dia_pago,
    proximoVencimiento: fila.proximo_vencimiento,
    periodo: fila.periodo,
    estado: (["al_dia", "por_vencer", "atrasado", "suspendido"].includes(fila.estado) ? fila.estado : "al_dia") as EstadoSuscripcion,
    soloLecturaDesde: fila.solo_lectura_desde,
    pagoEnRevision: fila.pago_en_revision,
  };
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-12" → "diciembre 2026". */
export function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  const nombre = MESES[Number(mes) - 1];
  return nombre ? `${nombre} ${anio}` : periodo;
}

export const TASA_IVA = 0.19;

/** Precio con IVA incluido → neto e IVA. $30.000 → neto $25.210 + IVA $4.790. */
export function separarIva(totalConIva: number): { neto: number; iva: number } {
  const neto = Math.round(totalConIva / (1 + TASA_IVA));
  return { neto, iva: totalConIva - neto };
}

export const NOMBRE_PLAN: Record<PlanSuscripcion, string> = {
  piloto: "Piloto gratis",
  mensual: "Mensual",
};

/** Etiqueta de colores para el estado (verde, ámbar, rojo, gris). */
export const ETIQUETA_ESTADO: Record<EstadoSuscripcion, { texto: string; clases: string }> = {
  al_dia: { texto: "Al día", clases: "bg-green-100 text-green-800" },
  por_vencer: { texto: "Por vencer", clases: "bg-amber-100 text-amber-900" },
  atrasado: { texto: "Atrasado", clases: "bg-red-100 text-red-800" },
  suspendido: { texto: "Solo para mirar", clases: "bg-gray-200 text-gray-800" },
};

export const ETIQUETA_PAGO: Record<EstadoPago, { texto: string; icono: string; clases: string }> = {
  pendiente: { texto: "Pendiente", icono: "🕐", clases: "bg-gray-200 text-gray-800" },
  informado: { texto: "En revisión", icono: "🕐", clases: "bg-amber-100 text-amber-900" },
  confirmado: { texto: "Pagado", icono: "✅", clases: "bg-green-100 text-green-800" },
  rechazado: { texto: "No confirmado", icono: "❌", clases: "bg-red-100 text-red-800" },
};

/** Motivos de rechazo que José elige con un toque (o escribe otro). */
export const MOTIVOS_RECHAZO = [
  "No nos llegó la transferencia",
  "El monto no coincide con tu plan",
  "El comprobante no se puede leer",
  "El comprobante es de otro mes",
] as const;

/** ¿El monto leído del comprobante es distinto al del plan? (null si no se pudo leer). */
export function montoDistinto(leido: number | null | undefined, esperado: number): boolean {
  return leido != null && Math.round(leido) !== esperado;
}

export type DatosTransferencia = {
  banco: string;
  tipoCuenta: string;
  numero: string;
  titular: string;
  rut: string;
  correo: string;
  /** Datos inventados para probar (nunca en producción). */
  deEjemplo: boolean;
};

/** Texto para copiar y pegar en la app del banco. */
export function textoTransferencia(datos: DatosTransferencia, monto: number): string {
  return [
    `Banco: ${datos.banco}`,
    `Tipo de cuenta: ${datos.tipoCuenta}`,
    `Número: ${datos.numero}`,
    `Nombre: ${datos.titular}`,
    `RUT: ${datos.rut}`,
    `Correo: ${datos.correo}`,
    `Monto: ${formatearPesos(monto)}`,
  ].join("\n");
}
