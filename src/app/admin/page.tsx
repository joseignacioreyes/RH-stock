import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/acciones-sesion";
import { Logo } from "@/components/marca/Logo";
import { formatearRut } from "@/lib/rut";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { exigirAdmin, primerNombre } from "@/lib/sesion";

export const metadata: Metadata = { title: "Administrador" };

const ESTADOS = {
  al_dia: { texto: "Al día", clases: "bg-green-100 text-green-800" },
  por_vencer: { texto: "Por vencer", clases: "bg-amber-100 text-amber-900" },
  atrasado: { texto: "Atrasado", clases: "bg-red-100 text-red-800" },
  suspendido: { texto: "Suspendido", clases: "bg-gray-200 text-gray-800" },
} as const;

const formatoFecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Panel del administrador de RH Stock (José). En la Fase 1 muestra la lista de negocios.
 * Pagos, confirmaciones y métricas llegan en la Fase 5.
 * Solo ve la ficha de cada negocio, no su detalle (stock, ventas…), por las reglas RLS.
 */
export default async function PaginaAdmin() {
  const { usuario } = await exigirAdmin();
  const supabase = await crearClienteServidor();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre_fantasia, rut, comuna, estado_suscripcion, es_demo, creada_en")
    .order("creada_en", { ascending: false });

  const lista = empresas ?? [];
  const clientes = lista.filter((e) => !e.es_demo);

  return (
    <div className="min-h-dvh bg-fondo-suave">
      <header className="border-b border-black/5 bg-fondo">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <form action={cerrarSesion}>
            <button type="submit" className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-lg font-semibold text-marca hover:bg-marca-claro">
              <span aria-hidden="true">🚪</span> Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-lg font-semibold text-marca">Panel de administrador</p>
        <h1 className="text-3xl font-bold text-texto">Hola, {primerNombre(usuario.nombre)}</h1>
        <Link
          href="/admin/piloto"
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-marca px-4 text-lg font-semibold text-white hover:bg-marca-oscuro"
        >
          <span aria-hidden="true">📈</span> Uso del piloto
        </Link>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Tarjeta titulo="Negocios registrados" valor={clientes.length} />
          <Tarjeta titulo="Al día" valor={clientes.filter((e) => e.estado_suscripcion === "al_dia").length} />
          <Tarjeta titulo="Con pago atrasado" valor={clientes.filter((e) => e.estado_suscripcion === "atrasado").length} />
        </div>

        <h2 className="mt-10 text-2xl font-bold text-texto">Negocios</h2>
        {lista.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-fondo p-6 text-lg text-texto-suave shadow-sm">Todavía no hay negocios registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-fondo shadow-sm">
            <table className="w-full min-w-[640px] text-left text-base">
              <thead className="border-b border-gray-200 text-texto-suave">
                <tr>
                  <th className="px-4 py-3 font-semibold">Negocio</th>
                  <th className="px-4 py-3 font-semibold">RUT</th>
                  <th className="px-4 py-3 font-semibold">Comuna</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((empresa) => {
                  const estado = ESTADOS[empresa.estado_suscripcion as keyof typeof ESTADOS] ?? ESTADOS.al_dia;
                  return (
                    <tr key={empresa.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-semibold text-texto">
                        {empresa.nombre_fantasia}
                        {empresa.es_demo && (
                          <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-base font-semibold text-texto">Ejemplo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatearRut(empresa.rut)}</td>
                      <td className="px-4 py-3">{empresa.comuna}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 font-semibold ${estado.clases}`}>{estado.texto}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatoFecha.format(new Date(empresa.creada_en))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-2xl bg-fondo p-5 shadow-sm">
      <p className="text-lg text-texto-suave">{titulo}</p>
      <p className="font-titulo text-4xl font-bold text-texto">{valor}</p>
    </div>
  );
}

