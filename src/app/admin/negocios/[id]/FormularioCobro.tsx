"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { configurarCobro } from "../../acciones";

type Props = { empresaId: string; plan: "piloto" | "mensual"; precio: number; vencimiento: string; sugerido: string };

/** Cambiar el plan: piloto gratis, o mensual desde un primer pago (el día de esa fecha es el día de pago). */
export function FormularioCobro({ empresaId, plan: planInicial, precio, vencimiento, sugerido }: Props) {
  const [estado, accion, guardando] = useActionState(configurarCobro.bind(null, empresaId), {});
  const [plan, setPlan] = useState(planInicial);

  return (
    <form action={accion} className="space-y-4 rounded-2xl bg-fondo p-5 shadow-sm">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <fieldset>
        <legend className="text-lg font-semibold text-texto">Plan</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["piloto", "🎁 Piloto gratis", "No paga nada."],
              ["mensual", "💳 Mensual", "Paga cada mes por transferencia."],
            ] as const
          ).map(([valor, titulo, detalle]) => (
            <label
              key={valor}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl p-3 ring-2 ${plan === valor ? "bg-marca-claro ring-marca" : "ring-gray-200"}`}
            >
              <input type="radio" name="plan" value={valor} checked={plan === valor} onChange={() => setPlan(valor)} className="size-5 accent-marca" />
              <span>
                <span className="block text-lg font-semibold">{titulo}</span>
                <span className="block text-base text-texto-suave">{detalle}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {plan === "mensual" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-lg font-semibold text-texto">Precio al mes (con IVA)</span>
            <input
              name="precio"
              inputMode="numeric"
              defaultValue={precio}
              required
              className="mt-1 block min-h-14 w-full rounded-xl border-2 border-gray-300 px-4 text-xl focus:border-marca focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-lg font-semibold text-texto">{planInicial === "mensual" ? "Próximo pago" : "Primer pago"}</span>
            <input
              type="date"
              name="vencimiento"
              defaultValue={vencimiento || sugerido}
              required
              className="mt-1 block min-h-14 w-full rounded-xl border-2 border-gray-300 px-4 text-xl focus:border-marca focus:outline-none"
            />
            <span className="mt-1 block text-base text-texto-suave">Ese día del mes será su día de pago (del 1 al 28).</span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-marca px-5 text-xl font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60 sm:w-auto"
      >
        <span aria-hidden="true">💾</span> {guardando ? "Guardando…" : "Guardar plan"}
      </button>
    </form>
  );
}
