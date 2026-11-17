// Reglas de seguridad entre negocios (RLS).
// Regla de oro: una persona del negocio A no puede leer ni escribir datos del negocio B.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VERSION_LEGAL } from "@/lib/cuentas";
import { admin, clienteAnonimo, crearNegocio, crearPersona, limpiar, rutAlAzar, type Cliente, type Persona } from "./ayudas";

let A: Awaited<ReturnType<typeof crearNegocio>>;
let B: Awaited<ReturnType<typeof crearNegocio>>;
let demo: Awaited<ReturnType<typeof crearNegocio>>;
let empleadoA: Persona;
let administrador: Persona;
let anonimo: Cliente;

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén A"), crearNegocio("Almacén B"), crearNegocio("Demo", { demo: true })]);
  [empleadoA, administrador] = await Promise.all([crearPersona("empleado", A.empresaId), crearPersona("admin", null)]);
  anonimo = clienteAnonimo();
});

afterAll(limpiar);

const contarCategorias = async (empresaId: string) =>
  (await admin().from("categorias").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId)).count;

describe("sin iniciar sesión", () => {
  it.each(["empresas", "usuarios", "consentimientos", "categorias", "vendedores"] as const)("no se puede leer %s", async (tabla) => {
    const { data } = await anonimo.from(tabla).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("no se puede crear un negocio", async () => {
    const { error } = await anonimo.from("empresas").insert({ rut: rutAlAzar(), nombre_fantasia: "Intruso" });
    expect(error).not.toBeNull();
  });
});

describe("el dueño del negocio A", () => {
  it("ve solo su negocio", async () => {
    const { data } = await A.dueno.cliente.from("empresas").select("id");
    expect(data?.map((e) => e.id)).toEqual([A.empresaId]);
  });

  it("no ve el negocio B ni buscándolo directo", async () => {
    const { data } = await A.dueno.cliente.from("empresas").select("id").eq("id", B.empresaId);
    expect(data).toHaveLength(0);
  });

  it("ve sus 12 categorías y ninguna de B", async () => {
    const propias = await A.dueno.cliente.from("categorias").select("id, empresa_id");
    expect(propias.data).toHaveLength(12);
    expect(propias.data?.every((c) => c.empresa_id === A.empresaId)).toBe(true);

    const ajenas = await A.dueno.cliente.from("categorias").select("id").eq("empresa_id", B.empresaId);
    expect(ajenas.data).toHaveLength(0);
  });

  it("no ve a las personas ni los consentimientos de B", async () => {
    const personas = await A.dueno.cliente.from("usuarios").select("id").eq("id", B.dueno.id);
    expect(personas.data).toHaveLength(0);
    const consentimientos = await A.dueno.cliente.from("consentimientos").select("id").eq("usuario_id", B.dueno.id);
    expect(consentimientos.data).toHaveLength(0);
  });

  it("no ve los vendedores de B", async () => {
    const { data } = await A.dueno.cliente.from("vendedores").select("id").eq("empresa_id", B.empresaId);
    expect(data).toHaveLength(0);
  });

  it("no puede crear categorías en B", async () => {
    const { error } = await A.dueno.cliente.from("categorias").insert({ empresa_id: B.empresaId, nombre: "Intrusa" });
    expect(error).not.toBeNull();
    expect(await contarCategorias(B.empresaId)).toBe(12);
  });

  it("no puede cambiar ni borrar categorías de B", async () => {
    await A.dueno.cliente.from("categorias").update({ margen_objetivo: 99 }).eq("empresa_id", B.empresaId);
    await A.dueno.cliente.from("categorias").delete().eq("empresa_id", B.empresaId);
    const { data } = await admin().from("categorias").select("margen_objetivo").eq("empresa_id", B.empresaId);
    expect(data).toHaveLength(12);
    expect(data?.some((c) => c.margen_objetivo === 99)).toBe(false);
  });

  it("no puede cambiar el negocio B", async () => {
    await A.dueno.cliente.from("empresas").update({ nombre_fantasia: "Hackeado" }).eq("id", B.empresaId);
    const { data } = await admin().from("empresas").select("nombre_fantasia").eq("id", B.empresaId).single();
    expect(data?.nombre_fantasia).toBe("Almacén B");
  });

  it("no puede agregar consentimientos a nombre de otra persona", async () => {
    const { error } = await A.dueno.cliente
      .from("consentimientos")
      .insert({ usuario_id: B.dueno.id, tipo: "datos_anonimos", version: VERSION_LEGAL, aceptado: true });
    expect(error).not.toBeNull();
  });

  it("sí puede cambiar sus propias categorías y el nombre de su negocio", async () => {
    const { error: errorCategoria } = await A.dueno.cliente.from("categorias").insert({ empresa_id: A.empresaId, nombre: "Ferretería" });
    expect(errorCategoria).toBeNull();
    const { data } = await A.dueno.cliente.from("empresas").update({ nombre_fantasia: "Almacén A Renovado" }).eq("id", A.empresaId).select("id");
    expect(data).toHaveLength(1);
  });

  it("no puede darse permisos de administrador ni cambiarse de negocio", async () => {
    const rol = await A.dueno.cliente.from("usuarios").update({ rol: "admin" }).eq("id", A.dueno.id);
    expect(rol.error).not.toBeNull();
    const negocio = await A.dueno.cliente.from("usuarios").update({ empresa_id: B.empresaId }).eq("id", A.dueno.id);
    expect(negocio.error).not.toBeNull();
  });

  it("no puede marcar su negocio como pagado", async () => {
    const { error } = await A.dueno.cliente.from("empresas").update({ estado_suscripcion: "al_dia", es_demo: false }).eq("id", A.empresaId);
    expect(error).not.toBeNull();
  });

  it("ve el nombre de sus vendedores pero nunca el PIN cifrado", async () => {
    const nombres = await A.dueno.cliente.from("vendedores").select("nombre").eq("empresa_id", A.empresaId);
    expect(nombres.data).toHaveLength(1);
    const pin = await A.dueno.cliente.from("vendedores").select("pin_hash");
    expect(pin.error).not.toBeNull();
  });

  it("no puede usar las funciones internas del servidor", async () => {
    const vendedor = await A.dueno.cliente.rpc("crear_vendedor", { p_empresa_id: B.empresaId, p_nombre: "Intruso", p_pin: "0000" });
    expect(vendedor.error).not.toBeNull();
    const categorias = await A.dueno.cliente.rpc("crear_categorias_base", { p_empresa_id: B.empresaId });
    expect(categorias.error).not.toBeNull();
  });
});

describe("un empleado del negocio A", () => {
  it("ve las categorías de su negocio", async () => {
    const { data } = await empleadoA.cliente.from("categorias").select("id").eq("empresa_id", A.empresaId);
    expect(data?.length).toBeGreaterThanOrEqual(12);
  });

  it("no puede cambiar categorías ni el negocio", async () => {
    const { error } = await empleadoA.cliente.from("categorias").insert({ empresa_id: A.empresaId, nombre: "Del empleado" });
    expect(error).not.toBeNull();
    const { data } = await empleadoA.cliente.from("empresas").update({ nombre_fantasia: "Del empleado" }).eq("id", A.empresaId).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("no ve a las otras personas de su negocio (eso es solo del dueño)", async () => {
    const { data } = await empleadoA.cliente.from("usuarios").select("id");
    expect(data?.map((u) => u.id)).toEqual([empleadoA.id]);
  });
});

describe("el negocio de ejemplo (demo)", () => {
  it("se puede mirar", async () => {
    const { data } = await demo.dueno.cliente.from("categorias").select("id");
    expect(data).toHaveLength(12);
  });

  it("no se puede modificar", async () => {
    const { error } = await demo.dueno.cliente.from("categorias").insert({ empresa_id: demo.empresaId, nombre: "Desorden" });
    expect(error).not.toBeNull();
    await demo.dueno.cliente.from("categorias").delete().eq("empresa_id", demo.empresaId);
    await demo.dueno.cliente.from("empresas").update({ nombre_fantasia: "Desorden" }).eq("id", demo.empresaId);
    expect(await contarCategorias(demo.empresaId)).toBe(12);
    const { data } = await admin().from("empresas").select("nombre_fantasia").eq("id", demo.empresaId).single();
    expect(data?.nombre_fantasia).toBe("Demo");
  });
});

describe("el administrador de RH Stock", () => {
  it("ve la ficha de todos los negocios", async () => {
    const { data } = await administrador.cliente.from("empresas").select("id").in("id", [A.empresaId, B.empresaId]);
    expect(data).toHaveLength(2);
  });

  it("no ve el detalle de los negocios (categorías, vendedores)", async () => {
    const categorias = await administrador.cliente.from("categorias").select("id").in("empresa_id", [A.empresaId, B.empresaId]);
    expect(categorias.data).toHaveLength(0);
    const vendedores = await administrador.cliente.from("vendedores").select("id").in("empresa_id", [A.empresaId, B.empresaId]);
    expect(vendedores.data).toHaveLength(0);
  });

  it("no puede cambiar datos de un negocio", async () => {
    await administrador.cliente.from("empresas").update({ nombre_fantasia: "Cambiado por admin" }).eq("id", B.empresaId);
    const { data } = await admin().from("empresas").select("nombre_fantasia").eq("id", B.empresaId).single();
    expect(data?.nombre_fantasia).toBe("Almacén B");
  });
});
