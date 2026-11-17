import type { ReactNode } from "react";

type Tipo = "exito" | "error" | "info";

const estilos: Record<Tipo, { clases: string; icono: string }> = {
  exito: { clases: "border-ok bg-green-50", icono: "✅" },
  error: { clases: "border-falta bg-red-50", icono: "⚠️" },
  info: { clases: "border-marca bg-marca-claro/40", icono: "💡" },
};

/** Mensaje visible y amable: "✅ Listo…", "⚠️ La clave no es correcta…". */
export function Aviso({ tipo = "info", children }: { tipo?: Tipo; children: ReactNode }) {
  const { clases, icono } = estilos[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl border-l-4 p-4 text-lg text-texto ${clases}`}>
      <span aria-hidden="true" className="text-2xl leading-none">
        {icono}
      </span>
      <div>{children}</div>
    </div>
  );
}
