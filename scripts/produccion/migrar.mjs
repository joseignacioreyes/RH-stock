// Aplica en el Supabase de PRODUCCIÓN las migraciones de supabase/migrations que falten.
// Usa la API de administración de Supabase (no necesita la contraseña de la base de datos).
//
//   SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROYECTO=xxxx npm run produccion:migrar
//
// Cada migración se aplica completa o nada (en una transacción) y queda anotada en
// supabase_migrations.schema_migrations, igual que lo hace "supabase db push".

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const token = process.env.SUPABASE_ACCESS_TOKEN;
const proyecto = process.env.SUPABASE_PROYECTO;
if (!token || !proyecto) {
  console.error("Faltan SUPABASE_ACCESS_TOKEN o SUPABASE_PROYECTO (el código del proyecto, lo que va antes de .supabase.co).");
  process.exit(1);
}

async function sql(consulta) {
  const respuesta = await fetch(`https://api.supabase.com/v1/projects/${proyecto}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: consulta }),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.message ?? `Error ${respuesta.status}`);
  return cuerpo;
}

const texto = (valor) => `'${String(valor).replaceAll("'", "''")}'`;

await sql(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
`);
const aplicadas = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((f) => f.version));

const carpeta = path.join(raiz, "supabase/migrations");
const archivos = (await readdir(carpeta)).filter((a) => a.endsWith(".sql")).sort();
let nuevas = 0;

for (const archivo of archivos) {
  const [, version, nombre] = archivo.match(/^(\d+)_(.*)\.sql$/) ?? [];
  if (!version || aplicadas.has(version)) continue;
  const contenido = await readFile(path.join(carpeta, archivo), "utf8");
  process.stdout.write(`Aplicando ${archivo}… `);
  await sql(`begin;
${contenido}
insert into supabase_migrations.schema_migrations (version, name) values (${texto(version)}, ${texto(nombre)});
commit;`);
  console.log("✓");
  nuevas++;
}

console.log(nuevas ? `Listo: ${nuevas} migraciones aplicadas.` : "Todo al día: no había migraciones pendientes.");
