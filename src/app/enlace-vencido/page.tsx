import type { Metadata } from "next";
import { BotonWhatsApp } from "@/components/BotonWhatsApp";
import { Pantalla } from "@/components/ui/Pantalla";

export const metadata: Metadata = { title: "Enlace vencido" };

export default function PaginaEnlaceVencido() {
  return (
    <Pantalla titulo="Este enlace ya no sirve" volverA="/entrar">
      <p className="text-xl text-texto-suave">
        Los enlaces para elegir clave se pueden usar una sola vez y duran 1 hora. Pídenos uno nuevo por WhatsApp.
      </p>
      <div className="mt-8">
        <BotonWhatsApp texto="Pedir un enlace nuevo" mensaje="Hola, mi enlace para elegir clave de RH Stock ya no sirve" />
      </div>
    </Pantalla>
  );
}
