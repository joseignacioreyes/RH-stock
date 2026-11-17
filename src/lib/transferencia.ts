import "server-only";
import type { DatosTransferencia } from "./suscripcion";

// Datos de la cuenta donde los clientes transfieren la suscripción. Se configuran en UN solo lugar:
// las variables TRANSFERENCIA_* (ver .env.example). Si faltan, la app NO inventa una cuenta:
// muestra un botón para pedirlos por WhatsApp. Solo en pruebas (TRANSFERENCIA_DE_EJEMPLO=1)
// muestra una cuenta inventada, marcada como ejemplo.

const EJEMPLO: DatosTransferencia = {
  banco: "Banco de Ejemplo",
  tipoCuenta: "Cuenta corriente",
  numero: "00-123-45678-90",
  titular: "RH Stock SpA (ejemplo)",
  rut: "77.777.777-7",
  correo: "pagos@rhstock.cl",
  deEjemplo: true,
};

export function datosTransferencia(): DatosTransferencia | null {
  const e = process.env;
  const datos = {
    banco: e.TRANSFERENCIA_BANCO?.trim(),
    tipoCuenta: e.TRANSFERENCIA_TIPO_CUENTA?.trim(),
    numero: e.TRANSFERENCIA_NUMERO?.trim(),
    titular: e.TRANSFERENCIA_TITULAR?.trim(),
    rut: e.TRANSFERENCIA_RUT?.trim(),
    correo: e.TRANSFERENCIA_CORREO?.trim(),
  };
  if (Object.values(datos).every(Boolean)) return { ...(datos as Omit<DatosTransferencia, "deEjemplo">), deEjemplo: false };
  return e.TRANSFERENCIA_DE_EJEMPLO === "1" ? EJEMPLO : null;
}
