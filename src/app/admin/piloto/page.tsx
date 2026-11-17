import type { Metadata } from "next";
import Link from "next/link";
import { BotonVolver } from "@/components/ui/Pantalla";
import { formatearFecha, formatearPesos, formatearPorcentaje } from "@/lib/formato";
import { COLUMNAS_METRICAS, esPeriodo, obtenerMetricas, porcentaje, PERIODOS } from "@/lib/metricas";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Uso del piloto" };

/**
 * Panel del piloto (Fase 7): cuánto y cómo usa la app cada negocio.
 * Solo números de uso, nunca el detalle del negocio.
 */
export default async function PaginaPiloto({ searchParams }: PageProps<"/admin/piloto">) {
  await exigirAdmin();
  const { periodo: crudo } = await searchParams;
  const periodo = esPeriodo(crudo) ? crudo : "7";
  const metricas = await obtenerMetricas(periodo);

  const suma = (f: (m: (typeof metricas)[number]) => number) => metricas.reduce((t, m) => t + f(m), 0);
  const leidos = suma((m) => m.itemsLeidos);
  const corregidos = suma((m) => m.itemsCorregidos);
  const avisos = suma((m) => m.avisosStock + m.avisosCosto);

  const resumen = [
    { titulo: "Boletas subidas", valor: String(suma((m) => m.boletasSubidas)) },
    { titulo: "% que hubo que corregir", valor: leidos ? formatearPorcentaje(porcentaje(corregidos, leidos) ?? 0) : "—" },
    { titulo: "Ventas en la caja", valor: String(suma((m) => m.ventas)) },
    { titulo: "Avisos vistos", valor: avisos ? `${suma((m) => m.avisosVistos)} de ${avisos}` : "—" },
  ];

  return (
    <div className="min-h-dvh bg-fondo-suave">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <BotonVolver href="/admin" />
        <p className="mt-4 text-lg font-semibold text-marca">Panel de administrador</p>
        <h1 className="text-3xl font-bold text-texto">Uso del piloto</h1>
        <p className="mt-1 text-lg text-texto-suave">Cuánto usa la app cada negocio. Solo números: no se ve el detalle de cada negocio.</p>

        <nav aria-label="Período" className="mt-5 flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={`/admin/piloto?periodo=${p.valor}`}
              aria-current={p.valor === periodo ? "page" : undefined}
              className={`min-h-12 rounded-full px-4 py-2 text-lg font-semibold ${p.valor === periodo ? "bg-marca text-white" : "bg-fondo text-marca ring-1 ring-marca"}`}
            >
              {p.texto}
            </Link>
          ))}
          <a
            href={`/api/admin/metricas?periodo=${periodo}`}
            download
            className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-fondo px-4 py-2 text-lg font-semibold text-marca ring-1 ring-marca"
          >
            <span aria-hidden="true">📊</span> Descargar a Excel
          </a>
        </nav>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {resumen.map((r) => (
            <div key={r.titulo} className="rounded-2xl bg-fondo p-5 shadow-sm">
              <p className="text-lg text-texto-suave">{r.titulo}</p>
              <p className="font-titulo text-3xl font-bold text-texto">{r.valor}</p>
            </div>
          ))}
        </div>

        {metricas.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-fondo p-6 text-lg text-texto-suave shadow-sm">Todavía no hay negocios en el piloto.</p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl bg-fondo shadow-sm">
            <table className="w-full text-left text-base">
              <thead className="border-b border-gray-200 align-bottom text-texto-suave">
                <tr>
                  <th className="sticky left-0 bg-fondo px-4 py-3 font-semibold">Negocio</th>
                  {COLUMNAS_METRICAS.map((c) => (
                    <th key={c.titulo} className="px-3 py-3 text-right font-semibold" title={c.ayuda}>
                      {c.titulo}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Vendido</th>
                  <th className="px-4 py-3 font-semibold">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map((m) => (
                  <tr key={m.negocio + m.creadaEn} className="border-b border-gray-100 last:border-0">
                    <td className="sticky left-0 bg-fondo px-4 py-3 font-semibold whitespace-nowrap text-texto">
                      {m.negocio}
                      <span className="block text-base font-normal text-texto-suave">
                        {m.comuna} · desde {formatearFecha(m.creadaEn)}
                      </span>
                    </td>
                    {COLUMNAS_METRICAS.map((c) => {
                      const valor = c.valor(m);
                      const esTasa = c.titulo === "% corregido";
                      return (
                        <td
                          key={c.titulo}
                          className={`px-3 py-3 text-right tabular-nums ${esTasa && typeof valor === "number" && valor > 20 ? "font-bold text-falta" : ""}`}
                        >
                          {valor === null ? "—" : esTasa ? formatearPorcentaje(Number(valor)) : valor}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{formatearPesos(m.montoVendido)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.ultimaActividad ? formatearFecha(m.ultimaActividad) : "Nunca"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-base text-texto-suave">
          💡 En rojo: más de 20% de correcciones (la IA está leyendo mal esas boletas: revisar fotos o el tipo de boleta). La guía del piloto
          explica qué mirar cada semana: <code>docs/fase-7-piloto.md</code>.
        </p>
      </main>
    </div>
  );
}
