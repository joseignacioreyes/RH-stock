import type { Metadata } from "next";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Aviso as Mensaje } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { obtenerAvisos, type TipoAviso } from "@/lib/avisos";
import { formatearCantidad, formatearFecha, formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { abrirAviso, marcarTodosLeidos } from "./acciones";

export const metadata: Metadata = { title: "Avisos" };

const ESTILO: Record<TipoAviso, { icono: string; borde: string; boton: string }> = {
  stock_bajo: { icono: "🔴", borde: "border-falta", boton: "Ver producto" },
  costo_sube: { icono: "📈", borde: "border-acento", boton: "Ver precio sugerido" },
  costo_baja: { icono: "📉", borde: "border-ok", boton: "Ver producto" },
};

export default async function PaginaAvisos({ searchParams }: PageProps<"/avisos">) {
  await exigirSesionDeNegocio();
  const { listo, error } = await searchParams;
  const avisos = await obtenerAvisos();
  const sinLeer = avisos.filter((a) => !a.leida);
  const leidos = avisos.filter((a) => a.leida);

  return (
    <Pantalla titulo="Avisos" antesDelTitulo="Lo que debo revisar" volverA="/inicio">
      {listo === "leidos" && (
        <div className="mb-6">
          <Mensaje tipo="exito">Listo, marcaste todos los avisos como vistos.</Mensaje>
        </div>
      )}
      {error === "demo" && (
        <div className="mb-6">
          <Mensaje tipo="error">En el negocio de ejemplo los avisos quedan siempre igual, para que todos puedan verlos.</Mensaje>
        </div>
      )}

      {sinLeer.length === 0 ? (
        <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm">
          <p aria-hidden="true" className="text-6xl">
            😌
          </p>
          <p className="mt-4 text-xl font-semibold text-texto">No tienes avisos nuevos</p>
          <p className="mt-2 text-lg text-texto-suave">Te avisamos aquí cuando algo se esté acabando o cambie el precio de compra.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sinLeer.map((aviso) => {
            const estilo = ESTILO[aviso.tipo];
            return (
              <li key={aviso.id} className={`rounded-2xl border-l-8 bg-fondo p-5 shadow-sm ${estilo.borde}`}>
                <p className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-3xl leading-none">
                    {estilo.icono}
                  </span>
                  <span>
                    <span className="block text-lg leading-snug font-semibold text-texto">{aviso.mensaje}</span>
                    <span className="mt-1 block text-base text-texto-suave">
                      {aviso.tipo === "stock_bajo" && aviso.producto
                        ? `Hoy te ${aviso.producto.stock === 1 ? "queda" : "quedan"} ${formatearCantidad(aviso.producto.stock, aviso.producto.unidad)} · `
                        : ""}
                      {aviso.tipo === "costo_sube" && aviso.producto && aviso.precioSugerido && aviso.precioSugerido > aviso.producto.precioVenta
                        ? `Hoy lo vendes a ${formatearPesos(aviso.producto.precioVenta)} · `
                        : ""}
                      {formatearFecha(aviso.fecha)}
                    </span>
                  </span>
                </p>
                <form action={abrirAviso.bind(null, aviso.id, aviso.producto?.id ?? null)} className="mt-4">
                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-fondo-suave text-lg font-semibold text-marca hover:bg-marca-claro"
                  >
                    {estilo.boton}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {sinLeer.length > 1 && (
        <form action={marcarTodosLeidos} className="mt-6">
          <Boton type="submit" variante="secundario" icono="👌">
            Ya los vi todos
          </Boton>
        </form>
      )}

      {leidos.length > 0 && (
        <>
          <h2 className="mt-10 text-2xl font-bold text-texto">Ya vistos</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
            {leidos.map((aviso) => (
              <li key={aviso.id} className="flex items-start gap-3 px-4 py-3 text-texto-suave">
                <span aria-hidden="true" className="text-xl">
                  {ESTILO[aviso.tipo].icono}
                </span>
                <span className="text-base leading-snug">
                  {aviso.mensaje} <span className="whitespace-nowrap">· {formatearFecha(aviso.fecha)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8">
        <ComoSeUsa
          pasos={[
            { dibujo: "🔴", texto: "Cuando algo llega al mínimo que elegiste, aparece aquí para que lo compres." },
            { dibujo: "📈", texto: "Si una compra sale más cara (o más barata), te avisamos y te sugerimos un precio." },
            { dibujo: "👆", texto: "Toca el aviso para ver el producto. Se quita solo cuando lo revisas o lo repones." },
          ]}
        />
      </div>
    </Pantalla>
  );
}
