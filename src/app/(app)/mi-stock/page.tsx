import type { Metadata } from "next";
import Link from "next/link";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearPesos } from "@/lib/formato";
import { obtenerProductos } from "@/lib/productos";
import { exigirSesionDeNegocio } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mi stock" };

export default async function PaginaMiStock({ searchParams }: PageProps<"/mi-stock">) {
  const sesion = await exigirSesionDeNegocio();
  const { listo, cambios } = await searchParams;
  const productos = await obtenerProductos(sesion);
  const esDueno = sesion.usuario.rol === "dueno";

  if (productos.length === 0) {
    return (
      <Pantalla titulo="Mi stock" volverA="/inicio">
        <div className="rounded-3xl bg-fondo p-6 text-center shadow-sm">
          <p aria-hidden="true" className="text-6xl">
            📦
          </p>
          <p className="mt-4 text-xl font-semibold text-texto">Todavía no tienes productos</p>
          <p className="mt-2 text-lg text-texto-suave">
            Se suman solos cuando subes una boleta. También puedes agregarlos tú, uno por uno.
          </p>
        </div>
        {esDueno && (
          <div className="mt-8">
            <BotonEnlace href="/mi-stock/productos/nuevo" icono="➕">
              Agregar mi primer producto
            </BotonEnlace>
          </div>
        )}
      </Pantalla>
    );
  }

  const faltan = productos.filter((p) => p.seAcaba).length;
  const sinVenta = productos.filter((p) => p.sinMovimiento).length;
  const margenBajo = productos.filter((p) => p.margenBajo).length;
  const valor = productos.reduce((total, p) => total + Math.max(p.stock, 0) * (p.costo ?? 0), 0);

  return (
    <Pantalla titulo="Mi stock" volverA="/inicio">
      {listo === "conteo" && (
        <div className="mb-6">
          <Aviso tipo="exito">
            {Number(cambios) > 0
              ? `Listo, se corrigió el stock de ${cambios} ${Number(cambios) === 1 ? "producto" : "productos"}.`
              : "Listo, todo cuadraba. No hubo que corregir nada."}
          </Aviso>
        </div>
      )}

      <div className="space-y-4">
        <Tarjeta
          color={faltan > 0 ? "rojo" : "verde"}
          icono={faltan > 0 ? "🔴" : "✅"}
          titulo={faltan > 0 ? `Te ${faltan === 1 ? "falta 1 producto" : `faltan ${faltan} productos`}` : "No te falta nada"}
          detalle={faltan > 0 ? "Se están acabando. Anótalos para tu próxima compra." : "Ningún producto está bajo el mínimo."}
          enlace={faltan > 0 ? { href: "/mi-stock/productos?filtro=faltan", texto: "Ver cuáles" } : undefined}
        />
        {sinVenta > 0 && (
          <Tarjeta
            color="amarillo"
            icono="😴"
            titulo={`${sinVenta} sin venta hace un mes`}
            detalle="No se han movido en más de 30 días."
            enlace={{ href: "/mi-stock/productos?filtro=sin-venta", texto: "Ver cuáles" }}
          />
        )}
        {esDueno && margenBajo > 0 && (
          <Tarjeta
            color="amarillo"
            icono="📉"
            titulo={`Ganas poco con ${margenBajo} ${margenBajo === 1 ? "producto" : "productos"}`}
            detalle="Su precio deja menos ganancia de la que quieres."
            enlace={{ href: "/mi-stock/productos?filtro=margen-bajo", texto: "Ver cuáles" }}
          />
        )}
        {esDueno && (
          <Tarjeta
            color="neutro"
            icono="💰"
            titulo={`Tu mercadería vale ${formatearPesos(valor)}`}
            detalle={`Lo que te costaron tus ${productos.length} productos.`}
          />
        )}
      </div>

      <div className="mt-8 space-y-3">
        <BotonEnlace href="/mi-stock/productos" icono="📋">
          Ver todos mis productos
        </BotonEnlace>
        <BotonEnlace href="/mi-stock/conteo" variante="secundario" icono="🔢">
          Contar lo que tengo
        </BotonEnlace>
      </div>

      <div className="mt-8">
        <ComoSeUsa
          pasos={[
            { dibujo: "📷", texto: "Lo que compras se suma solo cuando subes la boleta." },
            { dibujo: "🛒", texto: "Lo que vendes se descuenta solo en “Vender”." },
            { dibujo: "🔢", texto: "Si algo no cuadra, cuéntalo y la app lo corrige." },
          ]}
        />
      </div>
    </Pantalla>
  );
}

const COLORES = {
  rojo: "border-falta",
  amarillo: "border-acento",
  verde: "border-ok",
  neutro: "border-marca",
} as const;

function Tarjeta({
  color,
  icono,
  titulo,
  detalle,
  enlace,
}: {
  color: keyof typeof COLORES;
  icono: string;
  titulo: string;
  detalle: string;
  enlace?: { href: string; texto: string };
}) {
  return (
    <div className={`rounded-2xl border-l-8 bg-fondo p-5 shadow-sm ${COLORES[color]}`}>
      <p className="flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl leading-none">
          {icono}
        </span>
        <span>
          <strong className="block font-titulo text-xl leading-snug text-texto">{titulo}</strong>
          <span className="text-lg text-texto-suave">{detalle}</span>
        </span>
      </p>
      {enlace && (
        <Link
          href={enlace.href}
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-fondo-suave text-lg font-semibold text-marca hover:bg-marca-claro"
        >
          {enlace.texto}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
