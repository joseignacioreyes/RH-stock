import { describe, expect, it } from "vitest";
import { agregar, buscar, buscarPorCodigo, cambiarCantidad, cantidadDesdeMonto, totalCarrito, type ProductoCaja } from "./carrito";

const cola: ProductoCaja = { id: "cola", nombre: "Bebida cola 1,5 L", precio: 1990, unidad: "unidad", codigoBarras: "2000000000015", icono: "🥤" };
const pan: ProductoCaja = { id: "pan", nombre: "Pan marraqueta (kg)", precio: 1990, unidad: "kg", codigoBarras: null, icono: "🍞" };
const azucar: ProductoCaja = { id: "azucar", nombre: "Azúcar 1 kg", precio: 1290, unidad: "unidad", codigoBarras: "2000000000091", icono: "🍚" };

describe("carrito de la caja", () => {
  it("escanear dos veces el mismo producto suma 2", () => {
    const carrito = agregar(agregar([], cola), cola);
    expect(carrito).toEqual([{ producto: cola, cantidad: 2 }]);
    expect(totalCarrito(carrito)).toBe(3980);
  });

  it("vende pan a granel por monto: $1.000 de pan", () => {
    const kilos = cantidadDesdeMonto(1000, pan.precio);
    expect(kilos).toBe(0.503);
    const carrito = agregar([], pan, kilos);
    expect(totalCarrito(carrito)).toBe(1001); // redondeo a peso
  });

  it("cambiar la cantidad a 0 saca el producto", () => {
    const carrito = agregar(agregar([], cola), azucar);
    expect(cambiarCantidad(carrito, "cola", 0).map((l) => l.producto.id)).toEqual(["azucar"]);
    expect(cambiarCantidad(carrito, "cola", 3)[0].cantidad).toBe(3);
  });

  it("encuentra por código de barras exacto (lector USB o cámara)", () => {
    expect(buscarPorCodigo([cola, pan, azucar], " 2000000000091\n")).toBe(azucar);
    expect(buscarPorCodigo([cola, pan, azucar], "999")).toBeNull();
  });

  it("busca por nombre sin importar tildes", () => {
    expect(buscar([cola, pan, azucar], "azucar")).toEqual([azucar]);
    expect(buscar([cola, pan, azucar], "")).toEqual([]);
  });
});
