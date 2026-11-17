import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas contra la base de datos (Supabase local): reglas de seguridad RLS.
//   npx supabase start
//   npm run test:db
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["pruebas/db/**/*.test.ts"],
    globalSetup: ["pruebas/db/preparar.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
