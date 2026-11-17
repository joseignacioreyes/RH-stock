type Paso = { dibujo: string; texto: string };

/** Botón "¿Cómo se usa?" que despliega 3 pasos con dibujos simples. No necesita JavaScript. */
export function ComoSeUsa({ pasos }: { pasos: [Paso, Paso, Paso] }) {
  return (
    <details className="group rounded-2xl bg-fondo shadow-sm ring-1 ring-black/5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-lg font-semibold text-marca [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-2xl leading-none">
          ❓
        </span>
        ¿Cómo se usa?
        <span aria-hidden="true" className="ml-auto transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ol className="space-y-4 px-5 pb-5">
        {pasos.map((paso, i) => (
          <li key={paso.texto} className="flex items-center gap-4">
            <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-marca-claro text-4xl">
              {paso.dibujo}
            </span>
            <span className="text-lg">
              <strong className="text-marca">{i + 1}.</strong> {paso.texto}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
