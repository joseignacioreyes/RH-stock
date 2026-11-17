import { describe, expect, it } from "vitest";
import { formatearCantidad, formatearFecha, formatearPesos, formatearPorcentaje, leerNumero } from "./formato";

describe("formatos chilenos", () => {
  it("pesos sin decimales y con punto de miles", () => {
    expect(formatearPesos(1350)).toBe("$1.350");
    expect(formatearPesos(1234567.6)).toBe("$1.234.568");
    expect(formatearPesos(0)).toBe("$0");
    expect(formatearPesos(-1500)).toBe("-$1.500");
  });

  it("cantidades con su unidad", () => {
    expect(formatearCantidad(12, "unidad")).toBe("12 unidades");
    expect(formatearCantidad(1, "unidad")).toBe("1 unidad");
    expect(formatearCantidad(1.5, "kg")).toBe("1,5 kg");
    expect(formatearCantidad(2, "litro")).toBe("2 litros");
  });

  it("fechas DD-MM-AAAA en hora de Chile", () => {
    // 02:00 UTC del 18 es todavía el 17 en Santiago.
    expect(formatearFecha("2026-11-18T02:00:00Z")).toBe("17-11-2026");
  });

  it("porcentajes con coma decimal", () => {
    expect(formatearPorcentaje(34.7)).toBe("34,7%");
    expect(formatearPorcentaje(25)).toBe("25%");
  });

  it("lee números como los escribe la gente", () => {
    expect(leerNumero("1.350")).toBe(1350);
    expect(leerNumero("$2.000")).toBe(2000);
    expect(leerNumero("1,5")).toBe(1.5);
    expect(leerNumero("12")).toBe(12);
    expect(leerNumero("1.234.567")).toBe(1234567);
    expect(leerNumero("")).toBeNull();
    expect(leerNumero("hola")).toBeNull();
  });
});
