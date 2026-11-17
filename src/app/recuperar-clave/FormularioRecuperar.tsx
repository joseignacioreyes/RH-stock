"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { formatearRutMientrasEscribe } from "@/lib/rut";
import { pedirEnlaceClave } from "./acciones";

export function FormularioRecuperar() {
  const [estado, accion, enviando] = useActionState(pedirEnlaceClave, {});
  const [rut, setRut] = useState("");

  if (estado.enviado) {
    return (
      <Aviso tipo="exito">
        <p className="font-semibold">Revisa tu correo.</p>
        <p className="mt-1 text-base">
          Si tu RUT está registrado, te enviamos un enlace para elegir una clave nueva. Sirve por 1 hora. Si no lo ves, revisa la carpeta de
          spam o correo no deseado.
        </p>
      </Aviso>
    );
  }

  return (
    <form action={accion} className="space-y-5">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Campo
        etiqueta="Tu RUT"
        ayuda="Ejemplo: 12.345.678-5"
        name="rut"
        inputMode="text"
        autoComplete="username"
        value={rut}
        onChange={(e) => setRut(formatearRutMientrasEscribe(e.target.value))}
        required
      />
      <Boton type="submit" icono="📧" cargando={enviando}>
        Enviarme el enlace
      </Boton>
    </form>
  );
}
