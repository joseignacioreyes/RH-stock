import { describe, expect, it } from "vitest";
import { almacenEnMemoria, encolar, sincronizar, type ResultadoEnvio, type VentaPendiente } from "./cola";

const venta = (n: number): VentaPendiente => ({
  id_local: `00000000-0000-4000-8000-00000000000${n}`,
  vendedor_id: null,
  fecha: `2026-11-17T1${n}:00:00Z`,
  medio_pago: "efectivo",
  items: [{ producto_id: "cola", cantidad: 1, precio_unitario: 1990 }],
});

/** Servidor de mentira que, como la base de datos real, no guarda dos veces el mismo id_local. */
function servidor() {
  const guardadas = new Set<string>();
  let conInternet = true;
  let envios = 0;
  return {
    guardadas,
    get envios() {
      return envios;
    },
    cortarInternet: () => (conInternet = false),
    volverInternet: () => (conInternet = true),
    enviar: async (v: VentaPendiente): Promise<ResultadoEnvio> => {
      await new Promise((r) => setTimeout(r, 1));
      if (!conInternet) throw new TypeError("Failed to fetch");
      envios++;
      guardadas.add(v.id_local);
      return "ok";
    },
  };
}

describe("ventas sin internet", () => {
  it("sin internet las ventas quedan guardadas en el celular", async () => {
    const almacen = almacenEnMemoria();
    const srv = servidor();
    srv.cortarInternet();
    await encolar(almacen, venta(1));
    await encolar(almacen, venta(2));
    const resumen = await sincronizar(almacen, srv.enviar);
    expect(resumen).toMatchObject({ enviadas: 0, pendientes: 2 });
    expect(srv.guardadas.size).toBe(0);
  });

  it("al volver internet se envían todas, una vez cada una", async () => {
    const almacen = almacenEnMemoria();
    const srv = servidor();
    srv.cortarInternet();
    for (const n of [1, 2, 3]) await encolar(almacen, venta(n));
    await sincronizar(almacen, srv.enviar);
    srv.volverInternet();
    const resumen = await sincronizar(almacen, srv.enviar);
    expect(resumen).toMatchObject({ enviadas: 3, pendientes: 0 });
    expect(srv.guardadas.size).toBe(3);
  });

  it("dos sincronizaciones al mismo tiempo no envían la misma venta dos veces", async () => {
    const almacen = almacenEnMemoria();
    const srv = servidor();
    for (const n of [1, 2]) await encolar(almacen, venta(n));
    const [a, b] = await Promise.all([sincronizar(almacen, srv.enviar), sincronizar(almacen, srv.enviar)]);
    expect(srv.envios).toBe(2);
    expect(a).toBe(b);
  });

  it("si se corta internet a mitad de camino, lo que falta se envía después sin duplicar", async () => {
    const almacen = almacenEnMemoria();
    const srv = servidor();
    for (const n of [1, 2, 3]) await encolar(almacen, venta(n));
    let llamadas = 0;
    const enviarYCortar = async (v: VentaPendiente) => {
      if (++llamadas === 2) srv.cortarInternet();
      return srv.enviar(v);
    };
    expect(await sincronizar(almacen, enviarYCortar)).toMatchObject({ enviadas: 1, pendientes: 2 });
    srv.volverInternet();
    expect(await sincronizar(almacen, srv.enviar)).toMatchObject({ enviadas: 2, pendientes: 0 });
    expect([...srv.guardadas].sort()).toEqual([venta(1), venta(2), venta(3)].map((v) => v.id_local));
  });

  it("una venta que el servidor rechaza no bloquea las demás ni se reintenta para siempre", async () => {
    const almacen = almacenEnMemoria();
    await encolar(almacen, venta(1));
    await encolar(almacen, venta(2));
    const resumen = await sincronizar(almacen, async (v) => (v.id_local === venta(1).id_local ? "rechazada" : "ok"));
    expect(resumen.enviadas).toBe(1);
    expect(resumen.rechazadas.map((v) => v.id_local)).toEqual([venta(1).id_local]);
    expect(resumen.pendientes).toBe(0);
  });
});
