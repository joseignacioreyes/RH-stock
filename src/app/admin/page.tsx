import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/acciones-sesion";
import { Logo } from "@/components/marca/Logo";
import { Aviso } from "@/components/ui/Aviso";
import { formatearDia, formatearPesos } from "@/lib/formato";
import { obtenerPagosPorRevisar, recibidoEsteMes } from "@/lib/pagos-admin";
import { formatearRut } from "@/lib/rut";
import { exigirAdmin, primerNombre } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { ETIQUETA_ESTADO, NOMBRE_PLAN, type EstadoSuscripcion, type PlanSuscripcion } from "@/lib/suscripcion";
import { PagoPorRevisar } from "./PagoPorRevisar";

export const metadata: Metadata = { title: "Administrador" };

const MENSAJES: Record<string, { tipo: "exito" | "error"; texto: string }> = {
  confirmado: { tipo: "exito", texto: "Listo, pago confirmado. El negocio quedó al día y le avisamos." },
  rechazado: { tipo: "exito", texto: "Listo, pago rechazado. Le avisamos al dueño con el motivo." },
  motivo: { tipo: "error", texto: "Escribe por qué rechazas el pago." },
  revisado: { tipo: "error", texto: "Ese pago ya estaba revisado." },
  general: { tipo: "error", texto: "No pudimos hacer eso. Intenta de nuevo." },
};

const formatoFecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Panel del administrador de RH Stock (José): pagos por revisar y lista de negocios con su plan.
 * Solo ve la ficha y los pagos de cada negocio, no su detalle (stock, ventas…), por las reglas RLS.
 */
export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  const { usuario } = await exigirAdmin();
  const { listo, error } = await searchParams;
  const mensaje = MENSAJES[(listo ?? error) as string];
  const supabase = await crearClienteServidor();
  const [{ data: negocios }, porRevisar, recibido] = await Promise.all([supabase.rpc("admin_negocios"), obtenerPagosPorRevisar(), recibidoEsteMes()]);

  const lista = negocios ?? [];
  const clientes = lista.filter((e) => !e.es_demo);
  const mensuales = clientes.filter((e) => e.plan === "mensual");

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
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/piloto" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-marca px-4 text-lg font-semibold text-white hover:bg-marca-oscuro">
            <span aria-hidden="true">📈</span> Uso del piloto
          </Link>
          <a
            href="/api/admin/pagos"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-marca bg-fondo px-4 text-lg font-semibold text-marca hover:bg-marca-claro"
          >
            <span aria-hidden="true">📥</span> Descargar pagos a Excel
          </a>
        </div>

        {mensaje && (
          <div className="mt-6">
            <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta titulo="Negocios registrados" valor={String(clientes.length)} detalle={`${clientes.length - mensuales.length} en el piloto gratis`} />
          <Tarjeta titulo="Pagando al día" valor={String(mensuales.filter((e) => e.estado === "al_dia" || e.estado === "por_vencer").length)} />
          <Tarjeta
            titulo="Atrasados"
            valor={String(mensuales.filter((e) => e.estado === "atrasado" || e.estado === "suspendido").length)}
            detalle={`${mensuales.filter((e) => e.estado === "suspendido").length} solo para mirar`}
          />
          <Tarjeta titulo="Recibido este mes" valor={formatearPesos(recibido)} detalle="con IVA" />
        </div>

        <h2 className="mt-10 text-2xl font-bold text-texto">
          Pagos por revisar <span className="text-texto-suave">({porRevisar.length})</span>
        </h2>
        {porRevisar.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-fondo p-6 text-lg text-texto-suave shadow-sm">😌 No hay pagos por revisar.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {porRevisar.map((pago) => (
              <PagoPorRevisar key={pago.id} pago={pago} />
            ))}
          </div>
        )}

        <h2 className="mt-10 text-2xl font-bold text-texto">Negocios</h2>
        {lista.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-fondo p-6 text-lg text-texto-suave shadow-sm">Todavía no hay negocios registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-fondo shadow-sm">
            <table className="w-full min-w-[760px] text-left text-base">
              <thead className="border-b border-gray-200 text-texto-suave">
                <tr>
                  <th className="px-4 py-3 font-semibold">Negocio</th>
                  <th className="px-4 py-3 font-semibold">RUT</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Próximo pago</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((empresa) => {
                  const plan = empresa.plan as PlanSuscripcion;
                  const estado = ETIQUETA_ESTADO[empresa.estado as EstadoSuscripcion] ?? ETIQUETA_ESTADO.al_dia;
                  return (
                    <tr key={empresa.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/admin/negocios/${empresa.id}`} className="text-marca underline-offset-4 hover:underline">
                          {empresa.nombre_fantasia}
                        </Link>
                        {empresa.es_demo && <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-base font-semibold text-texto">Ejemplo</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatearRut(empresa.rut)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {NOMBRE_PLAN[plan] ?? plan}
                        {plan === "mensual" && <span className="block text-texto-suave">{formatearPesos(empresa.precio_mensual)}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{empresa.proximo_vencimiento ? formatearDia(empresa.proximo_vencimiento) : "—"}</td>
                      <td className="px-4 py-3">
                        {plan === "mensual" ? (
                          <span className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap ${estado.clases}`}>{estado.texto}</span>
                        ) : (
                          <span className="text-texto-suave">Gratis</span>
                        )}
                        {empresa.pago_en_revision && <span className="ml-2 whitespace-nowrap text-texto-suave">🕐 por revisar</span>}
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

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl bg-fondo p-5 shadow-sm">
      <p className="text-lg text-texto-suave">{titulo}</p>
      <p className="font-titulo text-4xl font-bold text-texto">{valor}</p>
      {detalle && <p className="text-base text-texto-suave">{detalle}</p>}
    </div>
  );
}
