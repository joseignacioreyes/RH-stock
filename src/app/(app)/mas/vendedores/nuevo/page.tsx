"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Pantalla } from "@/components/ui/Pantalla";
import { agregarVendedor } from "../acciones";

export default function PaginaNuevoVendedor() {
  const [estado, accion, guardando] = useActionState(agregarVendedor, {});
  return (
    <Pantalla titulo="Agregar vendedor" volverA="/mas/vendedores">
      <form action={accion} className="space-y-6">
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        <Campo etiqueta="Nombre" ayuda="Como lo van a ver en la caja. Ejemplo: Carla" name="nombre" autoComplete="off" error={estado.errores?.nombre} />
        <Campo etiqueta="PIN (4 números)" ayuda="Para entrar a la caja. No uses 1234." name="pin" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" error={estado.errores?.pin} />
        <Campo etiqueta="Repite el PIN" name="repetir" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" error={estado.errores?.repetir} />
        <Boton type="submit" icono="💾" cargando={guardando}>
          Guardar
        </Boton>
      </form>
    </Pantalla>
  );
}
