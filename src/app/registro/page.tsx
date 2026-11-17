import type { Metadata } from "next";
import { BotonAyudaWhatsApp } from "@/components/BotonAyudaWhatsApp";
import { FormularioRegistro } from "./FormularioRegistro";

export const metadata: Metadata = { title: "Crear mi cuenta" };

export default function PaginaRegistro() {
  return (
    <>
      <FormularioRegistro />
      <BotonAyudaWhatsApp mensaje="Hola, necesito ayuda para crear mi cuenta en RH Stock" />
    </>
  );
}
