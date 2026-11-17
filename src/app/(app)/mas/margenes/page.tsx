import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearPorcentaje } from "@/lib/formato";
import { obtenerCategorias } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";

export const metadata: Metadata = { title: "Cuánto quiero ganar" };

export default async function PaginaMargenes({ searchParams }: PageProps<"/mas/margenes">) {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const { listo } = await searchParams;
  const categorias = await obtenerCategorias();

  return (
    <Pantalla titulo="Cuánto quiero ganar" antesDelTitulo="Margen por categoría" volverA="/mas">
      {listo && (
        <div className="mb-6">
          <Aviso tipo="exito">Listo, se guardó el margen. Los precios sugeridos ya lo usan.</Aviso>
        </div>
      )}
      <p className="-mt-2 mb-6 text-lg text-texto-suave">
        De cada venta, qué parte quieres que sea ganancia. Con esto la app te sugiere precios y te avisa si ganas poco.
      </p>
      <ul className="space-y-2">
        {categorias.map((c) => (
          <li key={c.id}>
            <Link
              href={`/mas/margenes/${c.id}`}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-fondo px-4 py-3 shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
            >
              <span aria-hidden="true" className="text-2xl">
                {c.icono}
              </span>
              <span className="flex-1 text-lg font-semibold text-texto">{c.nombre}</span>
              <span className="rounded-full bg-fondo-suave px-3 py-1 text-lg font-semibold text-texto">{formatearPorcentaje(c.margenObjetivo)}</span>
              <span aria-hidden="true" className="text-xl text-texto-suave">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}
