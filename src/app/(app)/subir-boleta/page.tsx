import type { Metadata } from "next";
import { MuyPronto } from "@/components/MuyPronto";

export const metadata: Metadata = { title: "Subir boleta" };

export default function Pagina() {
  return <MuyPronto titulo="Subir boleta" icono="📷" descripcion="Aquí vas a sacarle una foto a tu boleta de compra y lo que compraste se sumará solo a tu stock." />;
}
