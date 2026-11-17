// Reglas de los formularios de productos, pérdidas y conteos (se usan en el navegador y en el servidor).
import { z } from "zod";
import { leerNumero } from "./formato";

/** Número escrito por una persona ("1.350", "1,5"). */
const numero = (mensaje: string, { decimales = true, minimo = 0, opcional = false } = {}) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      if (texto === "" && opcional) return 0;
      const valor = leerNumero(texto);
      if (valor === null || valor < minimo || (!decimales && !Number.isInteger(valor))) {
        ctx.addIssue({ code: "custom", message: mensaje });
        return z.NEVER;
      }
      return valor;
    });

export const UNIDADES = [
  { valor: "unidad", texto: "Por unidad", icono: "🧃" },
  { valor: "kg", texto: "Por kilo", icono: "⚖️" },
  { valor: "litro", texto: "Por litro", icono: "🥛" },
  { valor: "caja", texto: "Por caja", icono: "📦" },
] as const;

export const esquemaProductoPaso1 = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre del producto.").max(80, "El nombre es muy largo."),
  categoriaId: z.string().uuid("Elige una categoría."),
  unidad: z.enum(["unidad", "kg", "litro", "caja"], { error: "Elige cómo lo vendes." }),
});

export const esquemaProductoPaso2 = z.object({
  precioVenta: numero("Escribe el precio con números, por ejemplo 1.490.", { decimales: false }),
  costo: numero("Escribe lo que te costó con números, por ejemplo 990.", { opcional: true }),
  codigoBarras: z
    .string()
    .trim()
    .regex(/^(\d{6,14})?$/, "El código de barras son solo números (entre 6 y 14)."),
});

export const esquemaProductoPaso3 = z.object({
  stockInicial: numero("Escribe cuántos tienes con números.", { opcional: true }),
  stockMinimo: numero("Escribe el mínimo con números.", { opcional: true }),
});

/** Al editar no se cambia el stock (eso se hace contando) ni el costo (sale de las compras). */
export const esquemaProductoNuevo = esquemaProductoPaso1.extend(esquemaProductoPaso2.shape).extend(esquemaProductoPaso3.shape);
export const esquemaProductoEditar = esquemaProductoPaso1
  .extend(esquemaProductoPaso2.omit({ costo: true }).shape)
  .extend(esquemaProductoPaso3.omit({ stockInicial: true }).shape);

export const MOTIVOS_SALIDA = [
  { valor: "merma", texto: "Se echó a perder", icono: "🗑️" },
  { valor: "vencido", texto: "Se venció", icono: "📅" },
  { valor: "consumo_propio", texto: "Lo usé yo", icono: "🏠" },
  { valor: "regalo", texto: "Lo regalé", icono: "🎁" },
] as const;

export const esquemaSalida = z.object({
  motivo: z.enum(["merma", "vencido", "consumo_propio", "regalo"], { error: "Elige qué pasó." }),
  cantidad: numero("Escribe cuánto con números, por ejemplo 2 o 1,5.").refine((v) => v > 0, "Escribe una cantidad mayor que cero."),
});
