"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { clasesBoton } from "@/components/ui/Boton";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { informarPago } from "../acciones";

/** Sacar foto al comprobante o elegir la captura / el PDF del banco. Al elegir, se envía solo. */
export function SubirComprobante() {
  const [estado, accion] = useActionState(informarPago, {});
  const [enviando, iniciar] = useTransition();
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const archivo = useRef<HTMLInputElement>(null);

  async function elegido(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0];
    evento.target.value = "";
    if (!elegido) return;
    setErrorLocal(null);
    try {
      // Las fotos se achican antes de subir; los PDF van tal cual.
      const listo = elegido.type === "application/pdf" ? elegido : await comprimirImagen(elegido);
      const formData = new FormData();
      formData.set("comprobante", listo);
      iniciar(() => accion(formData));
    } catch {
      setErrorLocal("No pudimos abrir ese archivo. Intenta con una captura de pantalla.");
    }
  }

  if (enviando) {
    return (
      <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm" role="status" aria-live="polite">
        <div className="mx-auto size-14 animate-spin rounded-full border-4 border-marca-claro border-t-marca" aria-hidden="true" />
        <p className="mt-4 font-titulo text-2xl font-bold text-texto">Revisando tu comprobante…</p>
        <p className="mt-1 text-lg text-texto-suave">Demora unos segundos. No cierres esta pantalla.</p>
      </div>
    );
  }

  const error = errorLocal ?? estado.error;
  return (
    <div className="space-y-3">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegido} aria-hidden="true" tabIndex={-1} />
      <input ref={archivo} type="file" accept="image/*,application/pdf" className="hidden" onChange={elegido} aria-hidden="true" tabIndex={-1} />
      <button type="button" onClick={() => archivo.current?.click()} className={clasesBoton("principal", "min-h-20 text-2xl")}>
        <span aria-hidden="true" className="text-3xl leading-none">
          📎
        </span>
        Elegir captura o PDF
      </button>
      <button type="button" onClick={() => camara.current?.click()} className={clasesBoton("secundario")}>
        <span aria-hidden="true" className="text-2xl leading-none">
          📷
        </span>
        Sacar foto al comprobante
      </button>
    </div>
  );
}
