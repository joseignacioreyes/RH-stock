// Abre un enlace de un solo uso (por ejemplo, "elige tu clave nueva") y deja la sesión iniciada.
// El enlace se arma con: /auth/confirmar?token_hash=…&type=recovery

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const TIPOS_PERMITIDOS: EmailOtpType[] = ["recovery", "invite", "magiclink"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = request.nextUrl.clone();
  destino.search = "";

  if (tokenHash && tipo && TIPOS_PERMITIDOS.includes(tipo)) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) {
      destino.pathname = "/nueva-clave";
      return NextResponse.redirect(destino);
    }
  }

  destino.pathname = "/enlace-vencido";
  return NextResponse.redirect(destino);
}
