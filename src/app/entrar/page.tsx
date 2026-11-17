import type { Metadata } from "next";
import Link from "next/link";
import { BotonAyudaWhatsApp } from "@/components/BotonAyudaWhatsApp";
import { Aviso } from "@/components/ui/Aviso";
import { Pantalla } from "@/components/ui/Pantalla";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { cuenta, clave } = await searchParams;

  return (
    <>
      <Pantalla titulo="Entrar" volverA="/">
        {cuenta === "creada" && (
          <div className="mb-6">
            <Aviso tipo="exito">Listo, tu cuenta está creada. Entra con tu RUT y tu clave.</Aviso>
          </div>
        )}
        {clave === "cambiada" && (
          <div className="mb-6">
            <Aviso tipo="exito">Listo, tu clave nueva quedó guardada. Entra con ella.</Aviso>
          </div>
        )}
        <FormularioEntrar />
        <div className="mt-8 space-y-4 text-center text-lg">
          <p>
            <Link href="/recuperar-clave" className="font-semibold text-marca underline">
              ¿Olvidaste tu clave?
            </Link>
          </p>
          <p className="text-texto-suave">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-marca underline">
              Crear mi cuenta
            </Link>
          </p>
        </div>
      </Pantalla>
      <BotonAyudaWhatsApp />
    </>
  );
}
