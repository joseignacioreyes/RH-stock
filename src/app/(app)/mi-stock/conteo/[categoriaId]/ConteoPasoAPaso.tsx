"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { leerNumero } from "@/lib/formato";
import { diferenciaConteo } from "@/lib/inventario";
import { guardarConteo } from "../../acciones";

type Producto = { id: string; nombre: string; stock: number; stockTexto: string; unidad: string; permiteDecimales: boolean };

const formatear = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);

/** Conteo de una categoría, un producto por pantalla (nunca más de un dato a la vez). */
export function ConteoPasoAPaso({ categoria, productos }: { categoria: string; productos: Producto[] }) {
  const [indice, setIndice] = useState(0);
  const [contados, setContados] = useState<Record<string, number>>({});
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  const terminado = indice >= productos.length;
  const actual = productos[indice];

  const anotar = (cantidad: number) => {
    setContados((c) => ({ ...c, [actual.id]: cantidad }));
    setTexto(productos[indice + 1] && contados[productos[indice + 1].id] !== undefined ? formatear(contados[productos[indice + 1].id]) : "");
    setError(null);
    setIndice(indice + 1);
    window.scrollTo({ top: 0 });
  };

  const siguiente = (evento: React.FormEvent) => {
    evento.preventDefault();
    const valor = leerNumero(texto);
    if (valor === null || valor < 0) return setError("Escribe cuántos hay con números, por ejemplo 12 o 1,5.");
    if (!actual.permiteDecimales && !Number.isInteger(valor)) return setError("Este producto se cuenta por unidad: escribe un número entero.");
    anotar(valor);
  };

  const atras = () => {
    const anterior = productos[indice - 1];
    setTexto(contados[anterior.id] !== undefined ? formatear(contados[anterior.id]) : "");
    setError(null);
    setIndice(indice - 1);
  };

  const diferencias = productos
    .map((p) => ({ ...p, diferencia: diferenciaConteo(p.stock, contados[p.id] ?? p.stock) }))
    .filter((p) => p.diferencia !== 0);

  const guardar = () =>
    iniciar(async () => {
      const resultado = await guardarConteo(productos.map((p) => ({ productoId: p.id, cantidadReal: contados[p.id] ?? p.stock })));
      if (resultado?.error) setError(resultado.error);
    });

  const volver =
    indice === 0 ? (
      <Link href="/mi-stock/conteo" className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
        <span aria-hidden="true" className="text-2xl leading-none">
          ←
        </span>
        Volver
      </Link>
    ) : (
      <button type="button" onClick={atras} className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
        <span aria-hidden="true" className="text-2xl leading-none">
          ←
        </span>
        Volver
      </button>
    );

  if (terminado) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
        {volver}
        <p className="mt-4 text-lg font-semibold text-marca">{categoria}</p>
        <h1 className="mt-1 text-3xl leading-tight font-bold text-texto">
          {diferencias.length === 0 ? "¡Todo cuadra!" : `Encontraste ${diferencias.length} ${diferencias.length === 1 ? "diferencia" : "diferencias"}`}
        </h1>
        {error && (
          <div className="mt-6">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}
        {diferencias.length > 0 && (
          <ul className="mt-6 space-y-3">
            {diferencias.map((p) => (
              <li key={p.id} className="rounded-2xl bg-fondo p-4 shadow-sm">
                <p className="text-lg font-semibold text-texto">{p.nombre}</p>
                <p className="text-lg text-texto-suave">
                  La app decía {p.stockTexto}, contaste {formatear(contados[p.id])} {p.unidad}.{" "}
                  <strong className={p.diferencia < 0 ? "text-falta" : "text-marca"}>
                    ({p.diferencia > 0 ? "+" : "−"}
                    {formatear(Math.abs(p.diferencia))})
                  </strong>
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <Boton type="button" onClick={guardar} cargando={guardando} icono="💾">
            {diferencias.length === 0 ? "Listo" : "Guardar conteo"}
          </Boton>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      {volver}
      <p className="mt-4 text-lg font-semibold text-marca">
        {categoria} · Producto {indice + 1} de {productos.length}
      </p>
      <div className="mt-2 h-2 rounded-full bg-gray-300" aria-hidden="true">
        <div className="h-2 rounded-full bg-marca" style={{ width: `${(indice / productos.length) * 100}%` }} />
      </div>
      <h1 className="mt-4 text-3xl leading-tight font-bold text-texto">{actual.nombre}</h1>

      <form onSubmit={siguiente} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="contado" className="block text-xl font-semibold text-texto">
            ¿Cuántos hay? ({actual.unidad})
          </label>
          <input
            id="contado"
            key={actual.id}
            autoFocus
            inputMode={actual.permiteDecimales ? "decimal" : "numeric"}
            autoComplete="off"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            className={`mt-2 block min-h-16 w-full rounded-xl border-2 bg-fondo px-4 text-center text-3xl font-semibold text-texto focus:border-marca focus:outline-none ${
              error ? "border-falta" : "border-gray-300"
            }`}
          />
          {error && <p className="mt-2 text-base font-medium text-falta">⚠️ {error}</p>}
        </div>
        <Boton type="submit" icono="➡️">
          {indice + 1 === productos.length ? "Terminar" : "Siguiente"}
        </Boton>
      </form>

      <button
        type="button"
        onClick={() => anotar(actual.stock)}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-marca bg-fondo px-4 text-lg font-semibold text-marca hover:bg-marca-claro"
      >
        <span aria-hidden="true">👍</span> Hay lo mismo que dice la app ({actual.stockTexto})
      </button>
    </main>
  );
}
