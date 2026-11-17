import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Vendedores" };

const MENSAJES: Record<string, string> = {
  agregado: "Listo, el vendedor ya puede entrar a la caja con su PIN.",
  desactivado: "Listo, ese vendedor ya no puede entrar a la caja. Sus ventas quedan guardadas.",
};

export default async function PaginaVendedores({ searchParams }: PageProps<"/mas/vendedores">) {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const { listo, error } = await searchParams;
  const supabase = await crearClienteServidor();
  const { data: vendedores } = await supabase.from("vendedores").select("id, nombre").eq("activo", true).order("nombre");

  return (
    <Pantalla titulo="Vendedores" volverA="/mas">
      {typeof listo === "string" && MENSAJES[listo] && (
        <div className="mb-6">
          <Aviso tipo="exito">{MENSAJES[listo]}</Aviso>
        </div>
      )}
      {error === "demo" && (
        <div className="mb-6">
          <Aviso tipo="error">En el negocio de ejemplo no se cambian los vendedores.</Aviso>
        </div>
      )}
      <p className="-mt-2 mb-6 text-lg text-texto-suave">Cada vendedor entra a la caja con su PIN de 4 números, y sus ventas quedan a su nombre.</p>
      {(vendedores ?? []).length === 0 ? (
        <p className="rounded-2xl bg-fondo p-6 text-center text-lg text-texto-suave shadow-sm">Todavía no tienes vendedores. Si vendes tú solo, no necesitas agregar ninguno.</p>
      ) : (
        <ul className="space-y-2">
          {(vendedores ?? []).map((v) => (
            <li key={v.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-fondo px-4 py-3 shadow-sm">
              <span aria-hidden="true" className="text-2xl">
                🧑
              </span>
              <span className="flex-1 text-lg font-semibold text-texto">{v.nombre}</span>
              <Link href={`/mas/vendedores/${v.id}/desactivar`} className="inline-flex min-h-12 items-center px-2 text-lg font-semibold text-falta underline">
                Desactivar
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <BotonEnlace href="/mas/vendedores/nuevo" icono="➕">
          Agregar vendedor
        </BotonEnlace>
      </div>
    </Pantalla>
  );
}
