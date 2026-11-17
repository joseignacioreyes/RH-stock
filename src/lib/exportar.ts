// Archivos CSV que se abren bien en el Excel en español de Chile:
// separados por punto y coma, coma decimal, fechas DD-MM-AAAA y con "BOM" para que las tildes se vean bien.

export type Valor = string | number | boolean | null | undefined;
export type Columna<T> = { titulo: string; valor: (fila: T) => Valor };

const BOM = "﻿";
const SEPARADOR = ";";

function celda(valor: Valor): string {
  if (valor === null || valor === undefined) return "";
  let texto: string;
  if (typeof valor === "number") texto = Number.isInteger(valor) ? String(valor) : String(Math.round(valor * 1000) / 1000).replace(".", ",");
  else if (typeof valor === "boolean") texto = valor ? "Sí" : "No";
  else texto = valor;
  // Evita que Excel ejecute fórmulas escondidas en un texto (=, +, -, @ al inicio).
  if (/^[=+\-@]/.test(texto) && typeof valor === "string") texto = `'${texto}`;
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function aCsv<T>(columnas: Columna<T>[], filas: T[]): string {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(SEPARADOR), ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(SEPARADOR))];
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** "2026-11-17T15:00:00Z" → "17-11-2026" (hora de Chile). */
export function fechaCsv(fecha: string | null | undefined): string {
  if (!fecha) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T12:00:00Z`) : new Date(fecha);
  const [anio, mes, dia] = d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" }).split("-");
  return `${dia}-${mes}-${anio}`;
}

/** Nombre de archivo con la fecha de hoy: "rh-stock-productos-17-11-2026.csv". */
export function nombreArchivo(que: string, extension = "csv"): string {
  return `rh-stock-${que}-${fechaCsv(new Date().toISOString())}.${extension}`;
}
