// Partes de la caja que solo funcionan en el celular: guardar ventas en IndexedDB y enviarlas.
import { crearClienteNavegador } from "../supabase/navegador";
import type { Almacen, ResultadoEnvio, VentaPendiente } from "./cola";

const BASE = "rh-stock-caja";
const VENTAS = "ventas_pendientes";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(VENTAS, { keyPath: "id_local" });
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, accion: (tienda: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await abrir();
  return new Promise((resolver, rechazar) => {
    const pedido = accion(base.transaction(VENTAS, modo).objectStore(VENTAS));
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

/** Ventas pendientes guardadas en este celular (IndexedDB: sobreviven si se cierra la app o se apaga el celular). */
export const almacenNavegador: Almacen = {
  todas: () => operar("readonly", (t) => t.getAll() as IDBRequest<VentaPendiente[]>),
  guardar: async (venta) => {
    await operar("readwrite", (t) => t.put(venta));
  },
  quitar: async (idLocal) => {
    await operar("readwrite", (t) => t.delete(idLocal));
  },
};

/** Envía una venta a la base de datos. Si no hay internet o venció la sesión, se reintenta después. */
export async function enviarVenta(venta: VentaPendiente): Promise<ResultadoEnvio> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "sin_conexion";
  const { error } = await crearClienteNavegador().rpc("registrar_venta", { p_venta: venta });
  if (!error) return "ok";
  // Errores de red o de sesión vencida no traen código de Postgres: se reintenta (nunca se pierde la venta).
  const codigo = error.code ?? "";
  if (!codigo || codigo.startsWith("PGRST3") || /fetch|network|jwt/i.test(error.message)) return "sin_conexion";
  // Sin permiso (por ejemplo, la cuenta quedó solo para mirar por un pago atrasado): la venta ya se hizo en el
  // mostrador, así que no se bota. Queda guardada en el celular y se envía cuando se confirme el pago.
  if (codigo === "42501") return "sin_conexion";
  console.error("La venta fue rechazada:", error);
  return "rechazada";
}

/** Registra el service worker que permite abrir la caja sin internet. */
export function registrarModoSinInternet() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("No se pudo activar el modo sin internet", error));
  }
}
