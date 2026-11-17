import type { Metadata } from "next";
import Link from "next/link";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Pantalla } from "@/components/ui/Pantalla";
import { obtenerCategorias, obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";

export const metadata: Metadata = { title: "Contar lo que tengo" };

export default async function PaginaConteo() {
  const sesion = await exigirSesionDeNegocio();
  const [categorias, productos] = await Promise.all([obtenerCategorias(), obtenerProductos(sesion)]);
  const cuantos = (categoriaId: string) => productos.filter((p) => p.categoria?.id === categoriaId).length;
  const conProductos = categorias.filter((c) => cuantos(c.id) > 0);

  return (
    <Pantalla titulo="¿Qué quieres contar?" antesDelTitulo="Contar lo que tengo" volverA="/mi-stock">
      <p className="-mt-2 mb-6 text-lg text-texto-suave">Elige una categoría. Vas a ver los productos de a uno.</p>
      {conProductos.length === 0 ? (
        <p className="rounded-2xl bg-fondo p-6 text-center text-xl text-texto-suave shadow-sm">Todavía no tienes productos para contar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {conProductos.map((c) => (
            <li key={c.id}>
              <Link
                href={`/mi-stock/conteo/${c.id}`}
                className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl bg-fondo p-3 text-center shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
              >
                <span aria-hidden="true" className="text-4xl">
                  {c.icono}
                </span>
                <span className="text-lg leading-snug font-semibold text-texto">{c.nombre}</span>
                <span className="text-base text-texto-suave">
                  {cuantos(c.id)} {cuantos(c.id) === 1 ? "producto" : "productos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <ComoSeUsa
          pasos={[
            { dibujo: "🗂️", texto: "Elige una categoría, por ejemplo Panadería." },
            { dibujo: "🔢", texto: "Cuenta cada producto y escribe cuánto hay de verdad." },
            { dibujo: "✅", texto: "Al final aprieta Guardar: la app corrige solo lo que no cuadra." },
          ]}
        />
      </div>
    </Pantalla>
  );
}
