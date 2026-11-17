import { formatearDia, formatearFecha, formatearPesos } from "@/lib/formato";
import type { LecturaComprobante } from "@/lib/lector-comprobantes/esquema";
import { montoDistinto, MOTIVOS_RECHAZO, nombrePeriodo } from "@/lib/suscripcion";
import { confirmarPago, rechazarPago } from "./acciones";

export type PagoParaRevisar = {
  id: string;
  negocio: string;
  periodo: string;
  monto: number;
  informadoEn: string | null;
  leido: LecturaComprobante | null;
  urlComprobante: string | null;
  esPdf: boolean;
};

/** Tarjeta de un pago informado: lo que leyó la IA, el comprobante y los botones Confirmar / Rechazar. */
export function PagoPorRevisar({ pago }: { pago: PagoParaRevisar }) {
  const distinto = montoDistinto(pago.leido?.monto, pago.monto);
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-fondo p-5 shadow-sm md:flex-row">
      <div className="shrink-0 md:w-44">
        {pago.urlComprobante && !pago.esPdf ? (
          <a href={pago.urlComprobante} target="_blank" rel="noopener noreferrer" className="block" title="Ver comprobante en grande">
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y temporal de Supabase */}
            <img src={pago.urlComprobante} alt={`Comprobante de ${pago.negocio}`} className="h-44 w-full rounded-xl bg-fondo-suave object-contain ring-1 ring-black/5" />
          </a>
        ) : (
          <div className="flex h-44 items-center justify-center rounded-xl bg-fondo-suave text-6xl ring-1 ring-black/5" aria-hidden="true">
            📄
          </div>
        )}
        {pago.urlComprobante && (
          <a
            href={pago.urlComprobante}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl text-base font-semibold text-marca hover:bg-marca-claro"
          >
            🔍 Ver comprobante
          </a>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-bold text-texto">{pago.negocio}</h3>
        <p className="text-lg text-texto">
          Pago de <strong>{nombrePeriodo(pago.periodo)}</strong> · plan {formatearPesos(pago.monto)}
        </p>
        {pago.informadoEn && <p className="text-base text-texto-suave">Enviado el {formatearFecha(pago.informadoEn)}</p>}

        <div className={`mt-3 rounded-xl p-3 text-base ${distinto ? "bg-red-50 ring-1 ring-falta" : "bg-fondo-suave"}`}>
          {pago.leido ? (
            <>
              <p className="font-semibold text-texto">Lo que leyó la IA del comprobante:</p>
              <p className="text-texto">
                {pago.leido.monto != null ? formatearPesos(pago.leido.monto) : "monto sin leer"}
                {pago.leido.fecha ? ` · ${formatearDia(pago.leido.fecha)}` : ""}
                {pago.leido.banco ? ` · ${pago.leido.banco}` : ""}
                {pago.leido.titular ? ` · ${pago.leido.titular}` : ""}
                {pago.leido.operacion ? ` · operación ${pago.leido.operacion}` : ""}
              </p>
              {distinto && <p className="mt-1 font-semibold text-falta">⚠️ El monto no coincide con el plan.</p>}
            </>
          ) : (
            <p className="text-texto">La IA no pudo leer el comprobante: míralo antes de confirmar.</p>
          )}
        </div>
        <p className="mt-2 text-base text-texto-suave">Antes de confirmar, revisa en tu banco que la transferencia llegó.</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <form action={confirmarPago.bind(null, pago.id)} className="sm:w-64">
            <button
              type="submit"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-marca px-5 text-xl font-semibold whitespace-nowrap text-white hover:bg-marca-oscuro"
            >
              <span aria-hidden="true">✅</span> Confirmar pago
            </button>
          </form>
          <details className="flex-1 rounded-2xl ring-1 ring-black/10">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-center gap-2 px-5 text-xl font-semibold text-falta [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true">❌</span> Rechazar
            </summary>
            <form action={rechazarPago.bind(null, pago.id)} className="space-y-2 px-4 pb-4">
              <p className="text-base font-semibold text-texto">¿Por qué? (el dueño lo verá)</p>
              {MOTIVOS_RECHAZO.map((motivo, i) => (
                <label key={motivo} className="flex min-h-11 items-center gap-3 text-base">
                  <input type="radio" name="motivo" value={motivo} defaultChecked={i === 0} className="size-5 accent-marca" />
                  {motivo}
                </label>
              ))}
              <label className="flex min-h-11 items-center gap-3 text-base">
                <input type="radio" name="motivo" value="otro" className="size-5 accent-marca" />
                Otro:
                <input name="otro" maxLength={200} className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-gray-300 px-3" aria-label="Otro motivo" />
              </label>
              <button
                type="submit"
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-falta text-lg font-semibold text-falta hover:bg-red-50"
              >
                Rechazar este pago
              </button>
            </form>
          </details>
        </div>
      </div>
    </article>
  );
}
