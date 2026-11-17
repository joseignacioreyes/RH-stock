"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo, Casilla } from "@/components/ui/Campo";
import { BotonVolver } from "@/components/ui/Pantalla";
import { erroresPorCampo, esquemaPaso1, esquemaPaso2, esquemaPaso3, MINIMO_CLAVE } from "@/lib/cuentas";
import { formatearRutMientrasEscribe } from "@/lib/rut";
import { registrar, type EstadoRegistro } from "./acciones";

type Paso = 1 | 2 | 3;

const TITULOS: Record<Paso, string> = {
  1: "Tus datos",
  2: "Tu negocio",
  3: "Elige tu clave",
};

const inicial = { nombre: "", rut: "", correo: "", nombreNegocio: "", rutNegocio: "", comuna: "Puente Alto" };

export function FormularioRegistro() {
  const [paso, setPaso] = useState<Paso>(1);
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, accion, enviando] = useActionState(async (anterior: EstadoRegistro, formData: FormData) => {
    const resultado = await registrar(anterior, formData);
    if (resultado.paso) setPaso(resultado.paso);
    setErrores(resultado.errores ?? {});
    return resultado;
  }, {});

  const cambiar = (campo: keyof typeof inicial) => (evento: React.ChangeEvent<HTMLInputElement>) => {
    const valor = campo === "rut" || campo === "rutNegocio" ? formatearRutMientrasEscribe(evento.target.value) : evento.target.value;
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));
    setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };

  const siguiente = (evento: React.FormEvent) => {
    evento.preventDefault();
    const esquema = paso === 1 ? esquemaPaso1 : esquemaPaso2;
    const validacion = esquema.safeParse(datos);
    if (!validacion.success) {
      setErrores(erroresPorCampo(validacion.error));
      return;
    }
    setErrores({});
    setPaso((paso + 1) as Paso);
    window.scrollTo({ top: 0 });
  };

  // Revisa el paso 3 antes de enviar, para mostrar nuestros mensajes (y no los del navegador).
  const revisarPaso3 = (evento: React.FormEvent<HTMLFormElement>) => {
    const validacion = esquemaPaso3.safeParse(Object.fromEntries(new FormData(evento.currentTarget)));
    if (!validacion.success) {
      evento.preventDefault();
      setErrores(erroresPorCampo(validacion.error));
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      {paso === 1 ? (
        <BotonVolver href="/" />
      ) : (
        <button
          type="button"
          onClick={() => setPaso((paso - 1) as Paso)}
          className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ←
          </span>
          Volver
        </button>
      )}

      <p className="mt-4 text-lg font-semibold text-marca">Crear mi cuenta · Paso {paso} de 3</p>
      <div className="mt-2 flex gap-2" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-2 flex-1 rounded-full ${n <= paso ? "bg-marca" : "bg-gray-300"}`} />
        ))}
      </div>
      <h1 className="mt-4 text-3xl leading-tight font-bold text-texto">{TITULOS[paso]}</h1>

      {estado.error && (
        <div className="mt-6">
          <Aviso tipo="error">{estado.error}</Aviso>
        </div>
      )}

      {paso === 1 && (
        <form onSubmit={siguiente} noValidate className="mt-6 space-y-6">
          <Campo etiqueta="Tu nombre" autoComplete="name" value={datos.nombre} onChange={cambiar("nombre")} error={errores.nombre} />
          <Campo
            etiqueta="Tu RUT"
            ayuda="Con este RUT vas a entrar a la app. Ejemplo: 12.345.678-5"
            inputMode="text"
            autoComplete="off"
            value={datos.rut}
            onChange={cambiar("rut")}
            error={errores.rut}
          />
          <Campo
            etiqueta="Tu correo"
            ayuda="Solo para ayudarte si olvidas tu clave."
            type="email"
            inputMode="email"
            autoComplete="email"
            value={datos.correo}
            onChange={cambiar("correo")}
            error={errores.correo}
          />
          <Boton type="submit" icono="➡️">
            Seguir
          </Boton>
        </form>
      )}

      {paso === 2 && (
        <form onSubmit={siguiente} noValidate className="mt-6 space-y-6">
          <Campo
            etiqueta="Nombre de tu negocio"
            ayuda="Como lo conocen tus clientes. Ejemplo: Almacén Don Pepe"
            autoComplete="organization"
            value={datos.nombreNegocio}
            onChange={cambiar("nombreNegocio")}
            error={errores.nombreNegocio}
          />
          <Campo
            etiqueta="RUT del negocio"
            ayuda="El que sale en tus boletas. Si es el mismo tuyo, escríbelo igual."
            inputMode="text"
            autoComplete="off"
            value={datos.rutNegocio}
            onChange={cambiar("rutNegocio")}
            error={errores.rutNegocio}
          />
          <Campo etiqueta="Comuna" autoComplete="address-level2" value={datos.comuna} onChange={cambiar("comuna")} error={errores.comuna} />
          <Boton type="submit" icono="➡️">
            Seguir
          </Boton>
        </form>
      )}

      {paso === 3 && (
        <form action={accion} onSubmit={revisarPaso3} noValidate className="mt-6 space-y-6">
          {Object.entries(datos).map(([campo, valor]) => (
            <input key={campo} type="hidden" name={campo} value={valor} />
          ))}
          <Campo
            etiqueta="Tu clave"
            ayuda={`Mínimo ${MINIMO_CLAVE} letras o números. Anótala en un lugar seguro.`}
            type="password"
            name="clave"
            autoComplete="new-password"
            error={errores.clave}
          />
          <Casilla name="aceptaTerminos" value="si" error={errores.aceptaTerminos} onChange={() => setErrores(({ aceptaTerminos: _quitado, ...resto }) => resto)}>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" className="font-semibold text-marca underline">
              términos y condiciones
            </Link>
          </Casilla>
          <Casilla name="aceptaPrivacidad" value="si" error={errores.aceptaPrivacidad} onChange={() => setErrores(({ aceptaPrivacidad: _quitado, ...resto }) => resto)}>
            Acepto la{" "}
            <Link href="/privacidad" target="_blank" className="font-semibold text-marca underline">
              política de privacidad
            </Link>
          </Casilla>
          <Boton type="submit" icono="✅" cargando={enviando}>
            Crear mi cuenta
          </Boton>
        </form>
      )}

      <p className="mt-8 text-center text-lg text-texto-suave">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="font-semibold text-marca underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
