"use client";

import { useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";

/** Copia los datos de la transferencia para pegarlos en la app del banco. */
export function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button type="button" onClick={copiar} className={clasesBoton("secundario")} aria-live="polite">
      <span aria-hidden="true" className="text-2xl leading-none">
        {copiado ? "✅" : "📋"}
      </span>
      {copiado ? "Copiado. Pégalo en tu banco" : "Copiar datos"}
    </button>
  );
}
