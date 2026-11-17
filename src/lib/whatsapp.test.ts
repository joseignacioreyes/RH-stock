import { describe, expect, it } from "vitest";
import { enlaceWhatsApp, MENSAJES_WHATSAPP, telefonoLegible } from "./whatsapp";

describe("enlaceWhatsApp", () => {
  it("arma el enlace de ayuda tal como está en la guía del proyecto", () => {
    expect(enlaceWhatsApp(MENSAJES_WHATSAPP.ayuda, "56977766584")).toBe(
      "https://wa.me/56977766584?text=Hola%2C%20necesito%20ayuda%20con%20RH%20Stock",
    );
  });

  it("acepta el número con espacios o con +", () => {
    expect(enlaceWhatsApp("Hola", "+56 9 7776 6584")).toBe("https://wa.me/56977766584?text=Hola");
  });
});

describe("telefonoLegible", () => {
  it("muestra el celular chileno con espacios", () => {
    expect(telefonoLegible("56977766584")).toBe("+56 9 7776 6584");
  });

  it("si no es un celular chileno, lo deja con + adelante", () => {
    expect(telefonoLegible("5491112345678")).toBe("+5491112345678");
  });
});
