import type { MetadataRoute } from "next";

// Datos para instalar RH Stock en la pantalla de inicio del celular (app web instalable).
// Los íconos se generan con `npm run marca`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RH Stock: Tu inventario con una foto",
    short_name: "RH Stock",
    description: "App de inventario para almacenes y negocios de barrio.",
    lang: "es-CL",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#0F766E",
    categories: ["business", "productivity"],
    icons: [
      { src: "/brand/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
