"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Pantalla } from "@/components/ui/Pantalla";
import { MINIMO_CLAVE } from "@/lib/cuentas";
import { guardarNuevaClave } from "./acciones";

export default function PaginaNuevaClave() {
  const [estado, accion, guardando] = useActionState(guardarNuevaClave, {});

  return (
    <Pantalla titulo="Elige tu clave nueva">
      <form action={accion} className="space-y-6">
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        <Campo
          etiqueta="Clave nueva"
          ayuda={`Mínimo ${MINIMO_CLAVE} letras o números. Anótala en un lugar seguro.`}
          type="password"
          name="clave"
          autoComplete="new-password"
          required
          error={estado.errores?.clave}
        />
        <Campo
          etiqueta="Repite la clave"
          type="password"
          name="repetir"
          autoComplete="new-password"
          required
          error={estado.errores?.repetir}
        />
        <Boton type="submit" icono="💾" cargando={guardando}>
          Guardar
        </Boton>
      </form>
    </Pantalla>
  );
}
