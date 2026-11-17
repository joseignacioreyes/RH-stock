// Formatos chilenos: pesos sin decimales con punto de miles ($1.350),
// fechas DD-MM-AAAA y zona horaria America/Santiago.

const ZONA = "America/Santiago";

const pesos = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** 1350 → "$1.350". */
export function formatearPesos(valor: number): string {
  const redondeado = Math.round(valor);
  return `${redondeado < 0 ? "-" : ""}$${pesos.format(Math.abs(redondeado))}`;
}

const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });

export type Unidad = "unidad" | "kg" | "litro" | "caja";

const NOMBRES_UNIDAD: Record<Unidad, [singular: string, plural: string]> = {
  unidad: ["unidad", "unidades"],
  kg: ["kg", "kg"],
  litro: ["litro", "litros"],
  caja: ["caja", "cajas"],
};

/** 12 + "unidad" → "12 unidades"; 1.5 + "kg" → "1,5 kg". */
export function formatearCantidad(cantidad: number, unidad: Unidad): string {
  const [singular, plural] = NOMBRES_UNIDAD[unidad] ?? ["", ""];
  const texto = numero.format(cantidad);
  return `${texto} ${Math.abs(cantidad) === 1 ? singular : plural}`.trim();
}

export function nombreUnidad(unidad: Unidad, plural = true): string {
  return NOMBRES_UNIDAD[unidad]?.[plural ? 1 : 0] ?? unidad;
}

/** Fecha → "17-11-2026" (hora de Chile). */
export function formatearFecha(fecha: string | Date): string {
  const partes = new Intl.DateTimeFormat("es-CL", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" })
    .formatToParts(new Date(fecha))
    .reduce<Record<string, string>>((acc, parte) => ({ ...acc, [parte.type]: parte.value }), {});
  return `${partes.day}-${partes.month}-${partes.year}`;
}

/** Lee un número escrito por una persona: "1.350" → 1350, "1,5" → 1.5, "$2.000" → 2000. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, "");
  if (!limpio) return null;
  // En Chile el punto separa miles y la coma los decimales.
  const normalizado = limpio.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  return Number(normalizado);
}

/** 34.7 → "34,7%". */
export function formatearPorcentaje(valor: number): string {
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(valor)}%`;
}
