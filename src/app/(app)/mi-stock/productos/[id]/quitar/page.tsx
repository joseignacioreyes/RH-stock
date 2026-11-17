import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { obtenerProducto } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { quitarProducto } from "../../../acciones";

export const metadata: Metadata = { title: "Quitar producto" };

// Nada se borra sin preguntar (CLAUDE.md, regla 11).
export default async function PaginaQuitar({ params }: PageProps<"/mi-stock/productos/[id]/quitar">) {
  const sesion = await exigirSesionDeNegocio();
  const { id } = await params;
  if (sesion.usuario.rol !== "dueno") redirect(`/mi-stock/productos/${id}`);
  const producto = await obtenerProducto(sesion, id);
  if (!producto) notFound();

  return (
    <Pantalla titulo={`¿Seguro que quieres quitar ${producto.nombre}?`} volverA={`/mi-stock/productos/${id}/editar`}>
      <p className="text-xl text-texto-suave">
        Ya no aparecerá en tu lista ni en la caja. Lo que pasó con este producto (compras y ventas) queda guardado.
      </p>
      <form action={quitarProducto.bind(null, id)} className="mt-8 space-y-3">
        <Boton type="submit" icono="🗑️" className="bg-falta! hover:bg-red-700! active:bg-red-700!">
          Sí, quitarlo
        </Boton>
        <BotonEnlace href={`/mi-stock/productos/${id}`} variante="secundario" icono="↩️">
          No, dejarlo
        </BotonEnlace>
      </form>
    </Pantalla>
  );
}
