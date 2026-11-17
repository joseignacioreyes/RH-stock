import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Aviso } from "@/components/ui/Aviso";
import { Pantalla } from "@/components/ui/Pantalla";
import { obtenerUltimasCompras, type EstadoDocumento } from "@/lib/compras";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { ingresarAMano } from "./acciones";
import { SubirFoto } from "./SubirFoto";

export const metadata: Metadata = { title: "Subir boleta" };

const ESTADOS: Record<EstadoDocumento, { texto: string; clases: string }> = {
  por_confirmar: { texto: "Falta revisar", clases: "bg-acento text-texto" },
  revision_manual: { texto: "Falta revisar", clases: "bg-acento text-texto" },
  procesando: { texto: "Falta revisar", clases: "bg-acento text-texto" },
  confirmado: { texto: "Sumada al stock", clases: "bg-green-100 text-green-800" },
};

export default async function PaginaSubirBoleta({ searchParams }: PageProps<"/subir-boleta">) {
  await exigirSesionDeNegocio();
  const { listo, error } = await searchParams;
  const compras = await obtenerUltimasCompras();

  return (
    <Pantalla titulo="Subir boleta" antesDelTitulo="Lo que compré" volverA="/inicio">
      {listo && listo !== "descartada" && (
        <div className="mb-6">
          <Aviso tipo="exito">
            Listo, se {listo === "1" ? "sumó 1 producto" : `sumaron ${listo} productos`} a tu stock.
          </Aviso>
        </div>
      )}
      {listo === "descartada" && (
        <div className="mb-6">
          <Aviso tipo="exito">Listo, la boleta se descartó. No se sumó nada a tu stock.</Aviso>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <Aviso tipo="error">
            {error === "demo"
              ? "En el negocio de ejemplo no se guardan cambios. Abre la boleta de ejemplo que está lista para revisar."
              : "No pudimos hacer eso. Revisa tu internet e intenta de nuevo."}
          </Aviso>
        </div>
      )}

      <SubirFoto />

      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-fondo p-4 shadow-sm">
        <Image
          src="/ejemplos/boleta-bien-tomada.jpg"
          alt="Ejemplo de foto bien tomada: la boleta completa, derecha y con buena luz"
          width={112}
          height={164}
          className="h-auto w-24 shrink-0 rounded-lg"
        />
        <div>
          <p className="text-lg font-semibold text-texto">Así sale bien:</p>
          <ul className="mt-1 space-y-1 text-lg text-texto-suave">
            <li>✅ Toda la boleta dentro</li>
            <li>✅ Con buena luz</li>
            <li>✅ Derecha y sin arrugas</li>
          </ul>
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-texto">Últimas compras</h2>
      {compras.length === 0 ? (
        <p className="mt-3 text-lg text-texto-suave">Todavía no subes boletas. ¡Saca la foto de tu primera compra!</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {compras.map((c) => {
            const estado = ESTADOS[c.estado];
            return (
              <li key={c.id}>
                <Link
                  href={`/subir-boleta/${c.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-fondo px-4 py-3 shadow-sm ring-1 ring-black/5 hover:bg-marca-claro"
                >
                  <span className="flex-1">
                    <span className="block text-lg leading-snug font-semibold text-texto">{c.proveedor ?? "Compra sin revisar"}</span>
                    <span className="block text-base text-texto-suave">
                      {formatearFecha(c.fecha ? `${c.fecha}T12:00:00` : c.creadoEn)}
                      {c.productos > 0 ? ` · ${c.productos} ${c.productos === 1 ? "producto" : "productos"}` : ""}
                      {c.total ? ` · ${formatearPesos(c.total)}` : ""}
                    </span>
                    <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-base font-semibold ${estado.clases}`}>{estado.texto}</span>
                  </span>
                  <span aria-hidden="true" className="text-xl text-texto-suave">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <form action={ingresarAMano} className="mt-8 text-center">
        <button type="submit" className="inline-flex min-h-12 items-center gap-2 px-3 text-lg font-semibold text-marca underline">
          <span aria-hidden="true">✍️</span> No tengo foto: ingresar la compra a mano
        </button>
      </form>

      <div className="mt-6">
        <ComoSeUsa
          pasos={[
            { dibujo: "📷", texto: "Sácale una foto a la boleta o factura de lo que compraste." },
            { dibujo: "👀", texto: "Revisa lo que leyó la app, producto por producto." },
            { dibujo: "✅", texto: "Aprieta “Sumar a mi stock” y listo." },
          ]}
        />
      </div>
    </Pantalla>
  );
}
