// Sugiere a qué producto del negocio corresponde cada línea de una boleta.
// 1) Lo que la app ya aprendió (alias): "ARROZ G1 1KG" de este proveedor = "Arroz grado 1 1 kg".
// 2) Si no hay alias, el producto con más palabras en común.

/** Igual que public.normalizar_descripcion() en la base de datos. */
export function normalizarDescripcion(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLowerCase();
}

const ABREVIACIONES: Record<string, string> = {
  lt: "l",
  lts: "l",
  litro: "l",
  litros: "l",
  kilo: "kg",
  kilos: "kg",
  kgs: "kg",
  grs: "g",
  gr: "g",
  gramos: "g",
  cc: "ml",
  un: "unidad",
  und: "unidad",
  veg: "vegetal",
  choc: "chocolate",
  beb: "bebida",
};
const RELLENO = new Set(["de", "del", "la", "el", "los", "las", "con", "sin", "en", "y", "x", "para", "sabor"]);
const MEDIDAS = new Set(["l", "kg", "g", "ml", "unidad"]);

/**
 * Separa un texto en palabras (lo que dice qué es) y medidas (números y unidades),
 * sin tildes, sin palabras de relleno, con abreviaciones comunes expandidas y sin plural.
 */
function separar(texto: string): { palabras: Set<string>; medidas: Set<string> } {
  const tokens = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2") // "1kg" → "1 kg"
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !RELLENO.has(t))
    .map((t) => ABREVIACIONES[t] ?? t);
  const palabras = new Set<string>();
  const medidas = new Set<string>();
  for (const t of tokens) {
    if (/^\d+$/.test(t) || MEDIDAS.has(t)) medidas.add(t);
    else palabras.add(t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
  }
  return { palabras, medidas };
}

const enComun = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

export type ProductoParaAsociar = { id: string; nombre: string };
export type Alias = { proveedorId: string | null; descripcion: string; productoId: string };
export type Sugerencia = { productoId: string; motivo: "aprendido" | "parecido" } | null;

/**
 * Qué tan parecidos son dos textos (0 a 1). Tiene que haber al menos una palabra en común
 * ("arroz", "aceite"); los números y medidas en común ("1", "kg") solo suman un poco.
 */
export function parecido(a: string, b: string): number {
  const sa = separar(a);
  const sb = separar(b);
  const palabrasComunes = enComun(sa.palabras, sb.palabras);
  if (palabrasComunes === 0) return 0;
  const medidasComunes = enComun(sa.medidas, sb.medidas);
  const base = Math.min(sa.palabras.size, sb.palabras.size) + 0.5 * Math.min(sa.medidas.size, sb.medidas.size);
  return base > 0 ? (palabrasComunes + 0.5 * medidasComunes) / base : 0;
}

/** Mínimo de parecido para sugerir un producto sin haberlo aprendido. */
export const PARECIDO_MINIMO = 0.5;

export function sugerirProducto(
  descripcion: string,
  proveedorId: string | null,
  productos: ProductoParaAsociar[],
  alias: Alias[],
): Sugerencia {
  const clave = normalizarDescripcion(descripcion);
  const existe = (id: string) => productos.some((p) => p.id === id);

  // Primero lo aprendido con este mismo proveedor, después con cualquiera.
  const aprendido =
    alias.find((a) => a.descripcion === clave && a.proveedorId === proveedorId && existe(a.productoId)) ??
    alias.find((a) => a.descripcion === clave && existe(a.productoId));
  if (aprendido) return { productoId: aprendido.productoId, motivo: "aprendido" };

  let mejor: { id: string; puntaje: number } | null = null;
  for (const producto of productos) {
    const puntaje = parecido(descripcion, producto.nombre);
    if (puntaje >= PARECIDO_MINIMO && (!mejor || puntaje > mejor.puntaje)) mejor = { id: producto.id, puntaje };
  }
  return mejor ? { productoId: mejor.id, motivo: "parecido" } : null;
}

/** Nombre para un producto nuevo a partir de la boleta: "ARROZ G1 1KG" → "Arroz g1 1kg". */
export function nombreDesdeDescripcion(descripcion: string): string {
  const limpio = descripcion.trim().replace(/\s+/g, " ").toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Precio de venta sugerido para lograr el margen objetivo (misma fórmula de inventario.ts). */
export { precioParaMargen as precioSugerido } from "./inventario";
