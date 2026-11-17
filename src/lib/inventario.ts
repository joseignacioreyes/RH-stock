// Cálculos del inventario. La base de datos usa las mismas fórmulas
// (supabase/migrations/…_fase2_inventario.sql) y las pruebas verifican ambas.

export type TipoMovimiento = "compra" | "venta" | "ajuste" | "merma";

export type Movimiento = { cantidad: number; costoUnitario?: number | null };

/** Días sin movimiento para que un producto cuente como "sin venta hace un mes". */
export const DIAS_SIN_MOVIMIENTO = 30;

/**
 * Costo promedio ponderado después de una entrada de mercadería.
 * Ej.: tenía 10 a $1.000 y compro 10 a $1.200 → el costo queda en $1.100.
 * Si no había stock (o quedó negativo por ventas sin registrar), manda el costo nuevo.
 */
export function costoPromedioPonderado(stockAnterior: number, costoAnterior: number, cantidad: number, costoNuevo: number): number {
  if (stockAnterior <= 0) return redondear(costoNuevo);
  return redondear((stockAnterior * costoAnterior + cantidad * costoNuevo) / (stockAnterior + cantidad));
}

/**
 * Aplica una lista de movimientos, en orden, y devuelve el stock y el costo.
 * Así se calcula el stock desde su fuente de verdad (los movimientos).
 */
export function calcularStock(movimientos: Movimiento[]): { stock: number; costo: number } {
  let stock = 0;
  let costo = 0;
  for (const { cantidad, costoUnitario } of movimientos) {
    if (cantidad > 0 && costoUnitario != null) costo = costoPromedioPonderado(stock, costo, cantidad, costoUnitario);
    stock = redondear(stock + cantidad, 3);
  }
  return { stock, costo };
}

/** Margen sobre el precio de venta, en %: (precio − costo) / precio. Null si no hay precio. */
export function margen(precioVenta: number, costo: number): number | null {
  if (precioVenta <= 0) return null;
  return redondear(((precioVenta - costo) / precioVenta) * 100, 1);
}

/** ¿El margen está bajo el objetivo de su categoría? */
export function margenBajoObjetivo(precioVenta: number, costo: number, objetivo: number): boolean {
  const m = margen(precioVenta, costo);
  return m !== null && costo > 0 && m < objetivo;
}

/** "Se está acabando": el stock llegó al mínimo o menos (si el dueño puso un mínimo). */
export function seEstaAcabando(stockActual: number, stockMinimo: number): boolean {
  return stockMinimo > 0 && stockActual <= stockMinimo;
}

/** "Sin venta hace un mes": su último movimiento fue hace más de 30 días. */
export function sinMovimientoReciente(ultimoMovimiento: string | Date | null, ahora: Date = new Date()): boolean {
  if (!ultimoMovimiento) return false;
  const dias = (ahora.getTime() - new Date(ultimoMovimiento).getTime()) / 86_400_000;
  return dias > DIAS_SIN_MOVIMIENTO;
}

/** Diferencia de un conteo: lo contado menos lo que dice el sistema. */
export function diferenciaConteo(stockSistema: number, contado: number): number {
  return redondear(contado - stockSistema, 3);
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Precio de venta para lograr el margen objetivo, redondeado a $10: costo / (1 − margen). */
export function precioParaMargen(costo: number, margenObjetivo: number): number {
  if (costo <= 0 || margenObjetivo >= 100) return 0;
  return Math.ceil(costo / (1 - margenObjetivo / 100) / 10) * 10;
}

export type Recomendacion = { precioSugerido: number; frase: string };

/**
 * Si el precio actual deja menos margen que el objetivo, sugiere un precio y lo explica en una frase.
 * Ej.: "Tu costo es $1.350. Con tu margen objetivo de 25%, el precio sugerido es $1.800 (hoy lo vendes a $1.590)."
 */
export function recomendarPrecio(
  costo: number,
  precioActual: number,
  margenObjetivo: number,
  formatear: (n: number) => string,
  formatearPct: (n: number) => string,
): Recomendacion | null {
  if (!margenBajoObjetivo(precioActual, costo, margenObjetivo)) return null;
  const precioSugerido = precioParaMargen(costo, margenObjetivo);
  if (precioSugerido <= precioActual) return null;
  return {
    precioSugerido,
    frase: `Tu costo es ${formatear(costo)}. Con tu margen objetivo de ${formatearPct(margenObjetivo)}, el precio sugerido es ${formatear(precioSugerido)} (hoy lo vendes a ${formatear(precioActual)}).`,
  };
}
