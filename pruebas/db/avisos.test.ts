// Avisos automáticos: "se está acabando" y cambios de costo, y quién puede verlos.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let producto: string;

async function avisos(productoId: string) {
  const { data } = await admin().from("alertas").select("tipo, mensaje, leida, datos").eq("producto_id", productoId).order("created_at");
  return data ?? [];
}

async function compra(cantidad: number, costo: number) {
  const { error } = await admin()
    .from("movimientos_stock")
    .insert({ empresa_id: A.empresaId, producto_id: producto, tipo: "compra", cantidad, costo_unitario: costo });
  if (error) throw error;
}

beforeAll(async () => {
  [A, B] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B")]);
  empleadoA = await crearPersona("empleado", A.empresaId);
  const { data: categoria } = await admin().from("categorias").select("id").eq("empresa_id", A.empresaId).eq("nombre", "Bebidas y jugos").single();
  const { data } = await A.dueno.cliente.rpc("crear_producto", {
    p_nombre: "Bebida cola 1,5 L",
    p_categoria_id: categoria!.id,
    p_unidad: "unidad",
    p_codigo_barras: "",
    p_precio_venta: 1590,
    p_costo: 1200,
    p_stock_inicial: 10,
    p_stock_minimo: 4,
  });
  producto = data!;
});

afterAll(limpiar);

describe("se está acabando", () => {
  it("avisa cuando el stock llega al mínimo, una sola vez", async () => {
    await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: producto, p_cantidad: 6, p_motivo: "regalo" }); // 10 → 4
    await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: producto, p_cantidad: 1, p_motivo: "regalo" }); // 4 → 3
    const lista = (await avisos(producto)).filter((a) => a.tipo === "stock_bajo");
    expect(lista).toHaveLength(1);
    expect(lista[0].mensaje).toBe("Se está acabando Bebida cola 1,5 L.");
  });

  it("también avisa si el producto parte con menos que el mínimo", async () => {
    const { data: nuevo } = await A.dueno.cliente.rpc("crear_producto", {
      p_nombre: "Azúcar 1 kg",
      p_categoria_id: null as unknown as string,
      p_unidad: "unidad",
      p_codigo_barras: "",
      p_precio_venta: 1290,
      p_costo: 1020,
      p_stock_inicial: 3,
      p_stock_minimo: 6,
    });
    expect((await avisos(nuevo!)).map((a) => a.tipo)).toEqual(["stock_bajo"]);
  });

  it("el aviso se quita solo cuando se repone", async () => {
    await compra(12, 1200); // 3 → 15
    const lista = (await avisos(producto)).filter((a) => a.tipo === "stock_bajo");
    expect(lista.every((a) => a.leida)).toBe(true);
  });
});

describe("cambios de costo", () => {
  it("no avisa si el costo cambia menos del 5%", async () => {
    await compra(6, 1240); // +3,3% respecto de 1.200
    expect((await avisos(producto)).filter((a) => a.tipo !== "stock_bajo")).toHaveLength(0);
  });

  it("avisa si sube más del 5%, con el precio sugerido explicado en una frase", async () => {
    await compra(6, 1350); // +8,9% respecto de 1.240
    const [aviso] = (await avisos(producto)).filter((a) => a.tipo === "costo_sube");
    expect(aviso.mensaje).toBe(
      "Tu costo de Bebida cola 1,5 L subió de $1.240 a $1.350 (+8,9%). Con tu margen objetivo de 25%, el precio sugerido es $1.800.",
    );
    expect(aviso.datos).toMatchObject({ costo_anterior: 1240, costo_nuevo: 1350, precio_sugerido: 1800, precio_actual: 1590 });
  });

  it("también avisa cuando baja", async () => {
    await compra(6, 1150);
    const bajas = (await avisos(producto)).filter((a) => a.tipo === "costo_baja");
    expect(bajas).toHaveLength(1);
    expect(bajas[0].mensaje).toMatch(/bajó de \$1\.350 a \$1\.150/);
  });

  it("respeta el porcentaje que elige el dueño", async () => {
    const { error } = await A.dueno.cliente.from("empresas").update({ umbral_aviso_costo: 20 }).eq("id", A.empresaId);
    expect(error).toBeNull();
    await compra(6, 1300); // +13% < 20%
    expect((await avisos(producto)).filter((a) => a.tipo !== "stock_bajo")).toHaveLength(2);
  });
});

describe("quién ve los avisos", () => {
  it("el dueño ve todos los de su negocio", async () => {
    const { data } = await A.dueno.cliente.from("alertas").select("tipo");
    expect(new Set(data?.map((a) => a.tipo))).toEqual(new Set(["stock_bajo", "costo_sube", "costo_baja"]));
  });

  it("un empleado ve los de stock, pero no los de costo (no ve costos)", async () => {
    const { data } = await empleadoA.cliente.from("alertas").select("tipo");
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((a) => a.tipo === "stock_bajo")).toBe(true);
  });

  it("otro negocio no ve ni puede marcar los avisos de A", async () => {
    const { data } = await B.dueno.cliente.from("alertas").select("id").eq("empresa_id", A.empresaId);
    expect(data).toHaveLength(0);
    await B.dueno.cliente.from("alertas").update({ leida: true }).eq("empresa_id", A.empresaId);
    const { data: deA } = await admin().from("alertas").select("leida").eq("empresa_id", A.empresaId).eq("tipo", "costo_sube");
    expect(deA?.every((a) => !a.leida)).toBe(true);
  });

  it("solo se puede cambiar si está leído, no el mensaje", async () => {
    const { error } = await A.dueno.cliente.from("alertas").update({ mensaje: "otro" }).eq("empresa_id", A.empresaId);
    expect(error).not.toBeNull();
    const { error: errorLeida } = await A.dueno.cliente.from("alertas").update({ leida: true }).eq("tipo", "costo_baja");
    expect(errorLeida).toBeNull();
  });

  it("un empleado no puede cambiar el porcentaje de aviso", async () => {
    await empleadoA.cliente.from("empresas").update({ umbral_aviso_costo: 1 }).eq("id", A.empresaId);
    const { data } = await admin().from("empresas").select("umbral_aviso_costo").eq("id", A.empresaId).single();
    expect(Number(data?.umbral_aviso_costo)).toBe(20);
  });
});
