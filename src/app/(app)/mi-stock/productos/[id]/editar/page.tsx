import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { obtenerCategorias, obtenerProducto } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { editarProducto } from "../../../acciones";
import { FormularioProducto } from "../../FormularioProducto";

export const metadata: Metadata = { title: "Cambiar datos" };

const enTexto = (valor: number) => String(valor).replace(".", ",");

export default async function PaginaEditarProducto({ params }: PageProps<"/mi-stock/productos/[id]/editar">) {
  const sesion = await exigirSesionDeNegocio();
  const { id } = await params;
  if (sesion.usuario.rol !== "dueno") redirect(`/mi-stock/productos/${id}`);

  const [producto, categorias] = await Promise.all([obtenerProducto(sesion, id), obtenerCategorias()]);
  if (!producto) notFound();

  return (
    <FormularioProducto
      modo="editar"
      categorias={categorias}
      volverA={`/mi-stock/productos/${id}`}
      quitarHref={`/mi-stock/productos/${id}/quitar`}
      accion={editarProducto.bind(null, id)}
      inicial={{
        nombre: producto.nombre,
        categoriaId: producto.categoria?.id ?? "",
        unidad: producto.unidad,
        precioVenta: String(producto.precioVenta),
        codigoBarras: producto.codigoBarras ?? "",
        stockMinimo: enTexto(producto.stockMinimo),
      }}
    />
  );
}
