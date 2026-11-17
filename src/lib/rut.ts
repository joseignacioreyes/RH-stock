// RUT chileno: validación con dígito verificador (módulo 11) y formatos.
// Se guarda siempre "normalizado": sin puntos, con guion y K mayúscula → "12345678-5".

/** Deja solo números y K (mayúscula). "12.345.678-k" → "12345678K". */
export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Calcula el dígito verificador de un número de RUT (sin DV). */
export function calcularDv(numero: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/** ¿Es un RUT válido? Acepta cualquier formato: con o sin puntos y guion. */
export function rutEsValido(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (!/^[0-9]{2,8}[0-9K]$/.test(limpio)) return false;
  const numero = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (Number(numero) < 100_000) return false;
  return calcularDv(numero) === dv;
}

/** Formato para guardar: "12.345.678-k" → "12345678-K". Devuelve null si no es válido. */
export function normalizarRut(rut: string): string | null {
  if (!rutEsValido(rut)) return null;
  const limpio = limpiarRut(rut).replace(/^0+/, "");
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/** Formato para mostrar: "123456785" → "12.345.678-5". Si es muy corto, lo deja como está. */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const numero = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${numero}-${limpio.slice(-1)}`;
}

/** Formato mientras la persona escribe: va poniendo puntos y guion sin molestar. */
export function formatearRutMientrasEscribe(valor: string): string {
  const limpio = limpiarRut(valor).slice(0, 9);
  return limpio.length <= 1 ? limpio : formatearRut(limpio);
}
