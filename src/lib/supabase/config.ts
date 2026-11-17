// Datos de conexión a Supabase. Vienen de variables de entorno (ver .env.example).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Clave pública ("anon" o "publishable"): se puede ver en el navegador; la seguridad la dan las reglas RLS. */
export const SUPABASE_CLAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** ¿Está configurado Supabase? Si no, la portada igual funciona y el resto muestra un aviso amable. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_CLAVE_PUBLICA);
