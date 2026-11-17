"use client";

import Link from "next/link";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export type Vendedor = { id: string; nombre: string };

type Props = { vendedores: Vendedor[]; esDueno: boolean; alElegir: (v: Vendedor | null) => void };

/** "¿Quién vende?" y el PIN de 4 números (sin escribir RUT ni clave). */
export function ElegirVendedor({ vendedores, esDueno, alElegir }: Props) {
  const [elegido, setElegido] = useState<Vendedor | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);

  const teclear = async (digito: string) => {
    if (revisando || !elegido) return;
    const nuevo = (pin + digito).slice(0, 4);
    setPin(nuevo);
    setError(null);
    if (nuevo.length < 4) return;

    setRevisando(true);
    try {
      const { data, error: errorRed } = await crearClienteNavegador().rpc("verificar_pin", { p_vendedor_id: elegido.id, p_pin: nuevo });
      if (errorRed) throw errorRed;
      if (data === "ok") return alElegir(elegido);
      setError(data === "bloqueado" ? "Muchos intentos. Espera 5 minutos o pídele ayuda al dueño." : "Ese PIN no es correcto. Intenta de nuevo.");
    } catch {
      setError("Para revisar el PIN se necesita internet. Revisa la conexión.");
    } finally {
      setPin("");
      setRevisando(false);
    }
  };

  if (!elegido) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
        <Link href="/inicio" className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
          <span aria-hidden="true" className="text-2xl leading-none">
            ←
          </span>
          Volver
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-texto">¿Quién vende?</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {vendedores.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setElegido(v)}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-fondo text-2xl font-bold text-texto shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
            >
              <span aria-hidden="true" className="text-4xl">
                🧑
              </span>
              {v.nombre}
            </button>
          ))}
        </div>
        {esDueno && (
          <button type="button" onClick={() => alElegir(null)} className="mt-6 inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-marca underline">
            Vendo yo (dueño), sin PIN
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      <button
        type="button"
        onClick={() => {
          setElegido(null);
          setPin("");
          setError(null);
        }}
        className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          ←
        </span>
        Volver
      </button>
      <h1 className="mt-4 text-3xl font-bold text-texto">Hola, {elegido.nombre}</h1>
      <p className="mt-1 text-xl text-texto-suave">Escribe tu PIN de 4 números</p>

      <div className="mt-6 flex justify-center gap-4" aria-label={`${pin.length} de 4 números escritos`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-6 rounded-full border-2 border-marca ${i < pin.length ? "bg-marca" : "bg-fondo"}`} />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border-l-4 border-falta bg-red-50 p-3 text-center text-lg">
          ⚠️ {error}
        </p>
      )}

      <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => void teclear(d)} className="min-h-16 rounded-2xl bg-fondo text-3xl font-bold shadow-sm ring-1 ring-black/5 active:bg-marca-claro">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="min-h-16 rounded-2xl text-lg font-semibold text-texto-suave">
          ⌫ Borrar
        </button>
        <button type="button" onClick={() => void teclear("0")} className="min-h-16 rounded-2xl bg-fondo text-3xl font-bold shadow-sm ring-1 ring-black/5 active:bg-marca-claro">
          0
        </button>
      </div>
    </main>
  );
}
