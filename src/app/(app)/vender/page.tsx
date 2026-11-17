import type { Metadata } from "next";
import { MuyPronto } from "@/components/MuyPronto";

export const metadata: Metadata = { title: "Vender" };

export default function Pagina() {
  return <MuyPronto titulo="Vender" icono="🛒" descripcion="Aquí vas a vender escaneando el código o tocando botones grandes, y el stock se descontará solo." />;
}
