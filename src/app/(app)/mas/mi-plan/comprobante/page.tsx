import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { nombrePeriodo } from "@/lib/suscripcion";
import { SubirComprobante } from "./SubirComprobante";

export const metadata: Metadata = { title: "Subir comprobante" };

export default async function PaginaComprobante() {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  const { suscripcion } = empresa;
  if (usuario.rol !== "dueno" || suscripcion.plan !== "mensual" || suscripcion.pagoEnRevision) redirect("/mas/mi-plan");

  return (
    <Pantalla titulo="Sube tu comprobante" antesDelTitulo="Paso 2 de 2" volverA="/mas/mi-plan">
      <p className="mb-6 text-lg text-texto">
        Sube la <strong>captura de pantalla</strong> o el <strong>PDF</strong> que te dio tu banco al transferir{" "}
        {formatearPesos(suscripcion.precioMensual)}
        {suscripcion.periodo ? ` de ${nombrePeriodo(suscripcion.periodo)}` : ""}.
      </p>
      <SubirComprobante />
      <div className="mt-8">
        <ComoSeUsa
          pasos={[
            { dibujo: "🏦", texto: "Al terminar la transferencia, tu banco muestra un comprobante. Sácale una captura." },
            { dibujo: "📎", texto: "Aprieta \"Elegir captura o PDF\" y elige esa captura o el PDF que te llegó al correo." },
            { dibujo: "✅", texto: "Lo revisamos y te avisamos en Avisos cuando quede confirmado." },
          ]}
        />
      </div>
    </Pantalla>
  );
}
