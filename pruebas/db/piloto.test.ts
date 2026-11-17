// Métricas del piloto: se cuentan bien y solo el administrador las ve.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/tipos-db";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let administrador: Persona;
let arroz: string;

const metricasDe = async (empresaId: string) => {
  const { data, error } = await administrador.cliente.rpc("metricas_uso", { p_desde: "2000-01-01T00:00:00Z" });
  if (error) throw error;
  return data!.find((m) => m.empresa_id === empresaId);
};

beforeAll(async () => {
  [A, demo] = await Promise.all([crearNegocio("Almacén Piloto"), crearNegocio("Demo", { demo: true })]);
  administrador = await crearPersona("admin", null);
  const { data } = await A.dueno.cliente.rpc("crear_producto", {
    p_nombre: "Arroz grado 1 1 kg",
    p_categoria_id: null as unknown as string,
    p_unidad: "unidad",
    p_codigo_barras: "",
    p_precio_venta: 1490,
    p_costo: 1150,
    p_stock_inicial: 10,
    p_stock_minimo: 8,
  });
  arroz = data!;

  // Una boleta leída por la IA con 3 líneas: una se confirma igual, una con otra cantidad y una se saca.
  const { data: documento } = await A.dueno.cliente.rpc("crear_documento", { p_imagen_url: `${A.empresaId}/x.jpg` });
  await admin()
    .from("documentos_compra")
    .update({
      estado: "por_confirmar",
      datos_extraidos: {
        items: [
          { descripcion: "ARROZ G1 1KG", cantidad: 10, precioUnitario: 1150, total: 11500 },
          { descripcion: "ACEITE VEG 1LT", cantidad: 6, precioUnitario: 2350, total: 14100 },
          { descripcion: "BOLSA", cantidad: 1, precioUnitario: 20, total: 20 },
        ],
      },
    })
    .eq("id", documento!);
  const linea = (descripcion: string, cantidad: number, precio: number): Json => ({
    descripcion,
    cantidad,
    precio_unitario: precio,
    total: cantidad * precio,
    producto_id: arroz,
    nuevo: null,
  });
  const { error } = await A.dueno.cliente.rpc("confirmar_documento", {
    p_documento_id: documento!,
    p_datos: { tipo: "boleta", fecha: "2026-11-14", proveedor_nombre: "Mayorista", items: [linea("ARROZ G1 1KG", 10, 1150), linea("ACEITE VEG 1LT", 5, 2350)] },
  });
  if (error) throw error;

  // Dos ventas: una normal y una que llegó 10 minutos tarde (hecha sin internet).
  const venta = (fecha: Date): Json => ({
    id_local: randomUUID(),
    vendedor_id: null,
    fecha: fecha.toISOString(),
    medio_pago: "efectivo",
    items: [{ producto_id: arroz, cantidad: 1, precio_unitario: 1490 }],
  });
  await A.dueno.cliente.rpc("registrar_venta", { p_venta: venta(new Date()) });
  await A.dueno.cliente.rpc("registrar_venta", { p_venta: venta(new Date(Date.now() - 10 * 60_000)) });

  await A.dueno.cliente.rpc("registrar_evento", { p_evento: "precio_sugerido_usado" });
});

afterAll(limpiar);

describe("métricas del piloto", () => {
  it("cuenta las correcciones a lo que leyó la IA", async () => {
    const m = await metricasDe(A.empresaId);
    expect(m).toMatchObject({ boletas_subidas: 1, boletas_confirmadas: 1, items_leidos: 3, items_corregidos: 2 });
  });

  it("cuenta las ventas y las que se hicieron sin internet", async () => {
    const m = await metricasDe(A.empresaId);
    expect(m).toMatchObject({ ventas: 2, ventas_sin_internet: 1, monto_vendido: 2980 });
  });

  it("un aviso cuenta como visto solo cuando la persona lo abre", async () => {
    // El arroz quedó en 23 − 2 = 21; con una pérdida grande baja del mínimo (8) y se crea el aviso.
    await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: arroz, p_cantidad: 15, p_motivo: "merma" });
    expect(await metricasDe(A.empresaId)).toMatchObject({ avisos_stock: 1, avisos_vistos: 0, perdidas: 1 });
    await A.dueno.cliente.from("alertas").update({ leida: true }).eq("producto_id", arroz).eq("tipo", "stock_bajo");
    expect((await metricasDe(A.empresaId))?.avisos_vistos).toBe(1);
  });

  it("un aviso que se resuelve solo al reponer no cuenta como visto", async () => {
    await A.dueno.cliente.rpc("registrar_salida", { p_producto_id: arroz, p_cantidad: 1, p_motivo: "regalo" }); // sigue bajo el mínimo
    await admin().from("alertas").update({ leida: false, vista_en: null }).eq("producto_id", arroz).eq("tipo", "stock_bajo");
    await admin().from("movimientos_stock").insert({ empresa_id: A.empresaId, producto_id: arroz, tipo: "compra", cantidad: 20, costo_unitario: 1150 });
    const { data } = await admin().from("alertas").select("leida, vista_en").eq("producto_id", arroz).eq("tipo", "stock_bajo");
    expect(data?.every((a) => a.leida && a.vista_en === null)).toBe(true);
  });

  it("cuenta los precios sugeridos usados", async () => {
    expect((await metricasDe(A.empresaId))?.precios_sugeridos_usados).toBe(1);
  });

  it("el negocio de ejemplo no aparece", async () => {
    expect(await metricasDe(demo.empresaId)).toBeUndefined();
  });

  it("solo el administrador ve las métricas", async () => {
    const { error } = await A.dueno.cliente.rpc("metricas_uso", { p_desde: "2000-01-01T00:00:00Z" });
    expect(error).not.toBeNull();
  });
});
