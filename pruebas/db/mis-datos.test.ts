// "Mis datos": pedir y cancelar la eliminación de la cuenta (Ley 21.719).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let administrador: Persona;

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B"), crearNegocio("Demo", { demo: true })]);
  [empleadoA, administrador] = await Promise.all([crearPersona("empleado", A.empresaId), crearPersona("admin", null)]);
});

afterAll(async () => {
  await admin().from("solicitudes_eliminacion").delete().in("empresa_id", [A.empresaId, B.empresaId]);
  await limpiar();
});

describe("eliminar la cuenta", () => {
  it("el dueño la pide y se programa para 30 días después", async () => {
    const { data, error } = await A.dueno.cliente.rpc("solicitar_eliminacion");
    expect(error).toBeNull();
    const dias = (new Date(data!).getTime() - Date.now()) / 86_400_000;
    expect(Math.round(dias)).toBe(30);
  });

  it("pedirla dos veces no crea dos solicitudes", async () => {
    await A.dueno.cliente.rpc("solicitar_eliminacion");
    const { count } = await admin().from("solicitudes_eliminacion").select("id", { count: "exact", head: true }).eq("empresa_id", A.empresaId).eq("estado", "pendiente");
    expect(count).toBe(1);
  });

  it("un empleado no puede pedirla ni cancelarla", async () => {
    expect((await empleadoA.cliente.rpc("solicitar_eliminacion")).error).not.toBeNull();
    expect((await empleadoA.cliente.rpc("cancelar_eliminacion")).error).not.toBeNull();
  });

  it("el negocio de ejemplo no se puede eliminar", async () => {
    expect((await demo.dueno.cliente.rpc("solicitar_eliminacion")).error).not.toBeNull();
  });

  it("otro negocio no ve la solicitud; el administrador sí (para hacer seguimiento)", async () => {
    const deB = await B.dueno.cliente.from("solicitudes_eliminacion").select("id").eq("empresa_id", A.empresaId);
    expect(deB.data).toHaveLength(0);
    const delAdmin = await administrador.cliente.from("solicitudes_eliminacion").select("id").eq("empresa_id", A.empresaId);
    expect(delAdmin.data).toHaveLength(1);
  });

  it("B no puede cancelar la solicitud de A", async () => {
    await B.dueno.cliente.rpc("cancelar_eliminacion");
    const { data } = await admin().from("solicitudes_eliminacion").select("estado").eq("empresa_id", A.empresaId).single();
    expect(data?.estado).toBe("pendiente");
  });

  it("el dueño se puede arrepentir", async () => {
    expect((await A.dueno.cliente.rpc("cancelar_eliminacion")).error).toBeNull();
    const { data } = await admin().from("solicitudes_eliminacion").select("estado").eq("empresa_id", A.empresaId).single();
    expect(data?.estado).toBe("cancelada");
  });
});
