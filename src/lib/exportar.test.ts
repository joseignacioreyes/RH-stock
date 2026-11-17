import { describe, expect, it } from "vitest";
import { aCsv, fechaCsv } from "./exportar";

type Fila = { nombre: string; stock: number; precio: number; activo: boolean; nota?: string | null };
const columnas = [
  { titulo: "Producto", valor: (f: Fila) => f.nombre },
  { titulo: "Me queda", valor: (f: Fila) => f.stock },
  { titulo: "Precio", valor: (f: Fila) => f.precio },
  { titulo: "Activo", valor: (f: Fila) => f.activo },
  { titulo: "Nota", valor: (f: Fila) => f.nota },
];

describe("CSV para Excel en español", () => {
  const csv = aCsv(columnas, [
    { nombre: "Pan marraqueta (kg)", stock: 10.5, precio: 1990, activo: true, nota: null },
    { nombre: 'Bebida "cola"; 1,5 L', stock: 3, precio: 1990, activo: false, nota: "=HYPERLINK(\"x\")" },
  ]);
  const lineas = csv.replace("﻿", "").trim().split("\r\n");

  it("parte con BOM para que las tildes se vean bien", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("usa punto y coma y coma decimal", () => {
    expect(lineas[0]).toBe("Producto;Me queda;Precio;Activo;Nota");
    expect(lineas[1]).toBe("Pan marraqueta (kg);10,5;1990;Sí;");
  });

  it("encierra entre comillas los textos con ; o comillas", () => {
    expect(lineas[2].startsWith('"Bebida ""cola""; 1,5 L";3;1990;No;')).toBe(true);
  });

  it("neutraliza fórmulas escondidas en los textos", () => {
    expect(lineas[2].endsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });

  it("fechas DD-MM-AAAA en hora de Chile", () => {
    expect(fechaCsv("2026-11-18T02:00:00Z")).toBe("17-11-2026");
    expect(fechaCsv("2026-11-14")).toBe("14-11-2026");
    expect(fechaCsv(null)).toBe("");
  });
});
