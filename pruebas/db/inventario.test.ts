// Inventario en la base de datos:
// - el stock y el costo se calculan solos con los movimientos (nadie los edita a mano);
// - cada negocio ve y cambia solo sus productos;
// - los empleados no ven costos.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calcularStock, costoPromedioPonderado } from "@/lib/inventario";
import { admin, clienteAnonimo, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let administrador: Persona;
let productoA: string;
let productoDemo: string;

async function categoria(empresaId: string, nombre = "Abarrotes") {
  const { data } = await admin().from("categorias").select("id").eq("empresa_id", empresaId).eq("nombre", nombre).single();
  return data!.id;
}

async function producto(id: string) {
  const { data } = await admin().from("productos").select("stock_actual, costo_promedio, ultimo_movimiento_en").eq("id", id).single();
  return { stock: Number(data!.stock_actual), costo: Number(data!.costo_promedio), ultimo: data!.ultimo_movimiento_en };
}

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B"), crearNegocio("Demo", { demo: true })]);
  [empleadoA, administrador] = await Promise.all([crearPersona("empleado", A.empresaId), crearPersona("admin", null)]);

  const { data, error } = await A.dueno.cliente.rpc("crear_producto", {
    p_nombre: "Arroz grado 1 1 kg",
    p_categoria_id: await categoria(A.empresaId),
    p_unidad: "unidad",
    p_codigo_barras: "2000000000015",
    p_precio_venta: 1490,
    p_costo: 1000,
    p_stock_inicial: 10,
    p_stock_minimo: 4,
  });
  if (error) throw error;
  productoA = data;

  const { data: enDemo } = await admin()
    .from("productos")
    .insert({ empresa_id: demo.empresaId, nombre: "Pan del demo", unidad: "kg" })
    .select("id")
    .single();
  productoDemo = enDemo!.id;
});

afterAll(limpiar);

describe("el stock se mueve solo con movimientos", () => {
  it("un producto nuevo parte con su stock inicial como primer movimiento", async () => {
    expect(await producto(productoA)).toMatchObject({ stock: 10, costo: 1000 });
    const { data } = await A.dueno.cliente.from("movimientos_stock").select("tipo, cantidad, motivo").eq("producto_id", productoA);
    expect(data).toEqual([{ tipo: "ajuste", cantidad: 10, motivo: "stock_inicial" }]);
  });

  it("una compra suma stock y recalcula el costo promedio ponderado (igual que la app)", async () => {
    await admin()
      .from("movimientos_stock")
      .insert({ empresa_id: A.empresaId, producto_id: productoA, tipo: "compra", cantidad: 10, costo_unitario: 1200 });
    expect(await producto(productoA)).toMatchObject({ stock: 20, costo: costoPromedioPonderado(10, 1000, 10, 1200) });
    expect((await producto(productoA)).costo).toBe(1100);
  });

  it("una merma descuenta y no cambia el costo", async () => {
    const { error } = await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: productoA, p_cantidad: 2, p_motivo: "merma" });
    expect(error).toBeNull();
    expect(await producto(productoA)).toMatchObject({ stock: 18, costo: 1100 });
  });

  it("un conteo registra solo la diferencia", async () => {
    const { data: cambiados } = await A.dueno.cliente.rpc("registrar_conteo", {
      p_conteos: [{ producto_id: productoA, cantidad_real: 15 }],
    });
    expect(cambiados).toBe(1);
    expect((await producto(productoA)).stock).toBe(15);

    const { data: sinCambios } = await A.dueno.cliente.rpc("registrar_conteo", {
      p_conteos: [{ producto_id: productoA, cantidad_real: 15 }],
    });
    expect(sinCambios).toBe(0);
  });

  it("el stock guardado es igual a la suma de los movimientos", async () => {
    const { data } = await admin()
      .from("movimientos_stock")
      .select("cantidad, costo_unitario")
      .eq("producto_id", productoA)
      .order("fecha");
    const calculado = calcularStock(data!.map((m) => ({ cantidad: Number(m.cantidad), costoUnitario: m.costo_unitario })));
    expect(await producto(productoA)).toMatchObject({ stock: calculado.stock, costo: calculado.costo });
  });

  it("guarda cuándo fue el último movimiento", async () => {
    expect((await producto(productoA)).ultimo).not.toBeNull();
  });
});

describe("nadie edita el stock a mano", () => {
  it("el dueño no puede cambiar el stock ni el costo directamente", async () => {
    const stock = await A.dueno.cliente.from("productos").update({ stock_actual: 999 }).eq("id", productoA);
    expect(stock.error).not.toBeNull();
    const costo = await A.dueno.cliente.from("productos").update({ costo_promedio: 1 }).eq("id", productoA);
    expect(costo.error).not.toBeNull();
    expect((await producto(productoA)).stock).toBe(15);
  });

  it("no se pueden crear movimientos directamente (solo con las funciones de la app)", async () => {
    const { error } = await A.dueno.cliente
      .from("movimientos_stock")
      .insert({ empresa_id: A.empresaId, producto_id: productoA, tipo: "compra", cantidad: 100 });
    expect(error).not.toBeNull();
  });

  it("los movimientos no se pueden cambiar ni borrar, ni siquiera desde el servidor", async () => {
    const { data: movimiento } = await admin().from("movimientos_stock").select("id").eq("producto_id", productoA).limit(1).single();
    const cambio = await admin().from("movimientos_stock").update({ cantidad: 500 }).eq("id", movimiento!.id);
    expect(cambio.error).not.toBeNull();
    const borrado = await admin().from("movimientos_stock").delete().eq("id", movimiento!.id);
    expect(borrado.error).not.toBeNull();
  });

  it("no acepta motivos inventados ni cantidades en cero", async () => {
    const motivo = await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: productoA, p_cantidad: 1, p_motivo: "se_perdio" });
    expect(motivo.error).not.toBeNull();
    const cero = await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: productoA, p_cantidad: 0, p_motivo: "merma" });
    expect(cero.error).not.toBeNull();
  });

  it("el dueño sí puede cambiar el precio y el mínimo", async () => {
    const { data } = await A.dueno.cliente.from("productos").update({ precio_venta: 1590, stock_minimo: 5 }).eq("id", productoA).select("id");
    expect(data).toHaveLength(1);
  });
});

describe("cada negocio ve y cambia solo sus productos", () => {
  it("B no ve los productos ni los movimientos de A", async () => {
    const productos = await B.dueno.cliente.from("productos").select("id").eq("id", productoA);
    expect(productos.data).toHaveLength(0);
    const movimientos = await B.dueno.cliente.from("movimientos_stock").select("id").eq("producto_id", productoA);
    expect(movimientos.data).toHaveLength(0);
  });

  it("B no puede descontar ni contar productos de A", async () => {
    const salida = await B.dueno.cliente.rpc("registrar_salida", { p_producto_id: productoA, p_cantidad: 1, p_motivo: "regalo" });
    expect(salida.error).not.toBeNull();
    const conteo = await B.dueno.cliente.rpc("registrar_conteo", { p_conteos: [{ producto_id: productoA, cantidad_real: 0 }] });
    expect(conteo.error).not.toBeNull();
    expect((await producto(productoA)).stock).toBe(15);
  });

  it("B no puede cambiar el precio de un producto de A", async () => {
    await B.dueno.cliente.from("productos").update({ precio_venta: 1 }).eq("id", productoA);
    const { data } = await admin().from("productos").select("precio_venta").eq("id", productoA).single();
    expect(data?.precio_venta).toBe(1590);
  });

  it("B no puede crear productos usando una categoría de A", async () => {
    const { error } = await B.dueno.cliente.rpc("crear_producto", {
      p_nombre: "Intruso",
      p_categoria_id: await categoria(A.empresaId),
      p_unidad: "unidad",
      p_codigo_barras: "",
      p_precio_venta: 100,
      p_costo: 50,
      p_stock_inicial: 1,
      p_stock_minimo: 0,
    });
    expect(error).not.toBeNull();
  });

  it("sin sesión no se ve ningún producto", async () => {
    const { data } = await clienteAnonimo().from("productos").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("el administrador de RH Stock no ve los productos de los negocios", async () => {
    const { data } = await administrador.cliente.from("productos").select("id").eq("empresa_id", A.empresaId);
    expect(data).toHaveLength(0);
  });
});

describe("empleados", () => {
  it("ven los productos y el stock, pero no los costos", async () => {
    const stock = await empleadoA.cliente.from("productos").select("nombre, stock_actual").eq("id", productoA);
    expect(stock.data).toHaveLength(1);
    const costo = await empleadoA.cliente.from("productos").select("costo_promedio");
    expect(costo.error).not.toBeNull();
    const { data: costos } = await empleadoA.cliente.rpc("costos_de_mi_negocio");
    expect(costos).toHaveLength(0);
  });

  it("el dueño sí ve los costos", async () => {
    const { data } = await A.dueno.cliente.rpc("costos_de_mi_negocio");
    expect(data?.find((c) => c.producto_id === productoA)?.costo_promedio).toBe(1100);
  });

  it("pueden registrar mermas y conteos, pero no crear productos", async () => {
    const salida = await empleadoA.cliente.rpc("registrar_salida", { p_producto_id: productoA, p_cantidad: 1, p_motivo: "consumo_propio" });
    expect(salida.error).toBeNull();
    const nuevo = await empleadoA.cliente.rpc("crear_producto", {
      p_nombre: "Del empleado",
      p_categoria_id: null as unknown as string,
      p_unidad: "unidad",
      p_codigo_barras: "",
      p_precio_venta: 100,
      p_costo: 50,
      p_stock_inicial: 1,
      p_stock_minimo: 0,
    });
    expect(nuevo.error).not.toBeNull();
  });
});

describe("el negocio de ejemplo (demo)", () => {
  it("no permite mermas, conteos ni productos nuevos", async () => {
    const salida = await demo.dueno.cliente.rpc("registrar_salida", { p_producto_id: productoDemo, p_cantidad: 1, p_motivo: "merma" });
    expect(salida.error).not.toBeNull();
    const conteo = await demo.dueno.cliente.rpc("registrar_conteo", { p_conteos: [{ producto_id: productoDemo, cantidad_real: 5 }] });
    expect(conteo.error).not.toBeNull();
    const nuevo = await demo.dueno.cliente.rpc("crear_producto", {
      p_nombre: "Desorden",
      p_categoria_id: null as unknown as string,
      p_unidad: "unidad",
      p_codigo_barras: "",
      p_precio_venta: 100,
      p_costo: 50,
      p_stock_inicial: 1,
      p_stock_minimo: 0,
    });
    expect(nuevo.error).not.toBeNull();
  });
});
