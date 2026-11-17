import { salirDelDemoYRegistrarme } from "@/app/acciones-sesion";

/** Franja arriba de todo cuando se está mirando el negocio de ejemplo. */
export function FranjaDemo() {
  return (
    <div className="bg-acento text-texto">
      <form
        action={salirDelDemoYRegistrarme}
        className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
      >
        <p className="text-base font-semibold">
          <span aria-hidden="true">👀 </span>
          Estás viendo un negocio de ejemplo.
        </p>
        <button
          type="submit"
          className="min-h-11 rounded-full bg-texto px-4 text-base font-semibold text-white hover:bg-black"
        >
          Crear mi cuenta
        </button>
      </form>
    </div>
  );
}
