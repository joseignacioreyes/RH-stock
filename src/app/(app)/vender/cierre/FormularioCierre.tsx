"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { formatearPesos, leerNumero } from "@/lib/formato";
import { cerrarCaja } from "./acciones";

type Props = { fecha: string; efectivoSistema: number; contadoAnterior: number | null; esDemo: boolean };

export function FormularioCierre({ fecha, efectivoSistema, contadoAnterior, esDemo }: Props) {
  const [estado, accion, guardando] = useActionState(cerrarCaja.bind(null, fecha), {});
  const [texto, setTexto] = useState(contadoAnterior != null ? String(contadoAnterior) : "");
  const contado = leerNumero(texto);
  const diferencia = contado != null ? Math.round(contado) - efectivoSistema : null;

  return (
    <form action={accion} className="space-y-4">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <p className="text-lg text-texto">
        En efectivo debería haber <strong>{formatearPesos(efectivoSistema)}</strong>.
      </p>
      <Campo
        etiqueta="¿Cuánto efectivo contaste?"
        ayuda="Cuenta los billetes y monedas de la caja (sin el sencillo con que partiste)."
        name="contado"
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
      />
      {diferencia !== null && (
        <p
          role="status"
          className={`rounded-xl p-4 text-xl font-semibold ${diferencia === 0 ? "bg-green-50 text-green-800" : diferencia < 0 ? "bg-red-50 text-falta" : "bg-amber-50 text-texto"}`}
        >
          {diferencia === 0 ? "✅ Cuadra perfecto" : diferencia < 0 ? `🔴 Faltan ${formatearPesos(-diferencia)}` : `🟡 Sobran ${formatearPesos(diferencia)}`}
        </p>
      )}
      <Boton type="submit" icono="💾" cargando={guardando} disabled={contado == null}>
        Guardar cierre
      </Boton>
      {esDemo && <p className="text-base text-texto-suave">💡 En el negocio de ejemplo no se guarda el cierre.</p>}
    </form>
  );
}
