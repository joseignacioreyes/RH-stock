import { describe, expect, it } from "vitest";
import { extraerJson, parsearLectura } from "./esquema";

const HOY = new Date("2026-11-17T15:00:00Z");

const lecturaBuena = {
  legible: true,
  problema: "ninguno",
  tipo: "boleta",
  proveedor_nombre: "  Mayorista del Sur ",
  proveedor_rut: "76.111.222-K",
  numero: "001234",
  fecha: "2026-11-14",
  items: [
    { descripcion: "ARROZ  G1 1KG", cantidad: 10, precio_unitario: 1150, total: 11500 },
    { descripcion: "ACEITE VEG 1LT", cantidad: 6, precio_unitario: null, total: 14100 },
  ],
  neto: 21345,
  iva: 4055,
  total: 25600,
};

describe("parser de la lectura de la IA", () => {
  it("acepta una lectura buena y la deja limpia", () => {
    const resultado = parsearLectura(lecturaBuena, HOY);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.lectura.proveedorNombre).toBe("Mayorista del Sur");
    expect(resultado.lectura.fecha).toBe("2026-11-14");
    expect(resultado.lectura.items[0]).toEqual({ descripcion: "ARROZ G1 1KG", cantidad: 10, precioUnitario: 1150, total: 11500 });
  });

  it("calcula el precio unitario desde el total de la línea si falta", () => {
    const resultado = parsearLectura(lecturaBuena, HOY);
    if (!resultado.ok) throw new Error("debía leerse");
    expect(resultado.lectura.items[1].precioUnitario).toBe(2350);
  });

  it("descarta un RUT de proveedor con dígito verificador equivocado", () => {
    const resultado = parsearLectura(lecturaBuena, HOY);
    if (!resultado.ok) throw new Error("debía leerse");
    expect(resultado.lectura.proveedorRut).toBeNull(); // 76.111.222-K no es válido
    const conRutBueno = parsearLectura({ ...lecturaBuena, proveedor_rut: "76.543.210-3" }, HOY);
    expect(conRutBueno.ok && conRutBueno.lectura.proveedorRut).toBe("76543210-3");
  });

  it("descarta fechas imposibles o en el futuro", () => {
    for (const fecha of ["2026-02-30", "14/11/2026", "2027-01-01"]) {
      const resultado = parsearLectura({ ...lecturaBuena, fecha }, HOY);
      expect(resultado.ok && resultado.lectura.fecha).toBeNull();
    }
  });

  it("saca las líneas sin cantidad o sin precio, y calcula el total si no se leyó", () => {
    const resultado = parsearLectura(
      {
        ...lecturaBuena,
        total: null,
        items: [
          { descripcion: "PAN", cantidad: 2.5, precio_unitario: 1300, total: null },
          { descripcion: "DESCUENTO", cantidad: 0, precio_unitario: 100, total: -100 },
          { descripcion: "BOLSA", cantidad: 1, precio_unitario: null, total: null },
        ],
      },
      HOY,
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.lectura.items).toEqual([{ descripcion: "PAN", cantidad: 2.5, precioUnitario: 1300, total: 3250 }]);
    expect(resultado.lectura.total).toBe(3250);
  });

  it("si la foto no se puede leer, dice por qué", () => {
    expect(parsearLectura({ ...lecturaBuena, legible: false, problema: "borrosa", items: [] }, HOY)).toEqual({ ok: false, motivo: "borrosa" });
    expect(parsearLectura({ ...lecturaBuena, legible: false, problema: "no_es_documento", items: [] }, HOY)).toEqual({
      ok: false,
      motivo: "no_es_documento",
    });
  });

  it("sin productos legibles no sirve", () => {
    expect(parsearLectura({ ...lecturaBuena, items: [] }, HOY)).toEqual({ ok: false, motivo: "sin_productos" });
  });

  it("rechaza respuestas que no cumplen el esquema", () => {
    expect(parsearLectura({ hola: "mundo" }, HOY)).toEqual({ ok: false, motivo: "formato" });
    expect(parsearLectura({ ...lecturaBuena, items: [{ descripcion: "X", cantidad: "diez" }] }, HOY)).toEqual({ ok: false, motivo: "formato" });
    expect(parsearLectura(null, HOY)).toEqual({ ok: false, motivo: "formato" });
  });
});

describe("extraerJson", () => {
  it("lee JSON aunque venga entre ```json", () => {
    expect(extraerJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extraerJson('Aquí va: {"a": [1, 2]} listo')).toEqual({ a: [1, 2] });
  });

  it("devuelve null si no hay JSON válido", () => {
    expect(extraerJson("no hay nada")).toBeNull();
    expect(extraerJson("{roto")).toBeNull();
  });
});
