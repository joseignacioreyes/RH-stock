// Ventas sin internet: se guardan primero en el celular y se envían cuando hay conexión.
// Cada venta lleva un id_local (generado en el celular) y la base de datos no acepta dos
// ventas con el mismo id_local: así, aunque se envíe dos veces, queda una sola.

export type VentaPendiente = {
  id_local: string;
  vendedor_id: string | null;
  fecha: string;
  medio_pago: "efectivo" | "debito" | "credito" | "transferencia";
  items: { producto_id: string; cantidad: number; precio_unitario: number }[];
};

/** Dónde se guardan las ventas pendientes (IndexedDB en el celular; memoria en las pruebas). */
export interface Almacen {
  todas(): Promise<VentaPendiente[]>;
  guardar(venta: VentaPendiente): Promise<void>;
  quitar(idLocal: string): Promise<void>;
}

/**
 * Resultado de enviar una venta:
 * - "ok": quedó guardada (también si ya estaba: no se duplica);
 * - "sin_conexion": no hubo internet o el servidor no respondió → se reintenta después;
 * - "rechazada": el servidor no la acepta (por ejemplo, el producto ya no existe) → no se reintenta.
 */
export type ResultadoEnvio = "ok" | "sin_conexion" | "rechazada";

export type Resumen = { enviadas: number; pendientes: number; rechazadas: VentaPendiente[] };

/** Guarda una venta en el celular ANTES de intentar enviarla (así nunca se pierde). */
export async function encolar(almacen: Almacen, venta: VentaPendiente): Promise<void> {
  await almacen.guardar(venta);
}

let sincronizando: Promise<Resumen> | null = null;

/**
 * Envía las ventas pendientes, en orden. Si ya hay un envío en curso, espera ese mismo
 * (dos envíos a la vez podrían mandar la misma venta dos veces).
 */
export function sincronizar(almacen: Almacen, enviar: (venta: VentaPendiente) => Promise<ResultadoEnvio>): Promise<Resumen> {
  sincronizando ??= (async () => {
    const rechazadas: VentaPendiente[] = [];
    let enviadas = 0;
    try {
      const pendientes = (await almacen.todas()).sort((a, b) => a.fecha.localeCompare(b.fecha));
      for (const venta of pendientes) {
        const resultado = await enviar(venta).catch((): ResultadoEnvio => "sin_conexion");
        if (resultado === "sin_conexion") break; // sin internet: se reintenta todo después, en orden
        await almacen.quitar(venta.id_local);
        if (resultado === "ok") enviadas++;
        else rechazadas.push(venta);
      }
      return { enviadas, pendientes: (await almacen.todas()).length, rechazadas };
    } finally {
      sincronizando = null;
    }
  })();
  return sincronizando;
}

/** Almacén en memoria (para pruebas). */
export function almacenEnMemoria(): Almacen & { datos: Map<string, VentaPendiente> } {
  const datos = new Map<string, VentaPendiente>();
  return {
    datos,
    async todas() {
      return [...datos.values()];
    },
    async guardar(venta) {
      datos.set(venta.id_local, venta);
    },
    async quitar(idLocal) {
      datos.delete(idLocal);
    },
  };
}
