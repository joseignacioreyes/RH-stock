"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { correoInterno, erroresPorCampo, esquemaEntrar } from "@/lib/cuentas";
import { formatearRutMientrasEscribe } from "@/lib/rut";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

/**
 * El inicio de sesión se hace desde el navegador para que el límite de intentos
 * de Supabase cuente por cada celular (y no por el servidor, que es uno solo).
 */
export function FormularioEntrar() {
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [clave, setClave] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    const validacion = esquemaEntrar.safeParse({ rut, clave });
    if (!validacion.success) {
      setErrores(erroresPorCampo(validacion.error));
      return;
    }
    setErrores({});
    setCargando(true);

    try {
      const supabase = crearClienteNavegador();
      const { error: errorEntrar } = await supabase.auth.signInWithPassword({
        email: correoInterno(validacion.data.rut),
        password: validacion.data.clave,
      });

      if (errorEntrar) {
        setCargando(false);
        if (errorEntrar.code === "over_request_rate_limit" || errorEntrar.status === 429) {
          setError("Hiciste muchos intentos seguidos. Espera 5 minutos y vuelve a intentar.");
        } else if (errorEntrar.code === "invalid_credentials") {
          setError("El RUT o la clave no son correctos. Revisa e intenta de nuevo.");
        } else {
          setError("No pudimos entrar. Revisa tu conexión a internet e intenta de nuevo.");
        }
        return;
      }

      router.replace("/inicio");
      router.refresh();
    } catch {
      setCargando(false);
      setError("No pudimos conectarnos. Revisa tu conexión a internet e intenta de nuevo.");
    }
  }

  return (
    <form onSubmit={entrar} noValidate className="space-y-6">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Campo
        etiqueta="Tu RUT"
        ayuda="Ejemplo: 12.345.678-5"
        inputMode="text"
        autoComplete="username"
        value={rut}
        onChange={(e) => {
          setRut(formatearRutMientrasEscribe(e.target.value));
          setErrores(({ rut: _quitado, ...resto }) => resto);
        }}
        error={errores.rut}
      />
      <Campo
        etiqueta="Tu clave"
        type="password"
        autoComplete="current-password"
        value={clave}
        onChange={(e) => {
          setClave(e.target.value);
          setErrores(({ clave: _quitado, ...resto }) => resto);
        }}
        error={errores.clave}
      />
      <Boton type="submit" icono="🔑" cargando={cargando}>
        Entrar
      </Boton>
    </form>
  );
}
