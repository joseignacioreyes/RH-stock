import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  titulo: string;
  /** A dónde lleva el botón "Volver" de arriba a la izquierda. Sin valor, no se muestra. */
  volverA?: string;
  /** Texto chico arriba del título, por ejemplo "Paso 1 de 3". */
  antesDelTitulo?: ReactNode;
  children: ReactNode;
};

/** Estructura de una pantalla simple: "Volver" arriba, un título grande y el contenido. */
export function Pantalla({ titulo, volverA, antesDelTitulo, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      {volverA && <BotonVolver href={volverA} />}
      {antesDelTitulo && <p className="mt-4 text-lg font-semibold text-marca">{antesDelTitulo}</p>}
      <h1 className={`${antesDelTitulo ? "mt-1" : "mt-4"} text-3xl leading-tight font-bold text-texto`}>{titulo}</h1>
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function BotonVolver({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        ←
      </span>
      Volver
    </Link>
  );
}
