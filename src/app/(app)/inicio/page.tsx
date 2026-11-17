import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/Aviso";
import { contarAvisosSinLeer } from "@/lib/avisos";
import { formatearDia, formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio, primerNombre } from "@/lib/sesion";

export const metadata: Metadata = { title: "Inicio" };

/** Las 4 tareas principales. Todo lo demás va en "Más". */
const TAREAS = [
  { href: "/subir-boleta", icono: "📷", titulo: "Subir boleta", detalle: "Lo que compré" },
  { href: "/vender", icono: "🛒", titulo: "Vender", detalle: "Lo que vendo" },
  { href: "/mi-stock", icono: "📦", titulo: "Mi stock", detalle: "Qué tengo y qué falta" },
  { href: "/avisos", icono: "🔔", titulo: "Avisos", detalle: "Lo que debo revisar" },
] as const;

export default async function PaginaInicio({ searchParams }: PageProps<"/inicio">) {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  const { bienvenida, clave } = await searchParams;
  const avisosSinLeer = await contarAvisosSinLeer();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-28">
      <p className="text-lg font-semibold text-marca">{empresa.nombre}</p>
      <h1 className="text-3xl leading-tight font-bold text-texto">Hola, {primerNombre(usuario.nombre)} 👋</h1>

      {bienvenida && (
        <div className="mt-5">
          <Aviso tipo="exito">Listo, tu cuenta está creada. ¡Bienvenido a RH Stock!</Aviso>
        </div>
      )}
      {clave === "cambiada" && (
        <div className="mt-5">
          <Aviso tipo="exito">Listo, tu clave nueva quedó guardada.</Aviso>
        </div>
      )}

      {usuario.rol === "dueno" && empresa.suscripcion.estado === "por_vencer" && !empresa.suscripcion.pagoEnRevision && empresa.suscripcion.proximoVencimiento && (
        <Link
          href="/mas/mi-plan"
          className="mt-5 flex items-center gap-4 rounded-2xl border-l-8 border-acento bg-fondo p-4 shadow-sm hover:bg-marca-claro"
        >
          <span aria-hidden="true" className="text-4xl leading-none">
            💳
          </span>
          <span className="flex-1">
            <span className="block text-lg font-semibold text-texto">
              Tu pago de {formatearPesos(empresa.suscripcion.precioMensual)} vence el {formatearDia(empresa.suscripcion.proximoVencimiento)}
            </span>
            <span className="block text-base font-semibold text-marca">Ver cómo pagar →</span>
          </span>
        </Link>
      )}

      <nav aria-label="Tareas principales" className="mt-6 grid grid-cols-2 gap-4">
        {TAREAS.map((tarea) => (
          <Link
            key={tarea.href}
            href={tarea.href}
            className="relative flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl bg-fondo p-4 text-center shadow-sm ring-1 ring-black/5 transition-colors hover:bg-marca-claro active:bg-marca-claro"
          >
            {tarea.href === "/avisos" && avisosSinLeer > 0 && (
              <span className="absolute top-3 right-3 flex min-w-9 items-center justify-center rounded-full bg-falta px-2 py-0.5 text-lg font-bold text-white">
                {avisosSinLeer}
                <span className="sr-only"> avisos nuevos</span>
              </span>
            )}
            <span aria-hidden="true" className="text-5xl leading-none">
              {tarea.icono}
            </span>
            <span className="font-titulo text-xl font-bold text-texto">{tarea.titulo}</span>
            <span className="text-base leading-snug text-texto-suave">{tarea.detalle}</span>
          </Link>
        ))}
      </nav>

      <Link
        href="/mas"
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-fondo px-5 text-xl font-semibold text-texto shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          ☰
        </span>
        Más
      </Link>
    </main>
  );
}
