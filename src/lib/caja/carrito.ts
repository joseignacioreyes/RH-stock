// Carrito de la caja (sin dependencias: se usa en el celular y se prueba en carrito.test.ts).

export type ProductoCaja = {
  id: string;
  nombre: string;
  precio: number;
  unidad: "unidad" | "kg" | "litro" | "caja";
  codigoBarras: string | null;
  icono: string;
};

export type LineaCarrito = { producto: ProductoCaja; cantidad: number };

export const esGranel = (p: Pick<ProductoCaja, "unidad">) => p.unidad === "kg" || p.unidad === "litro";

const redondear3 = (n: number) => Math.round(n * 1000) / 1000;

/** Suma un producto (si ya está, aumenta su cantidad). Cada lectura del escáner suma 1. */
export function agregar(carrito: LineaCarrito[], producto: ProductoCaja, cantidad = 1): LineaCarrito[] {
  const existe = carrito.find((l) => l.producto.id === producto.id);
  if (existe) {
    return carrito.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: redondear3(l.cantidad + cantidad) } : l));
  }
  return [...carrito, { producto, cantidad: redondear3(cantidad) }];
}

/** Cambia la cantidad de una línea; con 0 o menos, la saca. */
export function cambiarCantidad(carrito: LineaCarrito[], productoId: string, cantidad: number): LineaCarrito[] {
  if (cantidad <= 0) return carrito.filter((l) => l.producto.id !== productoId);
  return carrito.map((l) => (l.producto.id === productoId ? { ...l, cantidad: redondear3(cantidad) } : l));
}

export const totalLinea = (l: LineaCarrito) => Math.round(l.cantidad * l.producto.precio);
export const totalCarrito = (carrito: LineaCarrito[]) => carrito.reduce((t, l) => t + totalLinea(l), 0);

/** "$1.000 de pan" con el pan a $1.990 el kilo → 0,503 kg. */
export function cantidadDesdeMonto(monto: number, precioPorUnidad: number): number {
  if (monto <= 0 || precioPorUnidad <= 0) return 0;
  return redondear3(monto / precioPorUnidad);
}

/** Busca un producto por código de barras exacto (lo que manda el lector USB o la cámara). */
export function buscarPorCodigo(productos: ProductoCaja[], codigo: string): ProductoCaja | null {
  const limpio = codigo.trim();
  return limpio ? (productos.find((p) => p.codigoBarras === limpio) ?? null) : null;
}

/** Busca por nombre (sin tildes ni mayúsculas) o por código. */
export function buscar(productos: ProductoCaja[], texto: string, limite = 8): ProductoCaja[] {
  const normalizar = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  const q = normalizar(texto.trim());
  if (!q) return [];
  return productos.filter((p) => normalizar(p.nombre).includes(q) || p.codigoBarras?.startsWith(q)).slice(0, limite);
}
