import type { LecturaIA } from "./esquema";

// Lectura fija de la boleta de ejemplo (scripts/demo/boleta-ejemplo.png).
// Se usa en el demo y, con LECTOR_BOLETAS=ejemplo, para probar sin clave de la API de Claude.
// Todo es inventado: el proveedor y su RUT son ficticios.
export const LECTURA_DE_EJEMPLO: LecturaIA = {
  legible: true,
  problema: "ninguno",
  tipo: "boleta",
  proveedor_nombre: "Mayorista del Sur",
  proveedor_rut: "77.123.456-9",
  numero: "004521",
  fecha: null,
  items: [
    { descripcion: "ARROZ G1 1KG", cantidad: 10, precio_unitario: 1150, total: 11500 },
    { descripcion: "ACEITE VEG 1LT", cantidad: 6, precio_unitario: 2350, total: 14100 },
    { descripcion: "AZUCAR 1KG", cantidad: 12, precio_unitario: 1020, total: 12240 },
    { descripcion: "GALLETA CHOC 120GR", cantidad: 24, precio_unitario: 520, total: 12480 },
    { descripcion: "TE BOLSITAS X100", cantidad: 4, precio_unitario: 1890, total: 7560 },
    { descripcion: "MANI SALADO 200GR", cantidad: 10, precio_unitario: 890, total: 8900 },
  ],
  neto: 56118,
  iva: 10662,
  total: 66780,
};
