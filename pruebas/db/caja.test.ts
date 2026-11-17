// Modo caja en la base de datos: ventas sin duplicados, PIN de vendedores y cierre de caja.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/tipos-db";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let cola: string;
let pan: string;
let carla: string;

const stock = async (id: string) => Number((await admin().from("productos").select("stock_actual").eq("id", id).single()).data!.stock_actual);

const venta = (items: { producto_id: string; cantidad: number; precio_unitario: number }[], extra: Record<string, unknown> = {}): Json => ({
  id_local: randomUUID(),
  vendedor_id: null,
  fecha: new Date().toISOString(),
  medio_pago: "efectivo",
  items,
  ...extra,
});

async function producto(nombre: string, unidad: string, precio: number, stockInicial: number) {
  const { data, error } = await A.dueno.cliente.rpc("crear_producto", {
    p_nombre: nombre,
    p_categoria_id: null as unknown as string,
    p_unidad: unidad,
    p_codigo_barras: "",
    p_precio_venta: precio,
    p_costo: precio * 0.7,
    p_stock_inicial: stockInicial,
    p_stock_minimo: 0,
  });
  if (error) throw error;
  return data!;
}

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B"), crearNegocio("Demo", { demo: true })]);
  empleadoA = await crearPersona("empleado", A.empresaId);
  cola = await producto("Bebida cola 1,5 L", "unidad", 1990, 20);
  pan = await producto("Pan marraqueta (kg)", "kg", 1990, 10);
  const { data } = await A.dueno.cliente.rpc("agregar_vendedor", { p_nombre: "Carla", p_pin: "1111" });
  carla = data!;
});

afterAll(limpiar);

describe("cobrar", () => {
  it("guarda la venta y descuenta el stock en una sola operación", async () => {
    const { data: id, error } = await A.dueno.cliente.rpc("registrar_venta", {
      p_venta: venta(
        [
          { producto_id: cola, cantidad: 2, precio_unitario: 1990 },
          { producto_id: pan, cantidad: 0.503, precio_unitario: 1990 },
        ],
        { vendedor_id: carla, medio_pago: "debito" },
      ),
    });
    expect(error).toBeNull();
    expect(await stock(cola)).toBe(18);
    expect(await stock(pan)).toBe(9.497);
    const { data } = await admin().from("ventas").select("total, medio_pago, vendedor_id").eq("id", id!).single();
    expect(data).toEqual({ total: 3980 + 1001, medio_pago: "debito", vendedor_id: carla });
  });

  it("la misma venta enviada dos veces (sin internet y al volver) queda UNA sola vez", async () => {
    const misma = venta([{ producto_id: cola, cantidad: 1, precio_unitario: 1990 }]);
    const primera = await A.dueno.cliente.rpc("registrar_venta", { p_venta: misma });
    const segunda = await A.dueno.cliente.rpc("registrar_venta", { p_venta: misma });
    expect(segunda.error).toBeNull();
    expect(segunda.data).toBe(primera.data);
    expect(await stock(cola)).toBe(17);
    const { count } = await admin().from("ventas").select("id", { count: "exact", head: true }).eq("id_local", (misma as { id_local: string }).id_local);
    expect(count).toBe(1);
  });

  it("enviada dos veces al mismo tiempo, también queda una sola", async () => {
    const misma = venta([{ producto_id: cola, cantidad: 1, precio_unitario: 1990 }]);
    await Promise.all([A.dueno.cliente.rpc("registrar_venta", { p_venta: misma }), empleadoA.cliente.rpc("registrar_venta", { p_venta: misma })]);
    expect(await stock(cola)).toBe(16);
  });

  it("los empleados también venden", async () => {
    const { error } = await empleadoA.cliente.rpc("registrar_venta", { p_venta: venta([{ producto_id: cola, cantidad: 1, precio_unitario: 1990 }]) });
    expect(error).toBeNull();
    expect(await stock(cola)).toBe(15);
  });

  it("si un producto falla, no se guarda nada de esa venta", async () => {
    const { error } = await A.dueno.cliente.rpc("registrar_venta", {
      p_venta: venta([
        { producto_id: cola, cantidad: 1, precio_unitario: 1990 },
        { producto_id: pan, cantidad: 0, precio_unitario: 1990 },
      ]),
    });
    expect(error).not.toBeNull();
    expect(await stock(cola)).toBe(15);
  });
});

describe("cada negocio vende solo lo suyo", () => {
  it("B no puede vender productos de A ni ver sus ventas", async () => {
    const { error } = await B.dueno.cliente.rpc("registrar_venta", { p_venta: venta([{ producto_id: cola, cantidad: 5, precio_unitario: 1 }]) });
    expect(error).not.toBeNull();
    expect(await stock(cola)).toBe(15);
    const { data } = await B.dueno.cliente.from("ventas").select("id").eq("empresa_id", A.empresaId);
    expect(data).toHaveLength(0);
  });

  it("B no puede usar un vendedor de A ni probar su PIN", async () => {
    const { data: pin } = await B.dueno.cliente.rpc("verificar_pin", { p_vendedor_id: carla, p_pin: "1111" });
    expect(pin).toBe("incorrecto");
  });

  it("no se pueden crear ventas directamente (solo cobrando)", async () => {
    const { error } = await A.dueno.cliente.from("ventas").insert({ empresa_id: A.empresaId, id_local: randomUUID(), fecha: new Date().toISOString(), total: 1, medio_pago: "efectivo" });
    expect(error).not.toBeNull();
  });

  it("en el negocio de ejemplo no se guardan ventas", async () => {
    const { error } = await demo.dueno.cliente.rpc("registrar_venta", { p_venta: venta([]) });
    expect(error).not.toBeNull();
  });
});

describe("PIN de vendedores", () => {
  it("acepta el PIN correcto y rechaza uno equivocado", async () => {
    expect((await A.dueno.cliente.rpc("verificar_pin", { p_vendedor_id: carla, p_pin: "1111" })).data).toBe("ok");
    expect((await A.dueno.cliente.rpc("verificar_pin", { p_vendedor_id: carla, p_pin: "9999" })).data).toBe("incorrecto");
  });

  it("se bloquea 5 minutos después de 5 intentos fallidos (ni el PIN correcto entra)", async () => {
    for (let i = 0; i < 4; i++) await A.dueno.cliente.rpc("verificar_pin", { p_vendedor_id: carla, p_pin: "0000" });
    expect((await A.dueno.cliente.rpc("verificar_pin", { p_vendedor_id: carla, p_pin: "1111" })).data).toBe("bloqueado");
    await admin().from("vendedores").update({ bloqueado_hasta: null, intentos_fallidos: 0 }).eq("id", carla);
  });

  it("nadie puede leer el PIN cifrado", async () => {
    const { error } = await A.dueno.cliente.from("vendedores").select("pin_hash");
    expect(error).not.toBeNull();
  });

  it("solo el dueño agrega vendedores", async () => {
    const { error } = await empleadoA.cliente.rpc("agregar_vendedor", { p_nombre: "Intruso", p_pin: "1234" });
    expect(error).not.toBeNull();
  });
});

describe("cierre de caja", () => {
  it("calcula lo vendido en efectivo y la diferencia con lo contado", async () => {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
    const { data: ventasHoy } = await admin().from("ventas").select("total, medio_pago").eq("empresa_id", A.empresaId);
    const efectivo = ventasHoy!.filter((v) => v.medio_pago === "efectivo").reduce((t, v) => t + v.total, 0);
    const { error } = await A.dueno.cliente.rpc("cerrar_caja", { p_fecha: hoy, p_efectivo_contado: efectivo - 1500 });
    expect(error).toBeNull();
    const { data } = await admin().from("cierres_caja").select("efectivo_sistema, diferencia").eq("empresa_id", A.empresaId).single();
    expect(data).toEqual({ efectivo_sistema: efectivo, diferencia: -1500 });
  });

  it("los más vendidos salen de las ventas", async () => {
    const { data } = await A.dueno.cliente.rpc("mas_vendidos", { p_limite: 5 });
    expect(data?.[0]?.producto_id).toBe(cola);
  });
});
