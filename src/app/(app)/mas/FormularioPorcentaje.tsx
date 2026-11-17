"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import type { EstadoAjuste } from "./acciones";

type Props = {
  etiqueta: string;
  ayuda: string;
  nombre: string;
  valorInicial: number;
  accion: (estado: EstadoAjuste, formData: FormData) => Promise<EstadoAjuste>;
};

/** Un solo dato (un porcentaje) y "Guardar". */
export function FormularioPorcentaje({ etiqueta, ayuda, nombre, valorInicial, accion }: Props) {
  const [estado, enviar, guardando] = useActionState(accion, {});
  return (
    <form action={enviar} className="space-y-6">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Campo
        etiqueta={etiqueta}
        ayuda={ayuda}
        name={nombre}
        inputMode="decimal"
        defaultValue={String(valorInicial).replace(".", ",")}
        autoComplete="off"
      />
      <Boton type="submit" icono="💾" cargando={guardando}>
        Guardar
      </Boton>
    </form>
  );
}
