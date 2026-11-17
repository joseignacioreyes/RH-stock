import { describe, expect, it } from "vitest";
import { calcularDv, formatearRut, formatearRutMientrasEscribe, normalizarRut, rutEsValido } from "./rut";

describe("calcularDv", () => {
  it.each([
    ["12345678", "5"],
    ["76543210", "3"],
    ["11111111", "1"],
    ["10000013", "K"],
    ["7004019", "0"],
  ])("el RUT %s tiene dígito verificador %s", (numero, dv) => {
    expect(calcularDv(numero)).toBe(dv);
  });
});

describe("rutEsValido", () => {
  it("acepta RUT con o sin puntos y guion", () => {
    expect(rutEsValido("12.345.678-5")).toBe(true);
    expect(rutEsValido("12345678-5")).toBe(true);
    expect(rutEsValido("123456785")).toBe(true);
    expect(rutEsValido(" 76.543.210-3 ")).toBe(true);
  });

  it("acepta la K en minúscula o mayúscula", () => {
    expect(rutEsValido("10.000.013-k")).toBe(true);
    expect(rutEsValido("10.000.013-K")).toBe(true);
  });

  it("rechaza un dígito verificador equivocado", () => {
    expect(rutEsValido("12.345.678-9")).toBe(false);
    expect(rutEsValido("76.543.210-K")).toBe(false);
  });

  it("rechaza textos que no son RUT", () => {
    expect(rutEsValido("")).toBe(false);
    expect(rutEsValido("hola")).toBe(false);
    expect(rutEsValido("1-9")).toBe(false);
    expect(rutEsValido("123.456.789.0-1")).toBe(false);
  });
});

describe("normalizarRut", () => {
  it("guarda sin puntos, con guion y K mayúscula", () => {
    expect(normalizarRut("12.345.678-5")).toBe("12345678-5");
    expect(normalizarRut("10000013k")).toBe("10000013-K");
    expect(normalizarRut("07.004.019-0")).toBe("7004019-0");
  });

  it("devuelve null si el RUT no es válido", () => {
    expect(normalizarRut("12.345.678-0")).toBeNull();
  });
});

describe("formatearRut", () => {
  it("muestra el RUT con puntos y guion", () => {
    expect(formatearRut("123456785")).toBe("12.345.678-5");
    expect(formatearRut("7004019-0")).toBe("7.004.019-0");
  });

  it("formatea mientras se escribe, sin pasarse de largo", () => {
    expect(formatearRutMientrasEscribe("1")).toBe("1");
    expect(formatearRutMientrasEscribe("1234")).toBe("123-4");
    expect(formatearRutMientrasEscribe("12345678599")).toBe("12.345.678-5");
  });
});
