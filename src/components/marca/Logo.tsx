// Logo de RH Stock: el ícono de la caja y el texto "RH Stock" en Poppins.
// El texto se dibuja con la fuente de la página (cargada con next/font), así se ve
// nítido en cualquier tamaño. Fuera de la web usa public/brand/rhstock-logo-trazos.svg.

type PropsIcono = { className?: string };

/** Ícono cuadrado: caja abierta con cinta amarilla y barras de stock. */
export function IconoRHStock({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#0F766E" />
      <path d="M120 214 L256 214 L222 162 L104 176 Z" fill="#CCEFE9" />
      <path d="M392 214 L256 214 L290 162 L408 176 Z" fill="#CCEFE9" />
      <rect x="120" y="208" width="272" height="196" rx="20" fill="#FFFFFF" />
      <rect x="232" y="208" width="48" height="74" fill="#FBBF24" />
      <rect x="164" y="326" width="40" height="46" rx="8" fill="#0F766E" />
      <rect x="236" y="306" width="40" height="66" rx="8" fill="#0F766E" />
      <rect x="308" y="286" width="40" height="86" rx="8" fill="#0F766E" />
    </svg>
  );
}

type PropsLogo = {
  /** Muestra "Tu inventario con una foto" debajo del nombre. */
  conEslogan?: boolean;
  className?: string;
};

export function Logo({ conEslogan = false, className = "" }: PropsLogo) {
  return (
    <span
      role="img"
      aria-label={conEslogan ? "RH Stock: Tu inventario con una foto" : "RH Stock"}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <IconoRHStock className="size-12 shrink-0" />
      <span className="flex flex-col font-titulo leading-none">
        <span className="text-[1.75rem] font-bold tracking-tight text-texto">
          RH <span className="text-marca">Stock</span>
        </span>
        {conEslogan && <span className="mt-1 text-base font-normal text-texto-suave">Tu inventario con una foto</span>}
      </span>
    </span>
  );
}
