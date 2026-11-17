// Suscripciones y pagos: estados según la fecha, solo lectura por atraso, comprobantes,
// confirmar/rechazar y que nadie vea los pagos de otro negocio.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, crearNegocio, crearPersona, limpiar, type Persona } from "./ayudas";

type Negocio = Awaited<ReturnType<typeof crearNegocio>>;
let A: Negocio;
let B: Negocio;
let demo: Negocio;
let empleadoA: Persona;
let administrador: Persona;

/** Fecha de Chile (AAAA-MM-DD) desplazada en días desde hoy. */
function dia(desplazamiento: number): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const fecha = new Date(`${hoy}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento);
  return fecha.toISOString().slice(0, 10);
}

/** Deja al negocio con plan mensual y el vencimiento indicado (sin pasar por el día 1-28, para probar cualquier fecha). */
async function vencimiento(empresaId: string, fecha: string | null, plan: "mensual" | "piloto" = "mensual") {
  const { error } = await admin()
    .from("empresas")
    .update({ plan, proximo_vencimiento: fecha, dia_pago: fecha ? Math.min(Number(fecha.slice(8, 10)), 28) : 5 })
    .eq("id", empresaId);
  if (error) throw error;
}

const estado = async (persona: Persona) => (await persona.cliente.rpc("mi_suscripcion")).data?.[0];

async function subirComprobante(persona: Persona, empresaId: string) {
  const ruta = `${empresaId}/${crypto.randomUUID()}.png`;
  const { error } = await persona.cliente.storage.from("comprobantes").upload(ruta, new Blob([new Uint8Array(20)], { type: "image/png" }), { contentType: "image/png" });
  return { ruta, error };
}

const pagosDe = async (empresaId: string) => (await admin().from("pagos").select("*").eq("empresa_id", empresaId).order("created_at")).data ?? [];
const avisosDePago = async (empresaId: string) =>
  (await admin().from("alertas").select("mensaje, leida, datos").eq("empresa_id", empresaId).eq("tipo", "pago").order("created_at")).data ?? [];

beforeAll(async () => {
  [A, B, demo] = await Promise.all([crearNegocio("Almacén Pagos A"), crearNegocio("Almacén Pagos B"), crearNegocio("Demo pagos", { demo: true })]);
  [empleadoA, administrador] = await Promise.all([crearPersona("empleado", A.empresaId), crearPersona("admin", null)]);
});

afterAll(async () => {
  const ids = [A.empresaId, B.empresaId, demo.empresaId];
  for (const id of ids) {
    const { data } = await admin().storage.from("comprobantes").list(id);
    if (data?.length) await admin().storage.from("comprobantes").remove(data.map((f) => `${id}/${f.name}`));
  }
  await admin().from("pagos").delete().in("empresa_id", ids);
  await limpiar();
});

describe("plan y estado", () => {
  it("un negocio nuevo parte en el piloto gratis, al día", async () => {
    expect(await estado(A.dueno)).toMatchObject({ plan: "piloto", estado: "al_dia", precio_mensual: 30000 });
  });

  it("el estado sale solo de la fecha de vencimiento", async () => {
    const casos: [number, string][] = [
      [10, "al_dia"],
      [3, "por_vencer"],
      [0, "por_vencer"],
      [-1, "atrasado"],
      [-10, "atrasado"],
      [-11, "suspendido"],
    ];
    for (const [desplazamiento, esperado] of casos) {
      await vencimiento(B.empresaId, dia(desplazamiento));
      expect((await estado(B.dueno))?.estado, `vencimiento en ${desplazamiento} días`).toBe(esperado);
    }
  });

  it("dice desde qué día queda solo para mirar (11 días después del vencimiento)", async () => {
    await vencimiento(B.empresaId, dia(-2));
    expect((await estado(B.dueno))?.solo_lectura_desde).toBe(dia(9));
  });

  it("el dueño no puede cambiarse el plan, el precio ni el vencimiento", async () => {
    await B.dueno.cliente.from("empresas").update({ plan: "piloto" }).eq("id", B.empresaId);
    await B.dueno.cliente.from("empresas").update({ precio_mensual: 1 }).eq("id", B.empresaId);
    await B.dueno.cliente.from("empresas").update({ proximo_vencimiento: dia(300) }).eq("id", B.empresaId);
    const { data } = await admin().from("empresas").select("plan, precio_mensual, proximo_vencimiento").eq("id", B.empresaId).single();
    expect(data).toMatchObject({ plan: "mensual", precio_mensual: 30000, proximo_vencimiento: dia(-2) });
  });
});

describe("solo lectura por atraso", () => {
  const crearProducto = (persona: Persona) =>
    persona.cliente.rpc("crear_producto", {
      p_nombre: `Arroz ${crypto.randomUUID().slice(0, 6)}`,
      p_categoria_id: null as unknown as string,
      p_unidad: "unidad",
      p_codigo_barras: "",
      p_precio_venta: 1490,
      p_costo: 1150,
      p_stock_inicial: 5,
      p_stock_minimo: 1,
    });

  it("con 10 días de atraso todavía puede trabajar", async () => {
    await vencimiento(B.empresaId, dia(-10));
    expect((await crearProducto(B.dueno)).error).toBeNull();
  });

  it("con más de 10 días de atraso no puede registrar nada, pero sí ver sus datos", async () => {
    await vencimiento(B.empresaId, dia(-11));
    const { error } = await crearProducto(B.dueno);
    expect(error).not.toBeNull();
    const { data } = await B.dueno.cliente.from("productos").select("id");
    expect(data?.length).toBeGreaterThan(0);
  });

  it("estando suspendido puede subir el comprobante e informar el pago", async () => {
    const { ruta, error } = await subirComprobante(B.dueno, B.empresaId);
    expect(error).toBeNull();
    const { error: errorInforme } = await B.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta });
    expect(errorInforme).toBeNull();
  });

  it("con el pago informado vuelve a poder trabajar mientras José lo revisa", async () => {
    expect(await estado(B.dueno)).toMatchObject({ estado: "atrasado", pago_en_revision: true });
    expect((await crearProducto(B.dueno)).error).toBeNull();
  });

  it("nunca se borran datos por atraso", async () => {
    const { count } = await admin().from("productos").select("id", { count: "exact", head: true }).eq("empresa_id", B.empresaId);
    expect(count).toBe(2);
  });
});

describe("informar un pago", () => {
  it("en el piloto no hay nada que pagar", async () => {
    await vencimiento(A.empresaId, null, "piloto");
    const { ruta } = await subirComprobante(A.dueno, A.empresaId);
    const { error } = await A.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta });
    expect(error?.code).toBe("RH001");
  });

  it("el dueño informa el pago del mes que vence, con el precio de su plan", async () => {
    await vencimiento(A.empresaId, dia(2));
    await admin().rpc("actualizar_suscripciones");
    expect((await avisosDePago(A.empresaId)).some((a) => !a.leida && a.mensaje.startsWith("Tu pago de $30.000"))).toBe(true);

    const { ruta } = await subirComprobante(A.dueno, A.empresaId);
    const { error } = await A.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta });
    expect(error).toBeNull();
    const [pago] = await pagosDe(A.empresaId);
    expect(pago).toMatchObject({ periodo: dia(2).slice(0, 7), monto: 30000, estado: "informado", comprobante_url: ruta });
    // El recordatorio se cierra solo al informar.
    expect((await avisosDePago(A.empresaId)).every((a) => a.leida)).toBe(true);
  });

  it("no se puede informar dos veces el mismo mes", async () => {
    const { ruta } = await subirComprobante(A.dueno, A.empresaId);
    const { error } = await A.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta });
    expect(error?.code).toBe("RH002");
  });

  it("no se puede informar con un comprobante de otro negocio", async () => {
    const { error } = await B.dueno.cliente.rpc("informar_pago", { p_comprobante_url: `${A.empresaId}/x.png` });
    expect(error).not.toBeNull();
  });

  it("los empleados no informan pagos ni suben comprobantes", async () => {
    const { error: errorSubida } = await subirComprobante(empleadoA, A.empresaId);
    expect(errorSubida).not.toBeNull();
    const { error } = await empleadoA.cliente.rpc("informar_pago", { p_comprobante_url: `${A.empresaId}/x.png` });
    expect(error).not.toBeNull();
  });

  it("en el negocio de ejemplo no se informan pagos", async () => {
    await vencimiento(demo.empresaId, dia(5));
    const { error: errorSubida } = await subirComprobante(demo.dueno, demo.empresaId);
    expect(errorSubida).not.toBeNull();
    const { error } = await demo.dueno.cliente.rpc("informar_pago", { p_comprobante_url: `${demo.empresaId}/x.png` });
    expect(error).not.toBeNull();
  });

  it("el dueño no puede escribir la tabla de pagos directamente", async () => {
    const { error } = await A.dueno.cliente
      .from("pagos")
      .insert({ empresa_id: A.empresaId, rut_empresa: "1-9", nombre_negocio: "x", periodo: "2030-01", monto: 1, estado: "confirmado" });
    expect(error).not.toBeNull();
    await A.dueno.cliente.from("pagos").update({ estado: "confirmado" }).eq("empresa_id", A.empresaId);
    expect((await pagosDe(A.empresaId))[0]?.estado).toBe("informado");
  });
});

describe("quién ve los pagos", () => {
  it("el dueño ve solo los de su negocio", async () => {
    const { data } = await A.dueno.cliente.from("pagos").select("empresa_id");
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((p) => p.empresa_id === A.empresaId)).toBe(true);
  });

  it("los empleados no ven los pagos de la suscripción", async () => {
    const { data } = await empleadoA.cliente.from("pagos").select("id");
    expect(data).toEqual([]);
  });

  it("nadie ve los comprobantes de otro negocio", async () => {
    const [pago] = await pagosDe(A.empresaId);
    const { data } = await B.dueno.cliente.storage.from("comprobantes").createSignedUrl(pago!.comprobante_url!, 60);
    expect(data).toBeNull();
    const { data: propio } = await A.dueno.cliente.storage.from("comprobantes").createSignedUrl(pago!.comprobante_url!, 60);
    expect(propio?.signedUrl).toBeTruthy();
  });

  it("el administrador ve todos los pagos y sus comprobantes", async () => {
    const { data } = await administrador.cliente.from("pagos").select("empresa_id").in("empresa_id", [A.empresaId, B.empresaId]);
    expect(new Set(data?.map((p) => p.empresa_id))).toEqual(new Set([A.empresaId, B.empresaId]));
    const [pago] = await pagosDe(A.empresaId);
    const { data: url } = await administrador.cliente.storage.from("comprobantes").createSignedUrl(pago!.comprobante_url!, 60);
    expect(url?.signedUrl).toBeTruthy();
  });
});

describe("el administrador revisa", () => {
  it("solo el administrador confirma o rechaza", async () => {
    const [pago] = await pagosDe(A.empresaId);
    expect((await A.dueno.cliente.rpc("confirmar_pago", { p_pago_id: pago!.id })).error).not.toBeNull();
    expect((await A.dueno.cliente.rpc("rechazar_pago", { p_pago_id: pago!.id, p_motivo: "x" })).error).not.toBeNull();
    expect((await A.dueno.cliente.rpc("admin_negocios")).error).not.toBeNull();
  });

  it("al confirmar, el vencimiento pasa al mes siguiente y avisa al dueño", async () => {
    const [pago] = await pagosDe(A.empresaId);
    const { error } = await administrador.cliente.rpc("confirmar_pago", { p_pago_id: pago!.id });
    expect(error).toBeNull();

    const venc = new Date(`${dia(2)}T12:00:00Z`);
    venc.setUTCMonth(venc.getUTCMonth() + 1);
    const siguiente = venc.toISOString().slice(0, 10);
    expect(await estado(A.dueno)).toMatchObject({ estado: "al_dia", proximo_vencimiento: siguiente });
    expect((await pagosDe(A.empresaId))[0]).toMatchObject({ estado: "confirmado", confirmado_por: administrador.id });
    const avisos = await avisosDePago(A.empresaId);
    expect(avisos.at(-1)?.mensaje).toMatch(/^Recibimos tu pago de .+\. ¡Gracias! Tu próximo pago vence el \d\d-\d\d-\d{4}\.$/);
  });

  it("un pago ya revisado no se vuelve a confirmar", async () => {
    const [pago] = await pagosDe(A.empresaId);
    const { error } = await administrador.cliente.rpc("confirmar_pago", { p_pago_id: pago!.id });
    expect(error?.code).toBe("RH004");
  });

  it("al rechazar, el dueño ve el motivo y puede informarlo de nuevo", async () => {
    const [pago] = await pagosDe(B.empresaId);
    expect((await administrador.cliente.rpc("rechazar_pago", { p_pago_id: pago!.id, p_motivo: " " })).error?.code).toBe("RH005");
    const { error } = await administrador.cliente.rpc("rechazar_pago", { p_pago_id: pago!.id, p_motivo: "El monto no coincide" });
    expect(error).toBeNull();
    expect((await avisosDePago(B.empresaId)).at(-1)?.mensaje).toContain("No pudimos confirmar tu pago de");
    // Vuelve a quedar suspendido (no hay pago en revisión)…
    expect((await estado(B.dueno))?.estado).toBe("suspendido");
    // …y puede informarlo de nuevo.
    const { ruta } = await subirComprobante(B.dueno, B.empresaId);
    expect((await B.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta })).error).toBeNull();
  });

  it("el administrador pasa un negocio del piloto al plan mensual", async () => {
    const { error } = await administrador.cliente.rpc("admin_configurar_cobro", {
      p_empresa_id: B.empresaId,
      p_plan: "mensual",
      p_precio: 25000,
      p_primer_vencimiento: "2030-03-05",
    });
    expect(error).toBeNull();
    expect(await estado(B.dueno)).toMatchObject({ plan: "mensual", precio_mensual: 25000, dia_pago: 5, proximo_vencimiento: "2030-03-05", estado: "al_dia" });
    const { error: errorDia } = await administrador.cliente.rpc("admin_configurar_cobro", {
      p_empresa_id: B.empresaId,
      p_plan: "mensual",
      p_precio: 25000,
      p_primer_vencimiento: "2030-03-30",
    });
    expect(errorDia?.code).toBe("RH003");
  });

  it("la lista del administrador trae el estado de pago calculado", async () => {
    const { data } = await administrador.cliente.rpc("admin_negocios");
    const a = data?.find((n) => n.id === A.empresaId);
    expect(a).toMatchObject({ plan: "mensual", estado: "al_dia", pago_en_revision: false });
    expect(data?.find((n) => n.id === B.empresaId)?.pago_en_revision).toBe(true);
  });
});

describe("tarea diaria", () => {
  it("avisa del atraso y de la suspensión una sola vez", async () => {
    await admin().from("pagos").delete().eq("empresa_id", A.empresaId); // un mes sin pagar
    await vencimiento(A.empresaId, dia(-3));
    await admin().rpc("actualizar_suscripciones");
    await admin().rpc("actualizar_suscripciones");
    let avisos = (await avisosDePago(A.empresaId)).filter((a) => (a.datos as { clave: string }).clave.startsWith("atraso-"));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.mensaje).toContain(`desde el ${dia(8).split("-").reverse().join("-")} la app quedará solo para mirar`);

    await vencimiento(A.empresaId, dia(-12));
    await admin().rpc("actualizar_suscripciones");
    avisos = (await avisosDePago(A.empresaId)).filter((a) => (a.datos as { clave: string }).clave.startsWith("suspension-"));
    expect(avisos).toHaveLength(1);
    const { data } = await admin().from("empresas").select("estado_suscripcion").eq("id", A.empresaId).single();
    expect(data?.estado_suscripcion).toBe("suspendido");
    // El aviso de atraso de ese mes se cierra solo: queda solo el de "solo para mirar".
    const sinLeer = (await avisosDePago(A.empresaId))
      .filter((x) => !x.leida)
      .map((x) => (x.datos as { clave: string }).clave.split("-")[0])
      .filter((tipo) => tipo !== "confirmado");
    expect(sinLeer).toEqual(["suspension"]);
  });

  it("los empleados no ven los avisos de pago", async () => {
    const { data } = await empleadoA.cliente.from("alertas").select("id").eq("tipo", "pago");
    expect(data).toEqual([]);
  });

  it("los pagos se conservan aunque el negocio elimine su cuenta (respaldo tributario)", async () => {
    const otro = await crearNegocio("Almacén que se va");
    await vencimiento(otro.empresaId, dia(1));
    const { ruta } = await subirComprobante(otro.dueno, otro.empresaId);
    const { data: pagoId } = await otro.dueno.cliente.rpc("informar_pago", { p_comprobante_url: ruta });
    await admin().from("empresas").delete().eq("id", otro.empresaId);
    const { data } = await admin().from("pagos").select("empresa_id, nombre_negocio").eq("id", pagoId!).single();
    expect(data).toEqual({ empresa_id: null, nombre_negocio: "Almacén que se va" });
    await admin().storage.from("comprobantes").remove([ruta]);
    await admin().from("pagos").delete().eq("id", pagoId!);
  });
});
