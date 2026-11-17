// Antes de las pruebas de base de datos: toma la dirección y las claves del Supabase local.
// Requiere tener Supabase local encendido: npx supabase start

import { execSync } from "node:child_process";

export default function preparar() {
  if (process.env.SUPABASE_PRUEBAS_URL) return;

  let salida: string;
  try {
    salida = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error('Supabase local no está encendido. Corre "npx supabase start" y vuelve a intentar.');
  }

  const variables = Object.fromEntries(
    salida
      .split("\n")
      .map((linea) => linea.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => [m[1], m[2]]),
  );

  process.env.SUPABASE_PRUEBAS_URL = variables.API_URL;
  process.env.SUPABASE_PRUEBAS_ANON = variables.ANON_KEY;
  process.env.SUPABASE_PRUEBAS_SECRETA = variables.SERVICE_ROLE_KEY;
}
