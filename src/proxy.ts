// Se ejecuta antes de cada página: renueva la sesión de Supabase y manda a
// "Entrar" a quien intenta abrir una pantalla privada sin haber iniciado sesión.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

/** Pantallas que necesitan sesión. */
const RUTAS_PRIVADAS = ["/inicio", "/mas", "/subir-boleta", "/vender", "/mi-stock", "/avisos", "/admin", "/nueva-clave"];
/** Pantallas que no tienen sentido si ya iniciaste sesión. */
const RUTAS_SOLO_SIN_SESION = ["/entrar", "/registro"];

const coincide = (ruta: string, lista: string[]) => lista.some((r) => ruta === r || ruta.startsWith(`${r}/`));

export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  if (!supabaseConfigurado) return respuesta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesNuevas, cabeceras) {
        cookiesNuevas.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookiesNuevas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(cabeceras).forEach(([clave, valor]) => respuesta.headers.set(clave, valor));
      },
    },
  });

  // Importante: no poner código entre createServerClient y getClaims.
  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims);
  const ruta = request.nextUrl.pathname;

  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const redireccion = NextResponse.redirect(url);
    respuesta.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  };

  if (!conSesion && coincide(ruta, RUTAS_PRIVADAS)) return redirigir("/entrar");
  if (conSesion && coincide(ruta, RUTAS_SOLO_SIN_SESION)) return redirigir("/inicio");

  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos, imágenes e íconos.
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|icon.svg|apple-icon.png|opengraph-image|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
