import type { Metadata } from "next";
import { MuyPronto } from "@/components/MuyPronto";

export const metadata: Metadata = { title: "Avisos" };

export default function Pagina() {
  return <MuyPronto titulo="Avisos" icono="🔔" descripcion="Aquí te avisaremos cuando algo se esté acabando o cuando suba el precio de compra." />;
}
