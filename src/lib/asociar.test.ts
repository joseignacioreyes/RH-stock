import { describe, expect, it } from "vitest";
import { nombreDesdeDescripcion, normalizarDescripcion, parecido, precioSugerido, sugerirProducto } from "./asociar";

const productos = [
  { id: "arroz", nombre: "Arroz grado 1 1 kg" },
  { id: "aceite", nombre: "Aceite vegetal 1 L" },
  { id: "galletas", nombre: "Galletas de chocolate 120 g" },
  { id: "cola", nombre: "Bebida cola 1,5 L" },
];

describe("aprender asociaciones", () => {
  it("normaliza igual que la base de datos", () => {
    expect(normalizarDescripcion("  ARROZ   G1  1KG ")).toBe("arroz g1 1kg");
  });

  it("usa lo aprendido con el mismo proveedor antes que cualquier parecido", () => {
    const alias = [
      { proveedorId: "sur", descripcion: "arroz g1 1kg", productoId: "arroz" },
      { proveedorId: "andes", descripcion: "arroz g1 1kg", productoId: "aceite" },
    ];
    expect(sugerirProducto("ARROZ G1 1KG", "sur", productos, alias)).toEqual({ productoId: "arroz", motivo: "aprendido" });
    expect(sugerirProducto("ARROZ G1 1KG", "andes", productos, alias)).toEqual({ productoId: "aceite", motivo: "aprendido" });
  });

  it("si otro proveedor ya la enseñó, también sirve", () => {
    const alias = [{ proveedorId: "sur", descripcion: "beb cola 1.5", productoId: "cola" }];
    expect(sugerirProducto("BEB COLA 1.5", "nuevo-proveedor", productos, alias)).toEqual({ productoId: "cola", motivo: "aprendido" });
  });

  it("ignora un alias de un producto que ya no existe", () => {
    const alias = [{ proveedorId: null, descripcion: "producto viejo", productoId: "borrado" }];
    expect(sugerirProducto("PRODUCTO VIEJO", null, productos, alias)).toBeNull();
  });
});

describe("sugerir por parecido", () => {
  it("encuentra el producto con abreviaciones y sin tildes", () => {
    expect(sugerirProducto("ACEITE VEG 1LT", null, productos, [])).toEqual({ productoId: "aceite", motivo: "parecido" });
    expect(sugerirProducto("GALLETA CHOC 120GR", null, productos, [])?.productoId).toBe("galletas");
  });

  it("no inventa: si no se parece a nada, no sugiere", () => {
    expect(sugerirProducto("DETERGENTE 3LT", null, productos, [])).toBeNull();
  });

  it("no confunde productos que solo comparten la medida", () => {
    const conLeche = [...productos.filter((p) => p.id !== "aceite"), { id: "leche", nombre: "Leche entera 1 L" }];
    expect(sugerirProducto("ACEITE VEG 1LT", null, conLeche, [])).toBeNull();
  });

  it("entiende singular y plural", () => {
    expect(sugerirProducto("GALLETA VAINILLA", null, productos, [])?.productoId).toBe("galletas");
  });

  it("parecido entre 0 y 1", () => {
    expect(parecido("Arroz grado 1 1 kg", "ARROZ G1 1KG")).toBeGreaterThanOrEqual(0.5);
    expect(parecido("hola", "chao")).toBe(0);
  });
});

describe("productos nuevos desde la boleta", () => {
  it("arma un nombre legible", () => {
    expect(nombreDesdeDescripcion("  TE  BOLSITAS X100 ")).toBe("Te bolsitas x100");
  });

  it("sugiere un precio de venta con el margen objetivo, redondeado a $10", () => {
    expect(precioSugerido(1350, 25)).toBe(1800); // el ejemplo de CLAUDE.md
    expect(precioSugerido(990, 18)).toBe(1210);
    expect(precioSugerido(0, 25)).toBe(0);
  });
});
