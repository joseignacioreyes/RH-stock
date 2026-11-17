"use client";

import { useState } from "react";
import { cantidadDesdeMonto, type ProductoCaja } from "@/lib/caja/carrito";
import { formatearPesos, leerNumero } from "@/lib/formato";

type Props = { producto: ProductoCaja; alAgregar: (cantidad: number) => void; alCerrar: () => void };

/** Productos a granel: "$1.000 de pan" o "medio kilo". */
export function Granel({ producto, alAgregar, alCerrar }: Props) {
  const [modo, setModo] = useState<"pesos" | "kilos">("pesos");
  const [texto, setTexto] = useState("");
  const unidad = producto.unidad === "kg" ? "kg" : "L";
  const valor = leerNumero(texto) ?? 0;
  const cantidad = modo === "pesos" ? cantidadDesdeMonto(valor, producto.precio) : valor;
  const rapidos = modo === "pesos" ? [500, 1000, 2000] : [0.25, 0.5, 1];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-granel">
      <div className="w-full max-w-xl rounded-t-3xl bg-fondo p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p id="titulo-granel" className="font-titulo text-2xl font-bold text-texto">
          {producto.icono} {producto.nombre}
        </p>
        <p className="text-lg text-texto-suave">
          {formatearPesos(producto.precio)} el {unidad === "kg" ? "kilo" : "litro"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-fondo-suave p-1" role="tablist">
          {(["pesos", "kilos"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => {
                setModo(m);
                setTexto("");
              }}
              className={`min-h-12 rounded-xl text-lg font-semibold ${modo === m ? "bg-fondo text-marca shadow-sm" : "text-texto-suave"}`}
            >
              {m === "pesos" ? "Por pesos ($)" : `Por ${unidad === "kg" ? "kilos" : "litros"}`}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {rapidos.map((r) => (
            <button key={r} type="button" onClick={() => alAgregar(modo === "pesos" ? cantidadDesdeMonto(r, producto.precio) : r)} className="min-h-14 rounded-2xl border-2 border-marca text-xl font-bold text-marca">
              {modo === "pesos" ? formatearPesos(r) : `${String(r).replace(".", ",")} ${unidad}`}
            </button>
          ))}
        </div>

        <label htmlFor="granel-otro" className="mt-4 block text-lg font-semibold text-texto">
          Otra cantidad {modo === "pesos" ? "($)" : `(${unidad})`}
        </label>
        <input
          id="granel-otro"
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="mt-2 block min-h-14 w-full rounded-xl border-2 border-gray-300 bg-fondo px-4 text-2xl focus:border-marca focus:outline-none"
        />
        {cantidad > 0 && (
          <p className="mt-2 text-lg text-texto-suave">
            = {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(cantidad)} {unidad} · {formatearPesos(Math.round(cantidad * producto.precio))}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={alCerrar} className="min-h-14 rounded-2xl border-2 border-gray-300 text-lg font-semibold">
            Volver
          </button>
          <button
            type="button"
            disabled={cantidad <= 0}
            onClick={() => alAgregar(cantidad)}
            className="min-h-14 rounded-2xl bg-marca text-lg font-bold text-white disabled:opacity-50"
          >
            ✅ Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
