import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
