import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { clasesBoton } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";

export const metadata: Metadata = { title: "Descargar a Excel" };

const DESCARGAS = [
  { tipo: "productos", icono: "📦", texto: "Mis productos", detalle: "Stock, costo, precio y margen de cada uno" },
  { tipo: "compras", icono: "📷", texto: "Lo que compré", detalle: "Cada producto de cada boleta, con su proveedor" },
  { tipo: "ventas", icono: "🛒", texto: "Lo que vendí", detalle: "Cada venta, con vendedor y medio de pago" },
  { tipo: "movimientos", icono: "🔁", texto: "Todo lo que entró y salió", detalle: "Compras, ventas, pérdidas y conteos" },
] as const;

export default async function PaginaExportar({ searchParams }: PageProps<"/mas/exportar">) {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const { error } = await searchParams;

  return (
    <Pantalla titulo="Descargar a Excel" volverA="/mas">
      {error && (
        <div className="mb-6">
          <Aviso tipo="error">No pudimos preparar el archivo. Revisa tu internet e intenta de nuevo.</Aviso>
        </div>
      )}
      <p className="-mt-2 mb-6 text-lg text-texto-suave">Toca lo que quieres descargar. Se abre con Excel o Google Sheets. Sirve también para tu contador.</p>
      <ul className="space-y-3">
        {DESCARGAS.map((d) => (
          <li key={d.tipo}>
            <a href={`/api/exportar/${d.tipo}`} download className={clasesBoton("suave", "min-h-20 flex-col items-start! gap-0! text-left")}>
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl leading-none">
                  {d.icono}
                </span>
                {d.texto}
              </span>
              <span className="pl-9 text-base font-normal text-texto-suave">{d.detalle}</span>
            </a>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}
