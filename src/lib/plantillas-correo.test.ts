import { describe, expect, it } from "vitest";
import { correoRecuperarClave, correoResumenAvisos, notificacionDeAviso, ocultarCorreo } from "./plantillas-correo";

describe("correos", () => {
  it("arma el resumen de avisos con asunto claro y sin HTML inyectado", () => {
    const correo = correoResumenAvisos({
      nombre: "Rosa",
      negocio: "Almacén <Rosita>",
      avisos: [
        { tipo: "stock_bajo", mensaje: "Se está acabando el pan" },
        { tipo: "costo_sube", mensaje: "Tu costo de aceite subió de $2.350 a $2.550" },
      ],
      sitio: "https://rhstock.cl",
    });
    expect(correo.asunto).toBe("Almacén <Rosita>: 2 avisos nuevos en RH Stock");
    expect(correo.html).toContain("Almacén &lt;Rosita&gt;");
    expect(correo.html).not.toContain("<Rosita>");
    expect(correo.html).toContain("https://rhstock.cl/avisos");
    expect(correo.texto).toContain("- Se está acabando el pan");
  });

  it("dice 1 aviso en singular", () => {
    expect(correoResumenAvisos({ nombre: "A", negocio: "B", avisos: [{ tipo: "pago", mensaje: "x" }], sitio: "https://x.cl" }).asunto).toBe(
      "B: 1 aviso nuevo en RH Stock",
    );
  });

  it("el correo de clave nueva lleva el enlace", () => {
    const correo = correoRecuperarClave({ nombre: "Pepe", enlace: "https://x.cl/auth/confirmar?token_hash=abc&type=recovery", sitio: "https://x.cl" });
    expect(correo.html).toContain("token_hash=abc&amp;type=recovery");
    expect(correo.texto).toContain("token_hash=abc&type=recovery");
  });

  it("la notificación lleva al lugar correcto", () => {
    expect(notificacionDeAviso({ tipo: "stock_bajo", mensaje: "m", productoId: "p1" }).url).toBe("/mi-stock/productos/p1");
    expect(notificacionDeAviso({ tipo: "pago", mensaje: "m", productoId: null }).url).toBe("/mas/mi-plan");
    expect(notificacionDeAviso({ tipo: "costo_baja", mensaje: "m", productoId: null }).url).toBe("/avisos");
  });

  it("oculta el correo", () => {
    expect(ocultarCorreo("joseignacio@gmail.com")).toBe("jo•••@gmail.com");
  });
});
