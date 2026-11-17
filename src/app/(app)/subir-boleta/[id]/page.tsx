import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { nombreDesdeDescripcion, sugerirProducto } from "@/lib/asociar";
import { obtenerAprendido, obtenerDocumento } from "@/lib/compras";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { obtenerCategorias, obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { ConfirmarBoleta, type ItemInicial } from "./ConfirmarBoleta";

export const metadata: Metadata = { title: "Revisar boleta" };

export default async function PaginaBoleta({ params, searchParams }: PageProps<"/subir-boleta/[id]">) {
  const sesion = await exigirSesionDeNegocio();
  const { id } = await params;
  const { error } = await searchParams;
  const documento = await obtenerDocumento(id);
  if (!documento) notFound();

  // Boleta ya confirmada: solo se muestra.
  if (documento.estado === "confirmado") {
    return (
      <Pantalla titulo={documento.proveedor ?? "Compra"} antesDelTitulo="Boleta sumada al stock" volverA="/subir-boleta">
        <p className="-mt-3 text-lg text-texto-suave">
          {documento.fecha ? formatearFecha(`${documento.fecha}T12:00:00`) : ""}
          {documento.numero ? ` · N° ${documento.numero}` : ""}
        </p>
        <ul className="mt-6 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
          {documento.items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1">
                <span className="block text-lg font-semibold text-texto">{item.producto ?? item.descripcion}</span>
                <span className="text-base text-texto-suave">
                  {new Intl.NumberFormat("es-CL").format(item.cantidad)} × {formatearPesos(item.precioUnitario)}
                </span>
              </span>
              <span className="text-lg font-semibold whitespace-nowrap">{formatearPesos(item.total)}</span>
            </li>
          ))}
        </ul>
        {documento.total != null && (
          <p className="mt-4 text-right font-titulo text-2xl font-bold text-texto">Total {formatearPesos(documento.total)}</p>
        )}
        {documento.imagenUrl && (
          <div className="mt-8">
            <BotonEnlace href={documento.imagenUrl} target="_blank" variante="secundario" icono="🧾">
              Ver la foto de la boleta
            </BotonEnlace>
          </div>
        )}
      </Pantalla>
    );
  }

  const [productos, categorias] = await Promise.all([obtenerProductos(sesion), obtenerCategorias()]);
  const lectura = documento.lectura;
  const { proveedorId, alias } = await obtenerAprendido(lectura?.proveedorNombre ?? null, lectura?.proveedorRut ?? null);
  const paraAsociar = productos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const margenPorCategoria = new Map(categorias.map((c) => [c.id, c.margenObjetivo]));

  const items: ItemInicial[] = (lectura?.items ?? []).map((item) => {
    const sugerencia = sugerirProducto(item.descripcion, proveedorId, paraAsociar, alias);
    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      productoId: sugerencia?.productoId ?? null,
      motivo: sugerencia?.motivo ?? null,
      nombreNuevo: nombreDesdeDescripcion(item.descripcion),
    };
  });

  return (
    <>
      {error && (
        <div className="mx-auto max-w-xl px-4 pt-4">
          <Aviso tipo="error">
            {error === "demo" ? "En el negocio de ejemplo no se guardan cambios." : "No pudimos hacer eso. Intenta de nuevo."}
          </Aviso>
        </div>
      )}
      <ConfirmarBoleta
        documentoId={documento.id}
        esDemo={sesion.empresa.esDemo}
        imagenUrl={documento.imagenUrl}
        leidaPorIA={Boolean(lectura)}
        datos={{
          tipo: lectura?.tipo ?? "boleta",
          proveedorNombre: lectura?.proveedorNombre ?? "",
          proveedorRut: lectura?.proveedorRut ?? null,
          numero: lectura?.numero ?? "",
          fecha: lectura?.fecha ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }),
          total: lectura?.total ?? null,
          neto: lectura?.neto ?? null,
          iva: lectura?.iva ?? null,
        }}
        items={items}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre, unidad: p.unidad, categoria: p.categoria?.icono ?? "📦" }))}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          icono: c.icono,
          margen: margenPorCategoria.get(c.id) ?? 25,
        }))}
      />
    </>
  );
}
