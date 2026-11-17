import { BotonAyudaWhatsApp } from "@/components/BotonAyudaWhatsApp";
import { FranjaDemo } from "@/components/FranjaDemo";
import { exigirSesionDeNegocio } from "@/lib/sesion";

// Todas las pantallas del negocio (inicio, vender, mi stock…) pasan por aquí:
// exige sesión, muestra la franja del demo si corresponde y el botón de ayuda.
export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const { empresa } = await exigirSesionDeNegocio();

  return (
    <div className="min-h-dvh bg-fondo-suave">
      {empresa.esDemo && <FranjaDemo />}
      {children}
      <BotonAyudaWhatsApp />
    </div>
  );
}
