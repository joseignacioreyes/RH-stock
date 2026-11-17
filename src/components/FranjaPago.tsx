import Link from "next/link";
import { formatearDia } from "@/lib/formato";
import type { Suscripcion } from "@/lib/suscripcion";
import { nombrePeriodo } from "@/lib/suscripcion";

type Props = { suscripcion: Suscripcion; esDueno: boolean };

/**
 * Franja arriba de todo cuando el pago está atrasado o la cuenta quedó solo para mirar.
 * (El "por vencer" se muestra solo en el inicio, para no molestar en cada pantalla.)
 */
export function FranjaPago({ suscripcion, esDueno }: Props) {
  const { estado, periodo, soloLecturaDesde, pagoEnRevision } = suscripcion;
  const mes = periodo ? nombrePeriodo(periodo) : "este mes";

  if (estado === "suspendido") {
    return (
      <div className="bg-falta text-white" data-franja-pago="suspendido">
        <div className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <p className="text-base font-semibold">
            <span aria-hidden="true">⏸️ </span>
            {esDueno
              ? `Tu cuenta está solo para mirar: falta el pago de ${mes}.`
              : "La app está solo para mirar por un pago atrasado. Avísale al dueño."}
          </p>
          {esDueno && (
            <Link href="/mas/mi-plan" className="flex min-h-11 items-center rounded-full bg-white px-4 text-base font-semibold text-falta hover:bg-red-50">
              Pagar ahora
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (estado === "atrasado" && esDueno && !pagoEnRevision) {
    return (
      <div className="bg-acento text-texto" data-franja-pago="atrasado">
        <div className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <p className="text-base font-semibold">
            <span aria-hidden="true">⚠️ </span>
            Tu pago de {mes} está atrasado.
            {soloLecturaDesde && ` Desde el ${formatearDia(soloLecturaDesde)} la app quedará solo para mirar.`}
          </p>
          <Link href="/mas/mi-plan" className="flex min-h-11 items-center rounded-full bg-texto px-4 text-base font-semibold text-white hover:bg-black">
            Pagar
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

/** En pantallas de registrar (vender, subir boleta…): explica por qué no se puede y qué hacer. */
export function AvisoSoloLectura({ esDueno }: { esDueno: boolean }) {
  return (
    <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm">
      <p aria-hidden="true" className="text-6xl">
        ⏸️
      </p>
      <p className="mt-4 text-xl font-semibold text-texto">Por ahora solo puedes mirar</p>
      <p className="mt-2 text-lg text-texto-suave">
        {esDueno
          ? "El pago de RH Stock está atrasado. Paga y sube el comprobante para volver a registrar compras y ventas. Tus datos están seguros."
          : "El pago de RH Stock está atrasado. Avísale al dueño del negocio. Tus datos están seguros."}
      </p>
      {esDueno && (
        <Link
          href="/mas/mi-plan"
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-marca px-5 text-xl font-semibold text-white hover:bg-marca-oscuro"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            💳
          </span>
          Pagar ahora
        </Link>
      )}
    </div>
  );
}
