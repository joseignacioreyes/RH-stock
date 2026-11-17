import { enlaceWhatsApp, MENSAJES_WHATSAPP } from "@/lib/whatsapp";

/**
 * Barra fija abajo con "Ayuda por WhatsApp". Va en todas las pantallas de la app.
 * Tiene fondo propio para no quedar encima de un texto; las pantallas dejan espacio
 * abajo (pb-28) para que nada quede escondido detrás.
 */
export function BotonAyudaWhatsApp({ mensaje = MENSAJES_WHATSAPP.ayuda }: { mensaje?: string }) {
  return (
    <div data-fijo-abajo className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-fondo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl justify-end px-4 py-2">
        <a
          href={enlaceWhatsApp(mensaje)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center gap-2 rounded-full border-2 border-marca bg-fondo px-5 text-lg font-semibold text-marca hover:bg-marca-claro"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            💬
          </span>
          Ayuda por WhatsApp
        </a>
      </div>
    </div>
  );
}
