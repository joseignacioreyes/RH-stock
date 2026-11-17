"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type FilaProducto = {
  id: string;
  nombre: string;
  codigoBarras: string | null;
  categoria: string;
  queda: string;
  seAcaba: boolean;
  sinMovimiento: boolean;
  margenBajo: boolean;
};

/** Quita tildes y mayúsculas para buscar "azucar" y encontrar "Azúcar". */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function ListaProductos({ filas, conBuscador }: { filas: FilaProducto[]; conBuscador: boolean }) {
  const [busqueda, setBusqueda] = useState("");

  const grupos = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const visibles = texto
      ? filas.filter((f) => normalizar(f.nombre).includes(texto) || f.codigoBarras?.includes(texto))
      : filas;
    const porCategoria = new Map<string, FilaProducto[]>();
    for (const fila of visibles) porCategoria.set(fila.categoria, [...(porCategoria.get(fila.categoria) ?? []), fila]);
    return [...porCategoria.entries()];
  }, [filas, busqueda]);

  return (
    <div>
      {conBuscador && (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-2xl">
            🔍
          </span>
          <label htmlFor="buscar" className="sr-only">
            Buscar producto
          </label>
          <input
            id="buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto"
            className="block min-h-14 w-full rounded-xl border-2 border-gray-300 bg-fondo pr-4 pl-14 text-xl placeholder:text-texto-suave/70 focus:border-marca focus:outline-none"
          />
        </div>
      )}

      {grupos.length === 0 && <p className="mt-6 text-center text-xl text-texto-suave">No encontramos “{busqueda}”.</p>}

      {grupos.map(([categoria, productos]) => (
        <section key={categoria} className="mt-6">
          <h2 className="text-lg font-semibold text-texto-suave">{categoria}</h2>
          <ul className="mt-2 space-y-2">
            {productos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/mi-stock/productos/${p.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-fondo px-4 py-3 shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
                >
                  <span className="flex-1">
                    <span className="block text-lg leading-snug font-semibold text-texto">{p.nombre}</span>
                    {(p.sinMovimiento || p.margenBajo) && (
                      <span className="text-base text-texto-suave">
                        {p.sinMovimiento ? "😴 Sin venta hace un mes" : "📉 Ganas poco"}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-base font-semibold whitespace-nowrap ${
                      p.seAcaba ? "bg-red-100 text-falta" : "bg-fondo-suave text-texto"
                    }`}
                  >
                    {p.seAcaba && <span aria-hidden="true">🔴 </span>}
                    {p.queda}
                  </span>
                  <span aria-hidden="true" className="text-xl text-texto-suave">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
