import { describe, expect, it } from "vitest";
import {
  calcularStock,
  costoPromedioPonderado,
  diferenciaConteo,
  margen,
  margenBajoObjetivo,
  seEstaAcabando,
  sinMovimientoReciente,
} from "./inventario";

describe("costo promedio ponderado", () => {
  it("promedia según cuántas unidades había y cuántas llegaron", () => {
    expect(costoPromedioPonderado(10, 1000, 10, 1200)).toBe(1100);
    expect(costoPromedioPonderado(30, 1000, 10, 1400)).toBe(1100);
  });

  it("si no había stock, el costo es el de la compra nueva", () => {
    expect(costoPromedioPonderado(0, 0, 12, 850)).toBe(850);
    expect(costoPromedioPonderado(-3, 900, 12, 850)).toBe(850);
  });

  it("redondea a 2 decimales", () => {
    expect(costoPromedioPonderado(3, 1000, 1, 1001)).toBe(1000.25);
    expect(costoPromedioPonderado(2, 1000, 1, 1001)).toBe(1000.33);
  });
});

describe("cálculo del stock desde los movimientos", () => {
  it("suma compras, resta ventas y mermas, y ajusta el costo solo con entradas", () => {
    const resultado = calcularStock([
      { cantidad: 10, costoUnitario: 1000 }, // stock inicial
      { cantidad: -4 }, // venta
      { cantidad: 6, costoUnitario: 1300 }, // compra: (6×1000 + 6×1300) / 12 = 1150
      { cantidad: -1 }, // merma
    ]);
    expect(resultado).toEqual({ stock: 11, costo: 1150 });
  });

  it("funciona con productos a granel (kg con decimales)", () => {
    expect(calcularStock([{ cantidad: 5.5, costoUnitario: 1800 }, { cantidad: -0.25 }, { cantidad: -1.125 }]).stock).toBe(4.125);
  });

  it("sin movimientos, el stock es 0", () => {
    expect(calcularStock([])).toEqual({ stock: 0, costo: 0 });
  });
});

describe("margen", () => {
  it("es (precio − costo) / precio", () => {
    expect(margen(1000, 750)).toBe(25);
    expect(margen(1800, 1350)).toBe(25);
    expect(margen(990, 800)).toBe(19.2);
  });

  it("sin precio no hay margen", () => {
    expect(margen(0, 500)).toBeNull();
  });

  it("avisa cuando queda bajo el objetivo de la categoría", () => {
    expect(margenBajoObjetivo(1000, 850, 25)).toBe(true);
    expect(margenBajoObjetivo(1000, 750, 25)).toBe(false);
    expect(margenBajoObjetivo(1000, 0, 25)).toBe(false); // sin costo conocido no se juzga
  });
});

describe("avisos de stock", () => {
  it("se está acabando cuando llega al mínimo", () => {
    expect(seEstaAcabando(3, 5)).toBe(true);
    expect(seEstaAcabando(5, 5)).toBe(true);
    expect(seEstaAcabando(6, 5)).toBe(false);
    expect(seEstaAcabando(0, 0)).toBe(false); // sin mínimo, no avisa
  });

  it("sin venta hace un mes cuando el último movimiento tiene más de 30 días", () => {
    const ahora = new Date("2026-11-17T12:00:00Z");
    expect(sinMovimientoReciente("2026-10-10T12:00:00Z", ahora)).toBe(true);
    expect(sinMovimientoReciente("2026-11-01T12:00:00Z", ahora)).toBe(false);
    expect(sinMovimientoReciente(null, ahora)).toBe(false);
  });

  it("el conteo registra solo la diferencia", () => {
    expect(diferenciaConteo(12, 10)).toBe(-2);
    expect(diferenciaConteo(2.5, 3.25)).toBe(0.75);
    expect(diferenciaConteo(7, 7)).toBe(0);
  });
});
