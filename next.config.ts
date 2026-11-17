import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos de boletas: se achican en el celular (máx. ~1.500 px), pero dejamos margen.
    // Vercel no acepta envíos de más de 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Casi todas las pantallas dependen de quién inició sesión, así que se usa el
  // modo clásico de Next.js (sin "Cache Components"), que es más simple.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
