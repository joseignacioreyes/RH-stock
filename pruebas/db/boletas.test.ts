// Boletas de compra en la base de datos:
// - el stock se suma solo al confirmar, todo o nada, y la app aprende las asociaciones;
// - cada negocio ve y confirma solo sus boletas, y sus fotos son privadas.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/tipos-db";
import { admin, clienteAnonimo, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let administrador: Persona;
let arrozA: string;
let categoriaA: string;
const fotos: string[] = [];

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function producto(id: string) {
  const { data } = await admin().from("productos").select("stock_actual, costo_promedio").eq("id", id).single();
  return { stock: Number(data!.stock_actual), costo: Number(data!.costo_promedio) };
}

/** Sube una foto y crea la boleta como lo hace la app, dejándola lista para revisar. */
async function boletaPorConfirmar(persona: Persona, empresaId: string) {
  const ruta = `${empresaId}/${crypto.randomUUID()}.png`;
  const subida = await persona.cliente.storage.from("boletas").upload(ruta, PNG, { contentType: "image/png" });
  if (subida.error) throw subida.error;
  fotos.push(ruta);
  const { data: id, error } = await persona.cliente.rpc("crear_documento", { p_imagen_url: ruta });
  if (error) throw error;
  await admin().from("documentos_compra").update({ estado: "por_confirmar" }).eq("id", id);
  return { id: id as string, ruta };
}

const datosBoleta = (items: Json[]): Json => ({
  tipo: "factura",
  numero: "1234",
  fecha: "2026-11-14",
  proveedor_nombre: "Mayorista de Prueba",
  proveedor_rut: "77123456-9",
  neto: null,
  iva: null,
  total: 30000,
  items,
});

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B"), crearNegocio("Demo", { demo: true })]);
  [empleadoA, administrador] = await Promise.all([crearPersona("empleado", A.empresaId), crearPersona("admin", null)]);
  const { data: categoria } = await admin().from("categorias").select("id").eq("empresa_id", A.empresaId).eq("nombre", "Abarrotes").single();
  categoriaA = categoria!.id;
  const { data } = await A.dueno.cliente.rpc("crear_producto", {
    p_nombre: "Arroz grado 1 1 kg",
    p_categoria_id: categoriaA,
    p_unidad: "unidad",
    p_codigo_barras: "",
    p_precio_venta: 1490,
    p_costo: 1000,
    p_stock_inicial: 10,
    p_stock_minimo: 4,
  });
  arrozA = data!;
});

afterAll(async () => {
  if (fotos.length) await admin().storage.from("boletas").remove(fotos);
  await limpiar();
});

describe("confirmar una boleta", () => {
  let boleta: { id: string; ruta: string };

  beforeAll(async () => {
    boleta = await boletaPorConfirmar(A.dueno, A.empresaId);
  });

  it("antes de confirmar, el stock no cambia", async () => {
    expect((await producto(arrozA)).stock).toBe(10);
  });

  it("suma el stock, recalcula el costo, crea el producto nuevo y el proveedor, todo junto", async () => {
    const { data: cantidad, error } = await A.dueno.cliente.rpc("confirmar_documento", {
      p_documento_id: boleta.id,
      p_datos: datosBoleta([
        { descripcion: "ARROZ  G1 1KG", cantidad: 10, precio_unitario: 1200, total: 12000, producto_id: arrozA, nuevo: null },
        {
          descripcion: "MANI SALADO 200GR",
          cantidad: 20,
          precio_unitario: 890,
          total: 17800,
          producto_id: null,
          nuevo: { nombre: "Maní salado 200 g", categoria_id: categoriaA, unidad: "unidad", precio_venta: 1290 },
        },
      ]),
    });
    expect(error).toBeNull();
    expect(cantidad).toBe(2);

    expect(await producto(arrozA)).toEqual({ stock: 20, costo: 1100 });

    const { data: mani } = await admin().from("productos").select("id, stock_actual, costo_promedio, precio_venta").eq("empresa_id", A.empresaId).eq("nombre", "Maní salado 200 g").single();
    expect(mani).toMatchObject({ stock_actual: 20, costo_promedio: 890, precio_venta: 1290 });

    const { data: doc } = await admin().from("documentos_compra").select("estado, proveedor_id, fecha, numero").eq("id", boleta.id).single();
    expect(doc).toMatchObject({ estado: "confirmado", fecha: "2026-11-14", numero: "1234" });
    expect(doc!.proveedor_id).not.toBeNull();

    const { data: movimientos } = await admin().from("movimientos_stock").select("tipo, referencia_id").eq("referencia_id", boleta.id);
    expect(movimientos).toHaveLength(2);
    expect(movimientos!.every((m) => m.tipo === "compra")).toBe(true);
  });

  it("aprende la asociación descripción → producto (normalizada)", async () => {
    const { data } = await A.dueno.cliente.from("alias_productos").select("descripcion_original, producto_id").eq("producto_id", arrozA);
    expect(data).toEqual([{ descripcion_original: "arroz g1 1kg", producto_id: arrozA }]);
  });

  it("no se puede confirmar dos veces (el stock no se duplica)", async () => {
    const { error } = await A.dueno.cliente.rpc("confirmar_documento", {
      p_documento_id: boleta.id,
      p_datos: datosBoleta([{ descripcion: "ARROZ", cantidad: 10, precio_unitario: 1200, total: 12000, producto_id: arrozA, nuevo: null }]),
    });
    expect(error).not.toBeNull();
    expect((await producto(arrozA)).stock).toBe(20);
  });

  it("una boleta confirmada no se puede descartar", async () => {
    const { error } = await A.dueno.cliente.rpc("descartar_documento", { p_documento_id: boleta.id });
    expect(error).not.toBeNull();
  });

  it("si algo falla, no se guarda nada (todo o nada)", async () => {
    const otra = await boletaPorConfirmar(A.dueno, A.empresaId);
    const { error } = await A.dueno.cliente.rpc("confirmar_documento", {
      p_documento_id: otra.id,
      p_datos: datosBoleta([
        { descripcion: "ARROZ", cantidad: 5, precio_unitario: 1200, total: 6000, producto_id: arrozA, nuevo: null },
        { descripcion: "MALO", cantidad: 0, precio_unitario: 100, total: 0, producto_id: arrozA, nuevo: null },
      ]),
    });
    expect(error).not.toBeNull();
    expect((await producto(arrozA)).stock).toBe(20);
    const { data } = await admin().from("documentos_compra").select("estado").eq("id", otra.id).single();
    expect(data?.estado).toBe("por_confirmar");
  });

  it("un empleado también puede registrar compras", async () => {
    const deEmpleado = await boletaPorConfirmar(empleadoA, A.empresaId);
    const { error } = await empleadoA.cliente.rpc("confirmar_documento", {
      p_documento_id: deEmpleado.id,
      p_datos: datosBoleta([{ descripcion: "ARROZ G1 1KG", cantidad: 2, precio_unitario: 1100, total: 2200, producto_id: arrozA, nuevo: null }]),
    });
    expect(error).toBeNull();
    expect((await producto(arrozA)).stock).toBe(22);
  });
});

describe("cada negocio ve y confirma solo sus boletas", () => {
  let boletaA: { id: string; ruta: string };

  beforeAll(async () => {
    boletaA = await boletaPorConfirmar(A.dueno, A.empresaId);
  });

  it("B no ve las boletas, proveedores ni lo aprendido de A", async () => {
    for (const tabla of ["documentos_compra", "proveedores", "alias_productos", "items_documento"] as const) {
      const { data } = await B.dueno.cliente.from(tabla).select("id").eq("empresa_id", A.empresaId);
      expect(data, tabla).toHaveLength(0);
    }
  });

  it("B no puede confirmar ni descartar una boleta de A", async () => {
    const confirmar = await B.dueno.cliente.rpc("confirmar_documento", {
      p_documento_id: boletaA.id,
      p_datos: datosBoleta([{ descripcion: "X", cantidad: 1, precio_unitario: 1, total: 1, producto_id: arrozA, nuevo: null }]),
    });
    expect(confirmar.error).not.toBeNull();
    const descartar = await B.dueno.cliente.rpc("descartar_documento", { p_documento_id: boletaA.id });
    expect(descartar.error).not.toBeNull();
  });

  it("B no puede sumar stock a un producto de A usando su propia boleta", async () => {
    const boletaB = await boletaPorConfirmar(B.dueno, B.empresaId);
    const { error } = await B.dueno.cliente.rpc("confirmar_documento", {
      p_documento_id: boletaB.id,
      p_datos: datosBoleta([{ descripcion: "X", cantidad: 100, precio_unitario: 1, total: 100, producto_id: arrozA, nuevo: null }]),
    });
    expect(error).not.toBeNull();
  });

  it("B no puede anotar una foto que está en la carpeta de A", async () => {
    const { error } = await B.dueno.cliente.rpc("crear_documento", { p_imagen_url: boletaA.ruta });
    expect(error).not.toBeNull();
  });

  it("el administrador de RH Stock no ve las compras de los negocios", async () => {
    const { data } = await administrador.cliente.from("documentos_compra").select("id").eq("empresa_id", A.empresaId);
    expect(data).toHaveLength(0);
  });
});

describe("las fotos de las boletas son privadas", () => {
  it("cada negocio puede ver sus fotos", async () => {
    const { ruta } = await boletaPorConfirmar(A.dueno, A.empresaId);
    const { data, error } = await A.dueno.cliente.storage.from("boletas").createSignedUrl(ruta, 60);
    expect(error).toBeNull();
    expect(data?.signedUrl).toContain("token=");
  });

  it("B no puede ver ni bajar las fotos de A", async () => {
    const { ruta } = await boletaPorConfirmar(A.dueno, A.empresaId);
    const firmada = await B.dueno.cliente.storage.from("boletas").createSignedUrl(ruta, 60);
    expect(firmada.data?.signedUrl).toBeUndefined();
    const bajada = await B.dueno.cliente.storage.from("boletas").download(ruta);
    expect(bajada.data).toBeNull();
  });

  it("B no puede subir fotos a la carpeta de A", async () => {
    const { error } = await B.dueno.cliente.storage.from("boletas").upload(`${A.empresaId}/intruso.png`, PNG, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("sin sesión no se ve ninguna foto", async () => {
    const { data } = await clienteAnonimo().storage.from("boletas").list(A.empresaId);
    expect(data ?? []).toHaveLength(0);
  });

  it("el negocio de ejemplo no puede subir fotos ni crear boletas", async () => {
    const subida = await demo.dueno.cliente.storage.from("boletas").upload(`${demo.empresaId}/x.png`, PNG, { contentType: "image/png" });
    expect(subida.error).not.toBeNull();
    const boleta = await demo.dueno.cliente.rpc("crear_documento", { p_imagen_url: null as unknown as string });
    expect(boleta.error).not.toBeNull();
  });
});
