"use client";

import Link from "next/link";
import { avisarPendientes } from "../avisos/acciones";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  agregar,
  buscar,
  buscarPorCodigo,
  cambiarCantidad,
  esGranel,
  totalCarrito,
  totalLinea,
  type LineaCarrito,
  type ProductoCaja,
} from "@/lib/caja/carrito";
import { encolar, sincronizar, type VentaPendiente } from "@/lib/caja/cola";
import { almacenNavegador, enviarVenta, registrarModoSinInternet } from "@/lib/caja/navegador";
import { formatearPesos } from "@/lib/formato";
import { enlaceWhatsApp, MENSAJES_WHATSAPP } from "@/lib/whatsapp";
import { ElegirVendedor, type Vendedor } from "./ElegirVendedor";
import { Escaner } from "./Escaner";
import { Granel } from "./Granel";

type Props = {
  empresaId: string;
  esDemo: boolean;
  esDueno: boolean;
  productos: ProductoCaja[];
  masVendidos: ProductoCaja[];
  vendedores: Vendedor[];
};

type Mensaje = { tipo: "exito" | "error"; texto: string } | null;
type MedioPago = VentaPendiente["medio_pago"];

const MEDIOS: { valor: MedioPago; texto: string; icono: string }[] = [
  { valor: "efectivo", texto: "Efectivo", icono: "💵" },
  { valor: "debito", texto: "Débito", icono: "💳" },
  { valor: "credito", texto: "Crédito", icono: "💳" },
  { valor: "transferencia", texto: "Transferencia", icono: "📲" },
];

/** Avisa cuando el celular pierde o recupera internet. */
function suscribirConexion(alCambiar: () => void) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

const cantidadTexto = (l: LineaCarrito) =>
  esGranel(l.producto)
    ? `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(l.cantidad)} ${l.producto.unidad === "kg" ? "kg" : "L"}`
    : String(l.cantidad);

export function Caja({ empresaId, esDemo, esDueno, productos, masVendidos, vendedores }: Props) {
  const claveVendedor = `rh-caja-vendedor-${empresaId}`;
  const [vendedor, setVendedor] = useState<Vendedor | null | undefined>(undefined); // undefined = todavía no se sabe
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [texto, setTexto] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [granel, setGranel] = useState<ProductoCaja | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const enLinea = useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
  const [pendientes, setPendientes] = useState(0);
  const buscador = useRef<HTMLInputElement>(null);

  // Vendedor elegido en este celular (se mantiene si se recarga la página).
  useEffect(() => {
    let guardado: string | null = null;
    try {
      guardado = sessionStorage.getItem(claveVendedor);
    } catch {
      /* sin almacenamiento: se pide de nuevo */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de sessionStorage al abrir la caja
    setVendedor(guardado ? (JSON.parse(guardado) as Vendedor) : vendedores.length ? undefined : null);
  }, [claveVendedor, vendedores.length]);

  const elegirVendedor = (v: Vendedor | null) => {
    setVendedor(v);
    try {
      if (v) sessionStorage.setItem(claveVendedor, JSON.stringify(v));
      else sessionStorage.setItem(claveVendedor, JSON.stringify({ id: null, nombre: "Dueño" }));
    } catch {
      /* sin almacenamiento: se pide de nuevo al recargar */
    }
  };

  // Enviar ventas pendientes: al abrir, al volver internet y cada 30 segundos.
  const enviarPendientes = useCallback(async () => {
    if (esDemo) return;
    try {
      const resumen = await sincronizar(almacenNavegador, enviarVenta);
      if (resumen.enviadas > 0) void avisarPendientes().catch(() => {}); // "se está acabando" al celular
      setPendientes(resumen.pendientes);
      if (resumen.rechazadas.length) {
        setMensaje({ tipo: "error", texto: "Una venta no se pudo guardar. Escríbenos por WhatsApp para revisarla." });
      }
    } catch {
      /* IndexedDB no disponible: las ventas se envían directo */
    }
  }, [esDemo]);

  useEffect(() => {
    registrarModoSinInternet();
    const alVolver = () => void enviarPendientes();
    const primera = setTimeout(alVolver, 0); // apenas abre la caja, envía lo que haya quedado pendiente
    window.addEventListener("online", alVolver);
    const intervalo = setInterval(alVolver, 30_000);
    return () => {
      clearTimeout(primera);
      window.removeEventListener("online", alVolver);
      clearInterval(intervalo);
    };
  }, [enviarPendientes]);

  const avisar = (m: Mensaje) => {
    setMensaje(m);
    if (m?.tipo === "exito") setTimeout(() => setMensaje((actual) => (actual === m ? null : actual)), 4000);
  };

  const sumar = (producto: ProductoCaja, cantidad = 1) => {
    if (esGranel(producto) && cantidad === 1) return setGranel(producto);
    setCarrito((c) => agregar(c, producto, cantidad));
    setMensaje(null);
  };

  /** Lector USB/Bluetooth: escribe el código y aprieta "Enter". También sirve escribir y elegir. */
  const alEnviarBuscador = (evento: React.FormEvent) => {
    evento.preventDefault();
    const porCodigo = buscarPorCodigo(productos, texto);
    const resultados = buscar(productos, texto);
    const elegido = porCodigo ?? (resultados.length === 1 ? resultados[0] : null);
    if (elegido) {
      sumar(elegido);
      setTexto("");
    } else if (/^\d{6,14}$/.test(texto.trim())) {
      avisar({ tipo: "error", texto: `No encontramos el código ${texto.trim()}. Agrégalo en Mi stock o elige el producto a mano.` });
      setTexto("");
    }
    buscador.current?.focus();
  };

  const alEscanear = (codigo: string) => {
    const producto = buscarPorCodigo(productos, codigo);
    if (producto) {
      sumar(producto);
      return producto.nombre;
    }
    avisar({ tipo: "error", texto: `No encontramos el código ${codigo}.` });
    return null;
  };

  const cobrar = async (medio: MedioPago) => {
    const total = totalCarrito(carrito);
    if (esDemo) {
      setCarrito([]);
      setCobrando(false);
      avisar({ tipo: "exito", texto: `✅ Así se guarda una venta de ${formatearPesos(total)}. (En el negocio de ejemplo no se guarda de verdad.)` });
      return;
    }
    setGuardando(true);
    const venta: VentaPendiente = {
      id_local: crypto.randomUUID(),
      vendedor_id: vendedor?.id ?? null,
      fecha: new Date().toISOString(),
      medio_pago: medio,
      items: carrito.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad, precio_unitario: l.producto.precio })),
    };
    try {
      await encolar(almacenNavegador, venta); // primero en el celular: así nunca se pierde
      const resumen = await sincronizar(almacenNavegador, enviarVenta);
      if (resumen.enviadas > 0) void avisarPendientes().catch(() => {}); // "se está acabando" al celular
      setPendientes(resumen.pendientes);
      avisar({
        tipo: "exito",
        texto:
          resumen.pendientes === 0
            ? `✅ Venta guardada: ${formatearPesos(total)}`
            : `✅ Venta guardada en este celular (${formatearPesos(total)}). Se enviará sola cuando vuelva internet.`,
      });
    } catch {
      // Sin IndexedDB (modo privado del navegador): se envía directo.
      const resultado = await enviarVenta(venta).catch(() => "sin_conexion" as const);
      if (resultado !== "ok") {
        setGuardando(false);
        return avisar({ tipo: "error", texto: "No pudimos guardar la venta. Revisa tu internet e intenta de nuevo." });
      }
      avisar({ tipo: "exito", texto: `✅ Venta guardada: ${formatearPesos(total)}` });
    }
    setCarrito([]);
    setCobrando(false);
    setGuardando(false);
    buscador.current?.focus();
  };

  // ---------------------------------------------------------------- pantallas

  if (vendedor === undefined && vendedores.length > 0) {
    return <ElegirVendedor vendedores={vendedores} esDueno={esDueno} alElegir={elegirVendedor} />;
  }

  const total = totalCarrito(carrito);
  const resultados = buscar(productos, texto);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-3 pb-44">
      <div className="flex items-center justify-between gap-3">
        <Link href="/inicio" className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
          <span aria-hidden="true" className="text-2xl leading-none">
            ←
          </span>
          Volver
        </Link>
        {vendedores.length > 0 && (
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(claveVendedor);
              } catch {}
              setVendedor(undefined);
            }}
            className="min-h-12 rounded-xl px-3 text-lg font-semibold text-texto hover:bg-marca-claro"
          >
            🧑 {vendedor?.nombre ?? "Dueño"} · <span className="text-marca underline">Cambiar</span>
          </button>
        )}
      </div>

      <div
        role="status"
        className={`mt-2 rounded-xl px-3 py-2 text-base font-semibold ${enLinea ? "bg-green-50 text-green-800" : "bg-amber-100 text-texto"}`}
      >
        {enLinea ? "🟢 Con internet" : "🟠 Sin internet: las ventas se guardan en este celular"}
        {pendientes > 0 && ` · ${pendientes} ${pendientes === 1 ? "venta" : "ventas"} por enviar`}
      </div>

      <form onSubmit={alEnviarBuscador} className="mt-3 flex gap-2">
        <label htmlFor="buscador" className="sr-only">
          Buscar o escanear producto
        </label>
        <input
          ref={buscador}
          id="buscador"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="🔍 Buscar producto"
          autoComplete="off"
          enterKeyHint="go"
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-gray-300 bg-fondo px-4 text-xl focus:border-marca focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setEscaneando(true)}
          className="flex min-h-14 shrink-0 items-center gap-2 rounded-xl bg-marca px-4 text-lg font-semibold text-white hover:bg-marca-oscuro"
        >
          <span aria-hidden="true">📷</span> Escanear
        </button>
      </form>

      {texto && (
        <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm ring-1 ring-black/5">
          {resultados.length === 0 && <li className="px-4 py-3 text-lg text-texto-suave">No encontramos “{texto}”.</li>}
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  sumar(p);
                  setTexto("");
                }}
                className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-marca-claro"
              >
                <span aria-hidden="true">{p.icono}</span>
                <span className="flex-1 text-lg">{p.nombre}</span>
                <span className="text-lg font-semibold">{formatearPesos(p.precio)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensaje && (
        <p
          role={mensaje.tipo === "error" ? "alert" : "status"}
          className={`mt-3 rounded-xl border-l-4 p-3 text-lg ${mensaje.tipo === "error" ? "border-falta bg-red-50" : "border-ok bg-green-50"}`}
        >
          {mensaje.tipo === "error" ? "⚠️ " : ""}
          {mensaje.texto}
        </p>
      )}

      {carrito.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xl font-bold text-texto">Esta venta</h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm ring-1 ring-black/5">
            {carrito.map((l) => (
              <li key={l.producto.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold text-texto">{l.producto.nombre}</span>
                  <span className="text-base text-texto-suave">{formatearPesos(totalLinea(l))}</span>
                </span>
                {esGranel(l.producto) ? (
                  <>
                    <span className="text-lg font-semibold">{cantidadTexto(l)}</span>
                    <button
                      type="button"
                      onClick={() => setCarrito((c) => cambiarCantidad(c, l.producto.id, 0))}
                      aria-label={`Quitar ${l.producto.nombre}`}
                      className="size-12 rounded-xl bg-fondo-suave text-xl"
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCarrito((c) => cambiarCantidad(c, l.producto.id, l.cantidad - 1))}
                      aria-label={`Uno menos de ${l.producto.nombre}`}
                      className="size-12 rounded-xl bg-fondo-suave text-2xl font-bold"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-xl font-bold">{cantidadTexto(l)}</span>
                    <button
                      type="button"
                      onClick={() => setCarrito((c) => agregar(c, l.producto, 1))}
                      aria-label={`Uno más de ${l.producto.nombre}`}
                      className="size-12 rounded-xl bg-fondo-suave text-2xl font-bold"
                    >
                      +
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-xl font-bold text-texto">Más vendidos</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {masVendidos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => sumar(p)}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-fondo p-2 text-center shadow-sm ring-1 ring-black/5 active:bg-marca-claro"
            >
              <span aria-hidden="true" className="text-3xl leading-none">
                {p.icono}
              </span>
              <span className="text-base leading-tight font-semibold text-texto">{p.nombre}</span>
              <span className="text-base text-texto-suave">
                {formatearPesos(p.precio)}
                {esGranel(p) ? (p.unidad === "kg" ? "/kg" : "/L") : ""}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-lg">
        <Link href="/vender/cierre" className="inline-flex min-h-12 items-center gap-2 font-semibold text-marca underline">
          <span aria-hidden="true">🧾</span> Cierre de caja
        </Link>
        <a
          href={enlaceWhatsApp(MENSAJES_WHATSAPP.ayuda)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 font-semibold text-marca underline"
        >
          <span aria-hidden="true">💬</span> Ayuda por WhatsApp
        </a>
      </div>

      {/* Barra fija para cobrar (tapa la de ayuda; la ayuda queda arriba) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-fondo pb-[env(safe-area-inset-bottom)]" data-fijo-abajo>
        <div className="mx-auto flex w-full max-w-xl gap-2 px-4 py-3">
          {carrito.length > 0 && (
            <button
              type="button"
              onClick={() => setCarrito([])}
              className="min-h-16 rounded-2xl border-2 border-gray-300 px-4 text-lg font-semibold text-texto-suave"
            >
              Vaciar
            </button>
          )}
          <button
            type="button"
            disabled={carrito.length === 0}
            onClick={() => setCobrando(true)}
            className="flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-marca text-2xl font-bold text-white shadow-sm disabled:opacity-50"
          >
            <span aria-hidden="true">💰</span>
            {carrito.length ? `Cobrar ${formatearPesos(total)}` : "Cobrar"}
          </button>
        </div>
      </div>

      {cobrando && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-cobrar">
          <div className="w-full max-w-xl rounded-t-3xl bg-fondo p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
            <p id="titulo-cobrar" className="text-center text-lg text-texto-suave">
              ¿Cómo paga?
            </p>
            <p className="text-center font-titulo text-5xl font-bold text-texto">{formatearPesos(total)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {MEDIOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  disabled={guardando}
                  onClick={() => void cobrar(m.valor)}
                  className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-marca text-xl font-bold text-white hover:bg-marca-oscuro disabled:opacity-60"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {m.icono}
                  </span>
                  {m.texto}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCobrando(false)}
              className="mt-4 min-h-14 w-full rounded-2xl border-2 border-gray-300 text-lg font-semibold text-texto"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {granel && (
        <Granel
          producto={granel}
          alCerrar={() => setGranel(null)}
          alAgregar={(cantidad) => {
            setCarrito((c) => agregar(c, granel, cantidad));
            setGranel(null);
          }}
        />
      )}

      {escaneando && <Escaner alLeer={alEscanear} alCerrar={() => setEscaneando(false)} />}
    </main>
  );
}
