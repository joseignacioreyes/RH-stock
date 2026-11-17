"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { MOTIVOS_SALIDA } from "@/lib/esquemas-productos";
import { registrarSalida } from "../../../acciones";

type Props = { productoId: string; unidad: string; permiteDecimales: boolean };

export function FormularioSalida({ productoId, unidad, permiteDecimales }: Props) {
  const [estado, accion, guardando] = useActionState(registrarSalida.bind(null, productoId), {});
  const [motivo, setMotivo] = useState<string>("");

  return (
    <form action={accion} className="space-y-6">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}

      <fieldset>
        <legend className="text-lg font-semibold text-texto">Elige una opción</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {MOTIVOS_SALIDA.map((m) => (
            <label
              key={m.valor}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center text-lg font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-texto ${
                motivo === m.valor ? "border-marca bg-marca-claro text-texto" : "border-gray-300 bg-fondo text-texto"
              }`}
            >
              <input type="radio" name="motivo" value={m.valor} className="sr-only" onChange={() => setMotivo(m.valor)} />
              <span aria-hidden="true" className="text-3xl">
                {m.icono}
              </span>
              {m.texto}
            </label>
          ))}
        </div>
        {estado.errores?.motivo && <p className="mt-2 text-base font-medium text-falta">⚠️ {estado.errores.motivo}</p>}
      </fieldset>

      <Campo
        etiqueta={`¿Cuánto? (en ${unidad})`}
        ayuda={permiteDecimales ? "Puedes usar coma: 1,5" : undefined}
        name="cantidad"
        inputMode={permiteDecimales ? "decimal" : "numeric"}
        autoComplete="off"
        error={estado.errores?.cantidad}
      />

      <Boton type="submit" icono="💾" cargando={guardando}>
        Guardar
      </Boton>
    </form>
  );
}
