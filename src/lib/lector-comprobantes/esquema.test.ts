import { describe, expect, it } from "vitest";
import { parsearComprobante } from "./esquema";

const hoy = new Date("2026-12-04T15:00:00Z");
const base = {
  legible: true,
  problema: "ninguno",
  monto: 30000,
  fecha: "2026-12-03",
  banco_origen: "  Banco   Ficticio ",
  titular_origen: "Pepe Demo",
  numero_operacion: "000123456",
};

describe("parsearComprobante", () => {
  it("limpia una lectura correcta", () => {
    expect(parsearComprobante(base, hoy)).toEqual({
      ok: true,
      lectura: { monto: 30000, fecha: "2026-12-03", banco: "Banco Ficticio", titular: "Pepe Demo", operacion: "000123456" },
    });
  });

  it("redondea el monto y descarta montos de cero o negativos", () => {
    expect(parsearComprobante({ ...base, monto: 29999.6 }, hoy)).toMatchObject({ lectura: { monto: 30000 } });
    expect(parsearComprobante({ ...base, monto: 0 }, hoy)).toMatchObject({ lectura: { monto: null } });
  });

  it("descarta fechas que no existen o en el futuro", () => {
    expect(parsearComprobante({ ...base, fecha: "2026-02-30" }, hoy)).toMatchObject({ lectura: { fecha: null } });
    expect(parsearComprobante({ ...base, fecha: "2027-01-10" }, hoy)).toMatchObject({ lectura: { fecha: null } });
    expect(parsearComprobante({ ...base, fecha: "03/12/2026" }, hoy)).toMatchObject({ lectura: { fecha: null } });
  });

  it("si la foto no se lee, dice por qué", () => {
    expect(parsearComprobante({ ...base, legible: false, problema: "oscura" }, hoy)).toEqual({ ok: false, motivo: "oscura" });
    expect(parsearComprobante({ ...base, legible: false }, hoy)).toEqual({ ok: false, motivo: "borrosa" });
    expect(parsearComprobante({ ...base, legible: false, problema: "no_es_comprobante" }, hoy)).toEqual({ ok: false, motivo: "no_es_comprobante" });
  });

  it("si la respuesta no cumple el esquema, es error de formato", () => {
    expect(parsearComprobante({ monto: "treinta mil" }, hoy)).toEqual({ ok: false, motivo: "formato" });
    expect(parsearComprobante(null, hoy)).toEqual({ ok: false, motivo: "formato" });
  });
});
