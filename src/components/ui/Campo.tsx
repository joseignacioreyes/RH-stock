"use client";

import { useId, useState, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "id" | "className"> & {
  etiqueta: string;
  /** Texto de ayuda debajo de la etiqueta, por ejemplo "Ejemplo: 12.345.678-5". */
  ayuda?: string;
  error?: string;
};

/** Campo de texto grande, con etiqueta arriba, ayuda y error en palabras simples. */
export function Campo({ etiqueta, ayuda, error, type = "text", ...props }: Props) {
  const id = useId();
  const [mostrarClave, setMostrarClave] = useState(false);
  const esClave = type === "password";

  return (
    <div>
      <label htmlFor={id} className="block text-lg font-semibold text-texto">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-base text-texto-suave">
          {ayuda}
        </p>
      )}
      <div className="relative mt-2">
        <input
          id={id}
          type={esClave && mostrarClave ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={[ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
          className={`block min-h-14 w-full rounded-xl border-2 bg-fondo px-4 text-xl text-texto placeholder:text-texto-suave/70 focus:border-marca focus:outline-none ${
            error ? "border-falta" : "border-gray-300"
          } ${esClave ? "pr-28" : ""}`}
          {...props}
        />
        {esClave && (
          <button
            type="button"
            onClick={() => setMostrarClave((valor) => !valor)}
            className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-lg px-3 text-base font-semibold text-marca hover:bg-marca-claro"
            aria-label={mostrarClave ? "Ocultar la clave" : "Mostrar la clave"}
          >
            <span aria-hidden="true">{mostrarClave ? "🙈" : "👁️"}</span>
            {mostrarClave ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex gap-2 text-base font-medium text-falta">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}

type PropsCasilla = Omit<ComponentProps<"input">, "id" | "type" | "className"> & {
  children: React.ReactNode;
  error?: string;
};

/** Casilla para marcar, grande y fácil de tocar. */
export function Casilla({ children, error, ...props }: PropsCasilla) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-14 cursor-pointer items-start gap-4 rounded-xl border-2 bg-fondo p-4 ${
          error ? "border-falta" : "border-gray-300"
        }`}
      >
        <input id={id} type="checkbox" className="mt-0.5 size-7 shrink-0 accent-marca" {...props} />
        <span className="text-lg leading-snug text-texto">{children}</span>
      </label>
      {error && (
        <p className="mt-2 flex gap-2 text-base font-medium text-falta">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}
