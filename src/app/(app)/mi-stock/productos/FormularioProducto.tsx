"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { erroresPorCampo } from "@/lib/cuentas";
import { esquemaProductoPaso1, esquemaProductoPaso2, esquemaProductoPaso3, UNIDADES } from "@/lib/esquemas-productos";
import type { EstadoFormulario } from "../acciones";

type Valores = {
  nombre: string;
  categoriaId: string;
  unidad: string;
  precioVenta: string;
  costo: string;
  codigoBarras: string;
  stockInicial: string;
  stockMinimo: string;
};

type Props = {
  modo: "nuevo" | "editar";
  categorias: { id: string; nombre: string; icono: string }[];
  inicial?: Partial<Valores>;
  volverA: string;
  /** Solo al editar: enlace para quitar el producto. */
  quitarHref?: string;
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
};

const VACIO: Valores = { nombre: "", categoriaId: "", unidad: "unidad", precioVenta: "", costo: "", codigoBarras: "", stockInicial: "", stockMinimo: "" };
const TITULOS = { 1: "¿Qué producto es?", 2: "Precios", 3: "¿Cuánto tienes?" } as const;

export function FormularioProducto({ modo, categorias, inicial, volverA, quitarHref, accion }: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [valores, setValores] = useState<Valores>({ ...VACIO, ...inicial });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, enviar, guardando] = useActionState(async (anterior: EstadoFormulario, formData: FormData) => {
    const resultado = await accion(anterior, formData);
    if (resultado.paso) setPaso(resultado.paso as 1 | 2 | 3);
    setErrores(resultado.errores ?? {});
    return resultado;
  }, {});

  const unidadTexto = UNIDADES.find((u) => u.valor === valores.unidad)?.texto.replace("Por ", "") ?? "unidad";
  const esNuevo = modo === "nuevo";

  const poner = (campo: keyof Valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };

  const siguiente = (evento: React.FormEvent) => {
    evento.preventDefault();
    const esquema = paso === 1 ? esquemaProductoPaso1 : esquemaProductoPaso2;
    const validacion = esquema.safeParse(valores);
    if (!validacion.success) return setErrores(erroresPorCampo(validacion.error));
    setErrores({});
    setPaso((paso + 1) as 2 | 3);
    window.scrollTo({ top: 0 });
  };

  const revisarFinal = (evento: React.FormEvent<HTMLFormElement>) => {
    const validacion = esquemaProductoPaso3.safeParse(valores);
    if (!validacion.success) {
      evento.preventDefault();
      setErrores(erroresPorCampo(validacion.error));
    }
  };

  const botonVolver =
    paso === 1 ? (
      <Link href={volverA} className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro">
        <span aria-hidden="true" className="text-2xl leading-none">
          ←
        </span>
        Volver
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => setPaso((paso - 1) as 1 | 2)}
        className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-marca hover:bg-marca-claro"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          ←
        </span>
        Volver
      </button>
    );

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      {botonVolver}
      <p className="mt-4 text-lg font-semibold text-marca">
        {esNuevo ? "Agregar producto" : "Cambiar datos"} · Paso {paso} de 3
      </p>
      <div className="mt-2 flex gap-2" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-2 flex-1 rounded-full ${n <= paso ? "bg-marca" : "bg-gray-300"}`} />
        ))}
      </div>
      <h1 className="mt-4 text-3xl leading-tight font-bold text-texto">{TITULOS[paso]}</h1>

      {estado.error && (
        <div className="mt-6">
          <Aviso tipo="error">{estado.error}</Aviso>
        </div>
      )}

      {paso === 1 && (
        <form onSubmit={siguiente} noValidate className="mt-6 space-y-6">
          <Campo etiqueta="Nombre" ayuda="Ejemplo: Arroz grado 1 1 kg" value={valores.nombre} onChange={(e) => poner("nombre", e.target.value)} error={errores.nombre} />

          <div>
            <label htmlFor="categoria" className="block text-lg font-semibold text-texto">
              Categoría
            </label>
            <select
              id="categoria"
              value={valores.categoriaId}
              onChange={(e) => poner("categoriaId", e.target.value)}
              aria-invalid={Boolean(errores.categoriaId)}
              className={`mt-2 block min-h-14 w-full rounded-xl border-2 bg-fondo px-4 text-xl text-texto focus:border-marca focus:outline-none ${
                errores.categoriaId ? "border-falta" : "border-gray-300"
              }`}
            >
              <option value="">Elige una…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono} {c.nombre}
                </option>
              ))}
            </select>
            {errores.categoriaId && <p className="mt-2 text-base font-medium text-falta">⚠️ {errores.categoriaId}</p>}
          </div>

          <fieldset>
            <legend className="text-lg font-semibold text-texto">¿Cómo lo vendes?</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {UNIDADES.map((u) => (
                <label
                  key={u.valor}
                  className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-lg font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-texto ${
                    valores.unidad === u.valor ? "border-marca bg-marca-claro" : "border-gray-300 bg-fondo"
                  }`}
                >
                  <input type="radio" name="unidad-paso" value={u.valor} checked={valores.unidad === u.valor} onChange={() => poner("unidad", u.valor)} className="sr-only" />
                  <span aria-hidden="true">{u.icono}</span>
                  {u.texto}
                </label>
              ))}
            </div>
          </fieldset>

          <Boton type="submit" icono="➡️">
            Seguir
          </Boton>
        </form>
      )}

      {paso === 2 && (
        <form onSubmit={siguiente} noValidate className="mt-6 space-y-6">
          <Campo
            etiqueta={`¿A cuánto lo vendes? (${unidadTexto})`}
            ayuda="En pesos. Ejemplo: 1.490"
            inputMode="numeric"
            value={valores.precioVenta}
            onChange={(e) => poner("precioVenta", e.target.value)}
            error={errores.precioVenta}
          />
          {esNuevo && (
            <Campo
              etiqueta={`¿Cuánto te costó? (${unidadTexto})`}
              ayuda="Lo que pagaste en el mayorista. Si no sabes, déjalo en blanco."
              inputMode="numeric"
              value={valores.costo}
              onChange={(e) => poner("costo", e.target.value)}
              error={errores.costo}
            />
          )}
          <Campo
            etiqueta="Código de barras (si tiene)"
            ayuda="Los números debajo de las barras. Puedes dejarlo en blanco."
            inputMode="numeric"
            value={valores.codigoBarras}
            onChange={(e) => poner("codigoBarras", e.target.value.replace(/\D/g, ""))}
            error={errores.codigoBarras}
          />
          <Boton type="submit" icono="➡️">
            Seguir
          </Boton>
        </form>
      )}

      {paso === 3 && (
        <form action={enviar} onSubmit={revisarFinal} noValidate className="mt-6 space-y-6">
          {Object.entries(valores).map(([campo, valor]) => (
            <input key={campo} type="hidden" name={campo} value={valor} />
          ))}
          {esNuevo && (
            <Campo
              etiqueta={`¿Cuánto tienes ahora? (${unidadTexto})`}
              ayuda="Cuéntalo en tu bodega y estante. Si no tienes, deja 0."
              inputMode="decimal"
              value={valores.stockInicial}
              onChange={(e) => poner("stockInicial", e.target.value)}
              error={errores.stockInicial}
            />
          )}
          <Campo
            etiqueta="Avísame cuando queden"
            ayuda={`Te avisamos que se está acabando al llegar a esta cantidad (${unidadTexto}).`}
            inputMode="decimal"
            value={valores.stockMinimo}
            onChange={(e) => poner("stockMinimo", e.target.value)}
            error={errores.stockMinimo}
          />
          <Boton type="submit" icono="💾" cargando={guardando}>
            Guardar
          </Boton>
          {!esNuevo && (
            <p className="text-base text-texto-suave">
              💡 El stock no se cambia aquí: se mueve solo con compras, ventas y conteos. Si no cuadra, usa “Contar lo que tengo”.
            </p>
          )}
        </form>
      )}

      {quitarHref && paso === 1 && (
        <p className="mt-10 text-center">
          <Link href={quitarHref} className="inline-flex min-h-12 items-center gap-2 px-3 text-lg font-semibold text-falta underline">
            <span aria-hidden="true">🗑️</span> Quitar este producto de mi lista
          </Link>
        </p>
      )}
    </main>
  );
}
