// Portada pública de RH Stock (Fase 0: "Hola mundo" con la marca).
// En la Fase 1 se suman "Probar sin registrarse", "Crear mi cuenta" y los enlaces legales.

import { BotonWhatsApp } from "@/components/BotonWhatsApp";
import { Logo } from "@/components/marca/Logo";
import { MENSAJES_WHATSAPP, telefonoLegible } from "@/lib/whatsapp";

const BENEFICIOS = [
  {
    icono: "📷",
    titulo: "Le sacas una foto a tu boleta",
    detalle: "y lo que compraste se suma solo a tu stock.",
  },
  {
    icono: "🛒",
    titulo: "Vendes desde el celular",
    detalle: "y lo vendido se descuenta solo.",
  },
  {
    icono: "🔔",
    titulo: "Te avisamos",
    detalle: "cuando algo se está acabando o sube de precio.",
  },
] as const;

export default function Portada() {
  return (
    <div className="flex min-h-dvh flex-col bg-fondo-suave">
      <header className="border-b border-black/5 bg-fondo">
        <div className="mx-auto w-full max-w-xl px-4 py-4">
          <Logo />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-8 pb-10">
        <p className="inline-block rounded-full bg-acento px-4 py-1 text-base font-semibold text-texto">
          Muy pronto en Puente Alto
        </p>

        <h1 className="mt-4 text-[2.125rem] leading-tight font-bold text-texto sm:text-5xl">
          Tu inventario con una foto
        </h1>
        <p className="mt-3 text-xl text-texto-suave">
          La app de inventario para <strong className="font-semibold text-texto">almacenes y negocios de barrio</strong>.
          Fácil y desde tu celular.
        </p>

        {/* El botón va arriba para que se vea sin bajar la pantalla en el celular. */}
        <div className="mt-8">
          <BotonWhatsApp texto="Quiero probar RH Stock" mensaje={MENSAJES_WHATSAPP.probar} />
          <p className="mt-3 text-center text-base text-texto-suave">
            Te respondemos por WhatsApp al <span className="whitespace-nowrap">{telefonoLegible()}</span>
          </p>
        </div>

        <h2 className="mt-12 text-2xl font-bold text-texto">Así de fácil</h2>
        <ul className="mt-4 space-y-3">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio.titulo} className="flex items-center gap-4 rounded-2xl bg-fondo p-4 shadow-sm">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-marca-claro text-3xl"
              >
                {beneficio.icono}
              </span>
              <p className="leading-snug">
                <strong className="block font-semibold text-texto">{beneficio.titulo}</strong>
                <span className="text-texto-suave">{beneficio.detalle}</span>
              </p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-black/5 bg-fondo">
        <p className="mx-auto w-full max-w-xl px-4 py-6 text-center text-base text-texto-suave">
          RH Stock · Inventario para almacenes de Puente Alto, Chile
        </p>
      </footer>
    </div>
  );
}
