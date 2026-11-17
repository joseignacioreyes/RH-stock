import Link from "next/link";
import { Logo } from "@/components/marca/Logo";

export default function PaginaNoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6">
      <Logo />
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-3xl font-bold text-texto">No encontramos esta página</h1>
        <p className="mt-3 text-xl text-texto-suave">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
        <Link
          href="/"
          className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-marca px-6 text-xl font-semibold text-white transition-colors hover:bg-marca-oscuro active:bg-marca-oscuro"
        >
          <span aria-hidden="true">🏠</span>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
