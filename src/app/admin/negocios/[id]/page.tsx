import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { BotonVolver } from "@/components/ui/Pantalla";
import { formatearDia, formatearFecha, formatearPesos } from "@/lib/formato";
import { obtenerPagosDeNegocio } from "@/lib/pagos-admin";
import { formatearRut } from "@/lib/rut";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { ETIQUETA_ESTADO, ETIQUETA_PAGO, NOMBRE_PLAN, nombrePeriodo, type EstadoPago, type EstadoSuscripcion } from "@/lib/suscripcion";
import { FormularioCobro } from "./FormularioCobro";

export const metadata: Metadata = { title: "Plan del negocio" };

/** Próximo día 5 (o el mismo día de hoy si es antes del 28), como sugerencia para el primer pago. */
function primerPagoSugerido(): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const [anio, mes] = hoy.split("-").map(Number);
  const siguiente = new Date(Date.UTC(anio!, mes!, 5)); // día 5 del mes siguiente
  return siguiente.toISOString().slice(0, 10);
}

/** Ficha de cobro de un negocio: plan, precio, próximo pago e historial. (No muestra el detalle del negocio.) */
export default async function PaginaNegocioAdmin({ params, searchParams }: PageProps<"/admin/negocios/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  const { listo } = await searchParams;
  const supabase = await crearClienteServidor();
  const { data: negocios } = await supabase.rpc("admin_negocios");
  const negocio = negocios?.find((n) => n.id === id);
  if (!negocio) notFound();
  const pagos = await obtenerPagosDeNegocio(id);
  const plan = negocio.plan === "mensual" ? "mensual" : "piloto";
  const estado = ETIQUETA_ESTADO[negocio.estado as EstadoSuscripcion] ?? ETIQUETA_ESTADO.al_dia;

  return (
    <div className="min-h-dvh bg-fondo-suave">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <BotonVolver href="/admin" />
        <p className="mt-4 text-lg font-semibold text-marca">Panel de administrador</p>
        <h1 className="text-3xl font-bold text-texto">{negocio.nombre_fantasia}</h1>
        <p className="mt-1 text-lg text-texto-suave">
          RUT {formatearRut(negocio.rut)} · {negocio.comuna} · registrado el {formatearFecha(negocio.creada_en)}
        </p>

        {listo === "plan" && (
          <div className="mt-6">
            <Aviso tipo="exito">Listo, se guardó el plan.</Aviso>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Dato titulo="Plan" valor={NOMBRE_PLAN[plan]} detalle={plan === "mensual" ? `${formatearPesos(negocio.precio_mensual)} al mes con IVA` : "No paga"} />
          <Dato titulo="Próximo pago" valor={negocio.proximo_vencimiento ? formatearDia(negocio.proximo_vencimiento) : "—"} />
          <div className="rounded-2xl bg-fondo p-5 shadow-sm">
            <p className="text-lg text-texto-suave">Estado</p>
            {plan === "mensual" ? (
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xl font-semibold ${estado.clases}`}>{estado.texto}</span>
            ) : (
              <p className="font-titulo text-2xl font-bold text-texto">Gratis</p>
            )}
          </div>
        </div>

        <h2 className="mt-10 text-2xl font-bold text-texto">Cambiar plan</h2>
        <div className="mt-4">
          <FormularioCobro
            empresaId={id}
            plan={plan}
            precio={negocio.precio_mensual}
            vencimiento={negocio.proximo_vencimiento ?? ""}
            sugerido={primerPagoSugerido()}
          />
        </div>

        <h2 className="mt-10 text-2xl font-bold text-texto">Pagos</h2>
        {pagos.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-fondo p-6 text-lg text-texto-suave shadow-sm">Todavía no hay pagos.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-fondo shadow-sm">
            <table className="w-full min-w-[640px] text-left text-base">
              <thead className="border-b border-gray-200 text-texto-suave">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mes</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Enviado</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => {
                  const etiqueta = ETIQUETA_PAGO[pago.estado as EstadoPago];
                  return (
                    <tr key={pago.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-semibold first-letter:uppercase">{nombrePeriodo(pago.periodo)}</td>
                      <td className="px-4 py-3">{formatearPesos(pago.monto)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pago.informado_en ? formatearFecha(pago.informado_en) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap ${etiqueta.clases}`}>{etiqueta.texto}</span>
                        {pago.motivo_rechazo && <span className="mt-1 block text-texto-suave">{pago.motivo_rechazo}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {pago.revisar.urlComprobante ? (
                          <a href={pago.revisar.urlComprobante} target="_blank" rel="noopener noreferrer" className="font-semibold text-marca hover:underline">
                            🔍 Ver
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagos.some((p) => p.estado === "informado") && (
          <p className="mt-3 text-base text-texto-suave">Los pagos en revisión se confirman o rechazan en el inicio del panel.</p>
        )}
      </main>
    </div>
  );
}

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl bg-fondo p-5 shadow-sm">
      <p className="text-lg text-texto-suave">{titulo}</p>
      <p className="font-titulo text-2xl font-bold text-texto">{valor}</p>
      {detalle && <p className="text-base text-texto-suave">{detalle}</p>}
    </div>
  );
}
