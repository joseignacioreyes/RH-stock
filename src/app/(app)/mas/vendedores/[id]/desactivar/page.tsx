import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { desactivarVendedor } from "../../acciones";

export const metadata: Metadata = { title: "Desactivar vendedor" };

export default async function PaginaDesactivar({ params }: PageProps<"/mas/vendedores/[id]/desactivar">) {
  const { usuario } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: vendedor } = await supabase.from("vendedores").select("id, nombre").eq("id", id).maybeSingle();
  if (!vendedor) notFound();

  return (
    <Pantalla titulo={`¿Seguro que quieres desactivar a ${vendedor.nombre}?`} volverA="/mas/vendedores">
      <p className="text-xl text-texto-suave">Ya no podrá entrar a la caja con su PIN. Sus ventas anteriores quedan guardadas.</p>
      <form action={desactivarVendedor.bind(null, vendedor.id)} className="mt-8 space-y-3">
        <Boton type="submit" icono="🚫" className="bg-falta! hover:bg-red-700! active:bg-red-700!">
          Sí, desactivar
        </Boton>
        <BotonEnlace href="/mas/vendedores" variante="secundario" icono="↩️">
          No, volver
        </BotonEnlace>
      </form>
    </Pantalla>
  );
}
