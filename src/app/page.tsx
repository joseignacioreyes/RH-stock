// Portada pública de RH Stock.

import Link from "next/link";
import { entrarAlDemo } from "@/app/acciones-sesion";
import { Logo } from "@/components/marca/Logo";
import { Aviso } from "@/components/ui/Aviso";
import { Boton, BotonEnlace, clasesBoton } from "@/components/ui/Boton";
import { enlaceWhatsApp, MENSAJES_WHATSAPP } from "@/lib/whatsapp";

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

export default async function Portada({ searchParams }: PageProps<"/">) {
  const { demo, sesion } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-fondo-suave">
      <header className="border-b border-black/5 bg-fondo">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <Link
            href="/entrar"
            className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-marca px-4 text-lg font-semibold text-marca hover:bg-marca-claro"
          >
            <span aria-hidden="true">🔑</span>
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-8 pb-10">
        {sesion === "cerrada" && (
          <div className="mb-6">
            <Aviso tipo="exito">Listo, cerraste tu sesión.</Aviso>
          </div>
        )}
        {demo === "no-disponible" && (
          <div className="mb-6">
            <Aviso tipo="error">El negocio de ejemplo no está disponible en este momento. Escríbenos por WhatsApp y te lo mostramos.</Aviso>
          </div>
        )}

        <p className="inline-block rounded-full bg-acento px-4 py-1 text-base font-semibold text-texto">
          Para almacenes de Puente Alto
        </p>

        <h1 className="mt-4 text-[2.125rem] leading-tight font-bold text-texto sm:text-5xl">Tu inventario con una foto</h1>
        <p className="mt-3 text-xl text-texto-suave">
          La app de inventario para <strong className="font-semibold text-texto">almacenes y negocios de barrio</strong>.
          Fácil y desde tu celular.
        </p>

        {/* Los botones van arriba para que se vean sin bajar la pantalla en el celular. */}
        <div className="mt-8 space-y-3">
          <form action={entrarAlDemo}>
            <Boton type="submit" icono="👀">
              Probar sin registrarse
            </Boton>
          </form>
          <BotonEnlace href="/registro" variante="secundario" icono="✍️">
            Crear mi cuenta
          </BotonEnlace>
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

        <section className="mt-12 rounded-2xl bg-fondo p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-texto">¿Quieres que te ayudemos?</h2>
          <p className="mt-2 text-lg text-texto-suave">Te visitamos o te explicamos por WhatsApp, sin compromiso.</p>
          <a
            href={enlaceWhatsApp(MENSAJES_WHATSAPP.probar)}
            target="_blank"
            rel="noopener noreferrer"
            className={clasesBoton("secundario", "mt-4")}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              💬
            </span>
            Quiero probar RH Stock
          </a>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-fondo">
        <div className="mx-auto w-full max-w-xl px-4 py-6 text-center text-base text-texto-suave">
          <p>RH Stock · Inventario para almacenes de Puente Alto, Chile</p>
          <p className="mt-3 flex justify-center gap-6">
            <Link href="/privacidad" className="underline hover:text-marca">
              Privacidad
            </Link>
            <Link href="/terminos" className="underline hover:text-marca">
              Términos
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
