// Descarga a Excel de las métricas del piloto (solo el administrador de RH Stock).
import { NextResponse, type NextRequest } from "next/server";
import { aCsv, fechaCsv, nombreArchivo } from "@/lib/exportar";
import { COLUMNAS_METRICAS, esPeriodo, obtenerMetricas, type MetricasNegocio } from "@/lib/metricas";
import { obtenerSesion } from "@/lib/sesion";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion?.usuario.rol !== "admin") return NextResponse.redirect(new URL("/entrar", request.url));

  const crudo = request.nextUrl.searchParams.get("periodo");
  const periodo = esPeriodo(crudo) ? crudo : "7";
  const metricas = await obtenerMetricas(periodo);

  const csv = aCsv<MetricasNegocio>(
    [
      { titulo: "Negocio", valor: (m) => m.negocio },
      { titulo: "Comuna", valor: (m) => m.comuna },
      { titulo: "Registrado", valor: (m) => fechaCsv(m.creadaEn) },
      ...COLUMNAS_METRICAS.map((c) => ({ titulo: c.titulo, valor: c.valor })),
      { titulo: "Vendido ($)", valor: (m) => m.montoVendido },
      { titulo: "Última actividad", valor: (m) => fechaCsv(m.ultimaActividad) },
    ],
    metricas,
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo(`piloto-${periodo === "todo" ? "total" : `${periodo}-dias`}`)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
