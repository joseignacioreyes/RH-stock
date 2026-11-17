import type { Metadata } from "next";
import { Aviso } from "@/components/ui/Aviso";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioCierre } from "./FormularioCierre";

export const metadata: Metadata = { title: "Cierre de caja" };

const MEDIOS = { efectivo: "💵 Efectivo", debito: "💳 Débito", credito: "💳 Crédito", transferencia: "📲 Transferencia" } as const;

/** Hoy en Chile, como AAAA-MM-DD. */
const hoyEnChile = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

/** Medianoche de Chile de una fecha, como ISO (para filtrar las ventas del día). */
function inicioDelDia(fecha: string) {
  const referencia = new Date(`${fecha}T12:00:00Z`);
  const desfase = new Date(referencia.toLocaleString("en-US", { timeZone: "America/Santiago" })).getTime() - referencia.getTime();
  return new Date(new Date(`${fecha}T00:00:00Z`).getTime() - desfase).toISOString();
}

export default async function PaginaCierre({ searchParams }: PageProps<"/vender/cierre">) {
  const { empresa } = await exigirSesionDeNegocio();
  const { listo } = await searchParams;
  const fecha = hoyEnChile();
  const desde = inicioDelDia(fecha);
  const hasta = new Date(new Date(desde).getTime() + 86_400_000).toISOString();

  const supabase = await crearClienteServidor();
  const [{ data: ventas }, { data: cierres }] = await Promise.all([
    supabase.from("ventas").select("total, medio_pago, vendedor:vendedores(nombre)").gte("fecha", desde).lt("fecha", hasta),
    supabase.from("cierres_caja").select("fecha, total_sistema, efectivo_sistema, efectivo_contado, diferencia").order("fecha", { ascending: false }).limit(4),
  ]);

  const lista = ventas ?? [];
  const total = lista.reduce((t, v) => t + v.total, 0);
  const porMedio = Object.entries(MEDIOS).map(([medio, texto]) => ({
    texto,
    total: lista.filter((v) => v.medio_pago === medio).reduce((t, v) => t + v.total, 0),
  }));
  const porVendedor = [...lista.reduce((mapa, v) => mapa.set(v.vendedor?.nombre ?? "Dueño", (mapa.get(v.vendedor?.nombre ?? "Dueño") ?? 0) + v.total), new Map<string, number>())];
  const efectivo = porMedio[0].total;
  const cierreDeHoy = (cierres ?? []).find((c) => c.fecha === fecha);

  return (
    <Pantalla titulo="Cierre de caja" antesDelTitulo={`Hoy, ${formatearFecha(`${fecha}T12:00:00`)}`} volverA="/vender">
      {listo && (
        <div className="mb-6">
          <Aviso tipo="exito">Listo, se guardó el cierre de hoy.</Aviso>
        </div>
      )}

      <div className="rounded-3xl bg-fondo p-5 text-center shadow-sm">
        <p className="text-lg text-texto-suave">
          Vendiste hoy ({lista.length} {lista.length === 1 ? "venta" : "ventas"})
        </p>
        <p className="font-titulo text-5xl font-bold text-texto">{formatearPesos(total)}</p>
      </div>

      <h2 className="mt-6 text-xl font-bold text-texto">Por medio de pago</h2>
      <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
        {porMedio.map((m) => (
          <li key={m.texto} className="flex justify-between px-4 py-3 text-lg">
            <span>{m.texto}</span>
            <span className="font-semibold">{formatearPesos(m.total)}</span>
          </li>
        ))}
      </ul>

      {porVendedor.length > 0 && (
        <>
          <h2 className="mt-6 text-xl font-bold text-texto">Por vendedor</h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
            {porVendedor.map(([nombre, monto]) => (
              <li key={nombre} className="flex justify-between px-4 py-3 text-lg">
                <span>🧑 {nombre}</span>
                <span className="font-semibold">{formatearPesos(monto)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8">
        <FormularioCierre fecha={fecha} efectivoSistema={efectivo} contadoAnterior={cierreDeHoy?.efectivo_contado ?? null} esDemo={empresa.esDemo} />
      </div>

      {(cierres ?? []).filter((c) => c.fecha !== fecha).length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold text-texto">Cierres anteriores</h2>
          <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
            {(cierres ?? [])
              .filter((c) => c.fecha !== fecha)
              .map((c) => (
                <li key={c.fecha} className="flex items-center justify-between gap-3 px-4 py-3 text-lg">
                  <span>
                    {formatearFecha(`${c.fecha}T12:00:00`)}
                    <span className="block text-base text-texto-suave">Vendido {formatearPesos(c.total_sistema)}</span>
                  </span>
                  <span className={`font-semibold ${c.diferencia === 0 ? "text-ok" : "text-falta"}`}>
                    {c.diferencia === 0 ? "✅ Cuadró" : c.diferencia < 0 ? `Faltaron ${formatearPesos(-c.diferencia)}` : `Sobraron ${formatearPesos(c.diferencia)}`}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </Pantalla>
  );
}
