import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Pantalla } from "@/components/ui/Pantalla";
import { exigirSesionDeNegocio } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { guardarUmbral } from "../acciones";
import { FormularioPorcentaje } from "../FormularioPorcentaje";

export const metadata: Metadata = { title: "Aviso de cambio de costo" };

export default async function PaginaAvisoCosto() {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  if (usuario.rol !== "dueno") redirect("/mas");
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("empresas").select("umbral_aviso_costo").eq("id", empresa.id).single();

  return (
    <Pantalla titulo="¿Cuándo te avisamos?" antesDelTitulo="Aviso de cambio de costo" volverA="/mas">
      <p className="-mt-2 mb-6 text-lg text-texto-suave">
        Cuando compras algo más caro (o más barato) que la vez anterior, te avisamos si el cambio es mayor a este porcentaje.
      </p>
      <FormularioPorcentaje
        etiqueta="Avisarme si el costo cambia más de (%)"
        ayuda="Con 5%, algo que te costaba $1.000 te avisa si pasa de $1.050."
        nombre="umbral"
        valorInicial={Number(data?.umbral_aviso_costo ?? 5)}
        accion={guardarUmbral}
      />
    </Pantalla>
  );
}
