import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Pantalla } from "@/components/ui/Pantalla";
import { obtenerCategorias } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { guardarMargen } from "../../acciones";
import { FormularioPorcentaje } from "../../FormularioPorcentaje";

export const metadata: Metadata = { title: "Cambiar margen" };

export default async function PaginaMargen({ params }: PageProps<"/mas/margenes/[id]">) {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const { id } = await params;
  const categoria = (await obtenerCategorias()).find((c) => c.id === id);
  if (!categoria) notFound();

  return (
    <Pantalla titulo={`${categoria.icono} ${categoria.nombre}`} antesDelTitulo="Cuánto quiero ganar" volverA="/mas/margenes">
      <FormularioPorcentaje
        etiqueta="Margen objetivo (%)"
        ayuda="Ejemplo: con 25%, algo que te cuesta $750 se sugiere a $1.000."
        nombre="margen"
        valorInicial={categoria.margenObjetivo}
        accion={guardarMargen.bind(null, categoria.id)}
      />
    </Pantalla>
  );
}
