import { enlaceWhatsApp } from "@/lib/whatsapp";

type Props = {
  /** Texto del botón, por ejemplo "Quiero probar RH Stock" o "Ayuda por WhatsApp". */
  texto: string;
  /** Mensaje que aparece ya escrito al abrir el chat. */
  mensaje: string;
};

/** Botón principal (verde y grande) que abre un chat de WhatsApp con soporte y ventas. */
export function BotonWhatsApp({ texto, mensaje }: Props) {
  return (
    <a
      href={enlaceWhatsApp(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-marca px-6 py-3 text-center text-xl font-semibold text-white shadow-sm transition-colors hover:bg-marca-oscuro active:bg-marca-oscuro"
    >
      <IconoChat />
      <span>{texto}</span>
    </a>
  );
}

function IconoChat() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden="true" focusable="false" fill="none">
      <path
        d="M12 3.5c-4.97 0-9 3.47-9 7.75 0 2.2 1.07 4.18 2.78 5.59L5 20.5l4.03-1.83c.93.22 1.92.33 2.97.33 4.97 0 9-3.47 9-7.75S16.97 3.5 12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 11.25h.01M12 11.25h.01M16 11.25h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
