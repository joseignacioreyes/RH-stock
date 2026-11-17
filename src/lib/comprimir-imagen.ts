// Achica una foto en el celular antes de subirla (máximo ~1.500 px por lado, JPEG).
// Así sube rápido aunque la conexión sea lenta (CLAUDE.md, sección 8).

export const LADO_MAXIMO = 1500;

/** Tamaño final manteniendo la proporción, sin agrandar fotos chicas. */
export function medidasAchicadas(ancho: number, alto: number, maximo = LADO_MAXIMO): { ancho: number; alto: number } {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

export async function comprimirImagen(archivo: File, maximo = LADO_MAXIMO, calidad = 0.82): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const { ancho, alto } = medidasAchicadas(imagen.width, imagen.height, maximo);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  if (!contexto) return archivo;
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", calidad));
  if (!blob) return archivo;
  return new File([blob], "boleta.jpg", { type: "image/jpeg" });
}
