import { describe, expect, it } from "vitest";
import { correoInterno, esquemaNuevaClave, esquemaPaso1, esquemaPaso2, esquemaPaso3, esquemaRegistro } from "./cuentas";

describe("correoInterno", () => {
  it("arma un correo con el RUT, en minúsculas", () => {
    expect(correoInterno("10000013-K")).toBe("10000013-k@cuentas.rhstock.cl");
  });
});

describe("registro", () => {
  const datosOk = {
    nombre: "  Pepe Demo ",
    rut: "12.345.678-5",
    correo: "Pepe@Ejemplo.CL",
    nombreNegocio: "Almacén Don Pepe",
    rutNegocio: "76.543.210-3",
    comuna: "Puente Alto",
    clave: "Demo1234",
    aceptaTerminos: "si",
    aceptaPrivacidad: "si",
  };

  it("normaliza nombre, RUT y correo", () => {
    const resultado = esquemaRegistro.parse(datosOk);
    expect(resultado.nombre).toBe("Pepe Demo");
    expect(resultado.rut).toBe("12345678-5");
    expect(resultado.rutNegocio).toBe("76543210-3");
    expect(resultado.correo).toBe("pepe@ejemplo.cl");
  });

  it("rechaza un RUT con dígito verificador equivocado, con un mensaje claro", () => {
    const resultado = esquemaPaso1.safeParse({ ...datosOk, rut: "12.345.678-9" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toMatch(/RUT no es válido/);
  });

  it("pide el nombre del negocio", () => {
    expect(esquemaPaso2.safeParse({ ...datosOk, nombreNegocio: "  " }).success).toBe(false);
  });

  it("exige aceptar términos y privacidad por separado", () => {
    expect(esquemaPaso3.safeParse({ ...datosOk, aceptaTerminos: undefined }).success).toBe(false);
    expect(esquemaPaso3.safeParse({ ...datosOk, aceptaPrivacidad: undefined }).success).toBe(false);
    expect(esquemaPaso3.safeParse(datosOk).success).toBe(true);
  });

  it("pide una clave de al menos 8 caracteres", () => {
    expect(esquemaPaso3.safeParse({ ...datosOk, clave: "1234567" }).success).toBe(false);
  });
});

describe("nueva clave", () => {
  it("pide que las dos claves sean iguales", () => {
    expect(esquemaNuevaClave.safeParse({ clave: "ClaveNueva1", repetir: "ClaveNueva2" }).success).toBe(false);
    expect(esquemaNuevaClave.safeParse({ clave: "ClaveNueva1", repetir: "ClaveNueva1" }).success).toBe(true);
  });
});
