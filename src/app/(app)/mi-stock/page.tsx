import type { Metadata } from "next";
import { MuyPronto } from "@/components/MuyPronto";

export const metadata: Metadata = { title: "Mi stock" };

export default function Pagina() {
  return <MuyPronto titulo="Mi stock" icono="📦" descripcion="Aquí vas a ver qué te queda, qué se está acabando y cuánto vale tu mercadería." />;
}
