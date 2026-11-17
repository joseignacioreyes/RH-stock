import type { Metadata } from "next";
import { BotonWhatsApp } from "@/components/BotonWhatsApp";
import { Pantalla } from "@/components/ui/Pantalla";

export const metadata: Metadata = { title: "Olvidé mi clave" };

// Por ahora la clave se recupera con ayuda por WhatsApp: José genera un enlace para
// elegir una clave nueva (npm run cuenta:enlace-clave). En la Fase 4, cuando la app
// envíe correos, este paso será automático con el correo de la persona.
export default function PaginaRecuperarClave() {
  return (
    <Pantalla titulo="¿Olvidaste tu clave?" volverA="/entrar">
      <p className="text-xl text-texto-suave">No te preocupes, pasa seguido.</p>
      <ol className="mt-6 space-y-4 text-lg">
        {[
          "Escríbenos por WhatsApp con el botón de abajo.",
          "Te pediremos tu RUT para confirmar que eres tú.",
          "Te enviaremos a tu correo un enlace para que elijas una clave nueva.",
        ].map((paso, i) => (
          <li key={paso} className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca text-lg font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-1.5">{paso}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <BotonWhatsApp texto="Pedir ayuda por WhatsApp" mensaje="Hola, olvidé mi clave de RH Stock" />
      </div>
    </Pantalla>
  );
}
