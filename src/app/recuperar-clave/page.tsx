import type { Metadata } from "next";
import { clasesBoton } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { FormularioRecuperar } from "./FormularioRecuperar";

export const metadata: Metadata = { title: "Olvidé mi clave" };

// "Olvidé mi clave": la persona escribe su RUT y le llega a su correo registrado un enlace
// para elegir una clave nueva. Si no le llega, puede pedir ayuda por WhatsApp
// (José genera el enlace con npm run cuenta:enlace-clave y lo envía a ese mismo correo).
export default function PaginaRecuperarClave() {
  return (
    <Pantalla titulo="¿Olvidaste tu clave?" volverA="/entrar">
      <p className="mb-6 text-xl text-texto-suave">No te preocupes, pasa seguido. Te enviamos un enlace a tu correo para que elijas una clave nueva.</p>
      <FormularioRecuperar />
      <div className="mt-10 rounded-2xl bg-fondo p-5 shadow-sm">
        <p className="mb-3 text-lg text-texto">¿No te llegó el correo o ya no usas ese correo?</p>
        <a href={enlaceWhatsApp("Hola, olvidé mi clave de RH Stock")} target="_blank" rel="noopener noreferrer" className={clasesBoton("secundario")}>
          <span aria-hidden="true" className="text-2xl leading-none">
            💬
          </span>
          Pedir ayuda por WhatsApp
        </a>
      </div>
    </Pantalla>
  );
}
