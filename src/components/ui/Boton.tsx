import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Botones de RH Stock: grandes (mínimo 56 px), ancho completo y siempre con ícono + texto.
// - principal: verde, uno por pantalla.
// - secundario: borde verde, como máximo uno por pantalla.
// - suave: gris, para opciones de menú (pantalla "Más").

export type VarianteBoton = "principal" | "secundario" | "suave";

const base =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-center text-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variantes: Record<VarianteBoton, string> = {
  principal: "bg-marca text-white shadow-sm hover:bg-marca-oscuro active:bg-marca-oscuro",
  secundario: "border-2 border-marca bg-fondo text-marca hover:bg-marca-claro active:bg-marca-claro",
  suave: "justify-start bg-fondo text-texto shadow-sm hover:bg-marca-claro active:bg-marca-claro",
};

export function clasesBoton(variante: VarianteBoton = "principal", extra = "") {
  return `${base} ${variantes[variante]} ${extra}`;
}

function Contenido({ icono, children }: { icono?: ReactNode; children: ReactNode }) {
  return (
    <>
      {icono && (
        <span aria-hidden="true" className="shrink-0 text-2xl leading-none">
          {icono}
        </span>
      )}
      <span>{children}</span>
    </>
  );
}

type PropsEnlace = Omit<ComponentProps<typeof Link>, "className"> & {
  variante?: VarianteBoton;
  icono?: ReactNode;
  className?: string;
};

export function BotonEnlace({ variante = "principal", icono, className = "", children, ...props }: PropsEnlace) {
  return (
    <Link className={clasesBoton(variante, className)} {...props}>
      <Contenido icono={icono}>{children}</Contenido>
    </Link>
  );
}

type PropsBoton = Omit<ComponentProps<"button">, "className"> & {
  variante?: VarianteBoton;
  icono?: ReactNode;
  className?: string;
  /** Muestra "Un momento…" y bloquea el botón mientras se guarda. */
  cargando?: boolean;
};

export function Boton({ variante = "principal", icono, className = "", cargando = false, children, disabled, ...props }: PropsBoton) {
  return (
    <button className={clasesBoton(variante, className)} disabled={disabled || cargando} aria-busy={cargando} {...props}>
      <Contenido icono={cargando ? "⏳" : icono}>{cargando ? "Un momento…" : children}</Contenido>
    </button>
  );
}
