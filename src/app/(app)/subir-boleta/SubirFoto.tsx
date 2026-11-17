"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { clasesBoton } from "@/components/ui/Boton";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { subirBoleta } from "./acciones";

/** Dos botones grandes: sacar foto con la cámara o elegirla de la galería. Al elegir, sube y lee sola. */
export function SubirFoto() {
  const [estado, accion] = useActionState(subirBoleta, {});
  const [enviando, iniciar] = useTransition();
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  async function elegida(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setErrorLocal(null);
    try {
      const comprimida = await comprimirImagen(archivo);
      setVistaPrevia(URL.createObjectURL(comprimida));
      const formData = new FormData();
      formData.set("foto", comprimida);
      iniciar(() => accion(formData));
    } catch {
      setErrorLocal("No pudimos abrir esa foto. Intenta sacarla de nuevo con la cámara.");
    }
  }

  if (enviando) {
    return (
      <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm" role="status" aria-live="polite">
        {vistaPrevia && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local de la foto recién sacada
          <img src={vistaPrevia} alt="Tu foto" className="mx-auto max-h-64 rounded-xl object-contain opacity-60" />
        )}
        <div className="mx-auto mt-6 size-14 animate-spin rounded-full border-4 border-marca-claro border-t-marca" aria-hidden="true" />
        <p className="mt-4 font-titulo text-2xl font-bold text-texto">Leyendo tu boleta…</p>
        <p className="mt-1 text-lg text-texto-suave">Demora unos segundos. No cierres esta pantalla.</p>
      </div>
    );
  }

  const error = errorLocal ?? estado.error;

  return (
    <div className="space-y-3">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegida} aria-hidden="true" tabIndex={-1} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={elegida} aria-hidden="true" tabIndex={-1} />
      <button type="button" onClick={() => camara.current?.click()} className={clasesBoton("principal", "min-h-20 text-2xl")}>
        <span aria-hidden="true" className="text-3xl leading-none">
          📷
        </span>
        Sacar foto a la boleta
      </button>
      <button type="button" onClick={() => galeria.current?.click()} className={clasesBoton("secundario")}>
        <span aria-hidden="true" className="text-2xl leading-none">
          🖼️
        </span>
        Elegir de la galería
      </button>
    </div>
  );
}
