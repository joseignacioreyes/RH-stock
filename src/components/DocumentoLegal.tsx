import type { ReactNode } from "react";
import { BotonVolver } from "@/components/ui/Pantalla";
import { VERSION_LEGAL } from "@/lib/cuentas";

/**
 * Datos del responsable. Completar antes de publicar (ver CLAUDE.md, sección 7).
 * Se dejan a la vista entre corchetes para que nadie los olvide.
 */
export const RESPONSABLE = {
  razonSocial: "[Razón social de la SpA]",
  rut: "[RUT de la SpA]",
  correo: "[correo de contacto]",
  domicilio: "[dirección], Puente Alto, Región Metropolitana",
};

type Props = { titulo: string; children: ReactNode };

export function DocumentoLegal({ titulo, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16">
      <BotonVolver href="/" />
      <div role="note" className="mt-4 rounded-xl border-2 border-dashed border-falta bg-red-50 p-4 text-lg font-semibold text-falta">
        BORRADOR: revisar antes de publicar. Este texto todavía no fue revisado por un abogado.
      </div>
      <h1 className="mt-6 text-3xl leading-tight font-bold text-texto">{titulo}</h1>
      <p className="mt-2 text-base text-texto-suave">Versión {VERSION_LEGAL}</p>
      <div className="legal mt-6 space-y-4 text-lg leading-relaxed text-texto [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-6 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </main>
  );
}
