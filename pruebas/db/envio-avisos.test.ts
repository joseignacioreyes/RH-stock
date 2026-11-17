// Avisos al celular y por correo: cada persona maneja solo sus celulares, y las claves
// y registros internos no se pueden leer desde la app.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
const endpoint = (n: string) => `https://push.ejemplo.cl/${n}-${crypto.randomUUID()}`;

beforeAll(async () => {
  [A, B] = await Promise.all([crearNegocio("Almacén Push A"), crearNegocio("Almacén Push B")]);
  empleadoA = await crearPersona("empleado", A.empresaId);
});
afterAll(limpiar);

describe("celulares que reciben avisos", () => {
  it("cada persona guarda su celular, ligado a su negocio", async () => {
    const e = endpoint("a");
    expect((await A.dueno.cliente.rpc("guardar_suscripcion_push", { p_endpoint: e, p_p256dh: "clave", p_auth: "auth" })).error).toBeNull();
    const { data } = await admin().from("suscripciones_push").select("usuario_id, empresa_id").eq("endpoint", e).single();
    expect(data).toEqual({ usuario_id: A.dueno.id, empresa_id: A.empresaId });
  });

  it("no acepta direcciones que no sean https", async () => {
    const { error } = await A.dueno.cliente.rpc("guardar_suscripcion_push", { p_endpoint: "http://malo", p_p256dh: "x", p_auth: "y" });
    expect(error).not.toBeNull();
  });

  it("nadie ve los celulares de otra persona", async () => {
    await B.dueno.cliente.rpc("guardar_suscripcion_push", { p_endpoint: endpoint("b"), p_p256dh: "k", p_auth: "a" });
    const { data } = await A.dueno.cliente.from("suscripciones_push").select("usuario_id");
    expect(data?.every((s) => s.usuario_id === A.dueno.id)).toBe(true);
    expect((await empleadoA.cliente.from("suscripciones_push").select("id")).data).toEqual([]);
  });

  it("no se escriben directo, y solo se quita el propio", async () => {
    const { error } = await A.dueno.cliente
      .from("suscripciones_push")
      .insert({ usuario_id: B.dueno.id, empresa_id: B.empresaId, endpoint: endpoint("x"), p256dh: "k", auth: "a" });
    expect(error).not.toBeNull();
    const { data: deB } = await admin().from("suscripciones_push").select("endpoint").eq("usuario_id", B.dueno.id).single();
    await A.dueno.cliente.rpc("quitar_suscripcion_push", { p_endpoint: deB!.endpoint });
    expect((await admin().from("suscripciones_push").select("id").eq("endpoint", deB!.endpoint)).data).toHaveLength(1);
  });

  it("el mismo celular pasa a la persona que entra después", async () => {
    const e = endpoint("compartido");
    await A.dueno.cliente.rpc("guardar_suscripcion_push", { p_endpoint: e, p_p256dh: "k", p_auth: "a" });
    await empleadoA.cliente.rpc("guardar_suscripcion_push", { p_endpoint: e, p_p256dh: "k", p_auth: "a" });
    const { data } = await admin().from("suscripciones_push").select("usuario_id").eq("endpoint", e);
    expect(data).toEqual([{ usuario_id: empleadoA.id }]);
  });
});

describe("correo y datos internos", () => {
  it("solo el dueño cambia su resumen por correo", async () => {
    expect((await A.dueno.cliente.rpc("cambiar_avisos_por_correo", { p_activo: false })).error).toBeNull();
    const { data } = await admin().from("usuarios").select("avisos_por_correo").eq("id", A.dueno.id).single();
    expect(data?.avisos_por_correo).toBe(false);
    expect((await empleadoA.cliente.rpc("cambiar_avisos_por_correo", { p_activo: false })).error).not.toBeNull();
  });

  it("las claves de las notificaciones y los pedidos de clave no se leen desde la app", async () => {
    const { data: claves } = await A.dueno.cliente.from("claves_push").select("privada");
    expect(claves ?? []).toEqual([]);
    const { data: pedidos } = await A.dueno.cliente.from("recuperaciones_clave").select("rut");
    expect(pedidos ?? []).toEqual([]);
  });
});
