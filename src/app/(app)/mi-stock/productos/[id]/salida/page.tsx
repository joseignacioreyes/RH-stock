import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearCantidad, nombreUnidad } from "@/lib/formato";
import { obtenerProducto } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { FormularioSalida } from "./FormularioSalida";

export const metadata: Metadata = { title: "Descontar pérdida o regalo" };

export default async function PaginaSalida({ params }: PageProps<"/mi-stock/productos/[id]/salida">) {
  const sesion = await exigirSesionDeNegocio();
  const { id } = await params;
  const producto = await obtenerProducto(sesion, id);
  if (!producto) notFound();

  return (
    <Pantalla titulo="¿Qué pasó?" antesDelTitulo={producto.nombre} volverA={`/mi-stock/productos/${id}`}>
      <p className="-mt-2 mb-6 text-lg text-texto-suave">Me queda {formatearCantidad(producto.stock, producto.unidad)}.</p>
      <FormularioSalida productoId={id} unidad={nombreUnidad(producto.unidad)} permiteDecimales={producto.unidad === "kg" || producto.unidad === "litro"} />
      <div className="mt-8">
        <ComoSeUsa
          pasos={[
            { dibujo: "🗑️", texto: "Elige qué pasó: se echó a perder, se venció, lo usaste tú o lo regalaste." },
            { dibujo: "✍️", texto: "Escribe cuánto. Para el pan o la fruta puedes poner kilos con coma: 1,5." },
            { dibujo: "✅", texto: "Aprieta Guardar y se descuenta de tu stock." },
          ]}
        />
      </div>
    </Pantalla>
  );
}
