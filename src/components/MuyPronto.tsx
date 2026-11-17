import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";

type Props = { titulo: string; icono: string; descripcion: string };

/** Pantalla para lo que todavía no está construido (se completa en las próximas fases). */
export function MuyPronto({ titulo, icono, descripcion }: Props) {
  return (
    <Pantalla titulo={titulo} volverA="/inicio">
      <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm">
        <p aria-hidden="true" className="text-6xl">
          {icono}
        </p>
        <p className="mt-4 inline-block rounded-full bg-acento px-4 py-1 text-base font-semibold text-texto">Muy pronto</p>
        <p className="mt-4 text-xl text-texto-suave">{descripcion}</p>
      </div>
      <div className="mt-8">
        <BotonEnlace href="/inicio" icono="🏠">
          Volver al inicio
        </BotonEnlace>
      </div>
    </Pantalla>
  );
}
