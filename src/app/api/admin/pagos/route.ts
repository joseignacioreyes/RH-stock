// Descarga a Excel de los pagos confirmados (solo el administrador de RH Stock).
// Las columnas son las mismas de la hoja "Ingresos" de la planilla de cuentas.
import { NextResponse, type NextRequest } from "next/server";
import { aCsv, fechaCsv, nombreArchivo } from "@/lib/exportar";
import type { LecturaComprobante } from "@/lib/lector-comprobantes/esquema";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { nombrePeriodo, separarIva } from "@/lib/suscripcion";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion?.usuario.rol !== "admin") return NextResponse.redirect(new URL("/entrar", request.url));

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("pagos")
    .select("nombre_negocio, rut_empresa, periodo, monto, datos_extraidos, informado_en, fecha_confirmacion")
    .eq("estado", "confirmado")
    .order("fecha_confirmacion");
  type Fila = NonNullable<typeof data>[number];
  const fechaPago = (p: Fila) => (p.datos_extraidos as LecturaComprobante | null)?.fecha ?? p.informado_en ?? p.fecha_confirmacion;

  const csv = aCsv<Fila>(
    [
      { titulo: "Fecha de pago", valor: (p) => fechaCsv(fechaPago(p)) },
      { titulo: "Cliente", valor: (p) => p.nombre_negocio },
      { titulo: "RUT", valor: (p) => p.rut_empresa },
      { titulo: "Mes que paga", valor: (p) => nombrePeriodo(p.periodo) },
      { titulo: "Total recibido (con IVA)", valor: (p) => p.monto },
      { titulo: "Neto", valor: (p) => separarIva(p.monto).neto },
      { titulo: "IVA", valor: (p) => separarIva(p.monto).iva },
      { titulo: "N° de factura o boleta", valor: () => "" },
      { titulo: "Cómo pagó", valor: () => "Transferencia" },
      { titulo: "Confirmado el", valor: (p) => fechaCsv(p.fecha_confirmacion) },
    ],
    data ?? [],
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo("pagos-confirmados")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
