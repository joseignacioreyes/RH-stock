import { describe, expect, it } from "vitest";
import { formatearDia } from "./formato";
import { montoDistinto, nombrePeriodo, separarIva, suscripcionDesdeFila, textoTransferencia } from "./suscripcion";

describe("suscripción", () => {
  it("separa el IVA de un precio con IVA incluido", () => {
    expect(separarIva(30000)).toEqual({ neto: 25210, iva: 4790 });
    expect(separarIva(25000)).toEqual({ neto: 21008, iva: 3992 });
    expect(separarIva(0)).toEqual({ neto: 0, iva: 0 });
  });

  it("nombra el mes que se paga", () => {
    expect(nombrePeriodo("2026-12")).toBe("diciembre 2026");
    expect(nombrePeriodo("2027-01")).toBe("enero 2027");
  });

  it("muestra el día sin correrse por la zona horaria", () => {
    expect(formatearDia("2026-12-05")).toBe("05-12-2026");
    expect(formatearDia("2027-01-01")).toBe("01-01-2027");
  });

  it("avisa si el monto leído no es el del plan", () => {
    expect(montoDistinto(30000, 30000)).toBe(false);
    expect(montoDistinto(25000, 30000)).toBe(true);
    expect(montoDistinto(null, 30000)).toBe(false);
  });

  it("convierte la fila de la base y no acepta estados desconocidos", () => {
    const fila = {
      plan: "mensual",
      precio_mensual: 30000,
      dia_pago: 5,
      proximo_vencimiento: "2026-12-05",
      periodo: "2026-12",
      estado: "raro",
      solo_lectura_desde: "2026-12-16",
      pago_en_revision: false,
    };
    expect(suscripcionDesdeFila(fila)).toMatchObject({ plan: "mensual", estado: "al_dia", soloLecturaDesde: "2026-12-16" });
    expect(suscripcionDesdeFila({ ...fila, plan: "otro" }).plan).toBe("piloto");
  });

  it("arma el texto para copiar en la app del banco", () => {
    const texto = textoTransferencia(
      { banco: "Banco X", tipoCuenta: "Cuenta vista", numero: "123", titular: "RH Stock SpA", rut: "77.777.777-7", correo: "a@b.cl", deEjemplo: false },
      30000,
    );
    expect(texto).toContain("Número: 123");
    expect(texto).toContain("Monto: $30.000");
  });
});
