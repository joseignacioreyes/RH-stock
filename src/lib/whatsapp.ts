import { WHATSAPP_SOPORTE } from "./config";

/** Mensajes que se escriben solos al abrir el chat de WhatsApp. */
export const MENSAJES_WHATSAPP = {
  ayuda: "Hola, necesito ayuda con RH Stock",
  probar: "Hola, quiero probar RH Stock",
  datosPago: "Hola, quiero pagar RH Stock. ¿Me envías los datos para transferir?",
} as const;

/** Arma el enlace que abre un chat de WhatsApp con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string, numero: string = WHATSAPP_SOPORTE): string {
  const soloNumeros = numero.replace(/\D/g, "");
  return `https://wa.me/${soloNumeros}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Muestra un celular chileno de forma legible: "56977766584" → "+56 9 7776 6584".
 * Si el número no tiene el formato esperado, lo devuelve con un "+" adelante.
 */
export function telefonoLegible(numero: string = WHATSAPP_SOPORTE): string {
  const soloNumeros = numero.replace(/\D/g, "");
  const celularChileno = soloNumeros.match(/^56(9)(\d{4})(\d{4})$/);
  if (celularChileno) {
    const [, nueve, primeraParte, segundaParte] = celularChileno;
    return `+56 ${nueve} ${primeraParte} ${segundaParte}`;
  }
  return `+${soloNumeros}`;
}
