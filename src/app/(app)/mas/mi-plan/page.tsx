import type { Metadata } from "next";
import { BotonWhatsApp } from "@/components/BotonWhatsApp";
import { ComoSeUsa } from "@/components/ComoSeUsa";
import { AvisoSoloLectura } from "@/components/FranjaPago";
import { Aviso } from "@/components/ui/Aviso";
import { BotonEnlace } from "@/components/ui/Boton";
import { Pantalla } from "@/components/ui/Pantalla";
import { formatearDia, formatearFecha, formatearPesos } from "@/lib/formato";
import { exigirSesionDeNegocio, MENSAJE_SUSPENDIDA } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_PAGO,
  montoDistinto,
  NOMBRE_PLAN,
  nombrePeriodo,
  textoTransferencia,
  type EstadoPago,
} from "@/lib/suscripcion";
import { datosTransferencia } from "@/lib/transferencia";
import { MENSAJES_WHATSAPP } from "@/lib/whatsapp";
import type { LecturaComprobante } from "@/lib/lector-comprobantes/esquema";
import { BotonCopiar } from "./BotonCopiar";

export const metadata: Metadata = { title: "Mi plan" };

export default async function PaginaMiPlan({ searchParams }: PageProps<"/mas/mi-plan">) {
  const { usuario, empresa } = await exigirSesionDeNegocio();
  const { listo, pausada } = await searchParams;
  const { suscripcion } = empresa;

  // Los empleados no ven pagos: solo saben si la app está pausada.
  if (usuario.rol !== "dueno") {
    return (
      <Pantalla titulo="Mi plan" volverA="/mas">
        {empresa.suspendida ? (
          <AvisoSoloLectura esDueno={false} />
        ) : (
          <p className="rounded-2xl bg-fondo p-5 text-lg text-texto shadow-sm">El plan de RH Stock lo maneja el dueño del negocio.</p>
        )}
      </Pantalla>
    );
  }

  const supabase = await crearClienteServidor();
  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, periodo, monto, estado, motivo_rechazo, datos_extraidos, informado_en")
    .order("created_at", { ascending: false })
    .limit(12);
  const lista = pagos ?? [];
  const ultimo = lista[0];
  const leido = (ultimo?.datos_extraidos ?? null) as LecturaComprobante | null;
  const transferencia = datosTransferencia();
  const etiqueta = ETIQUETA_ESTADO[suscripcion.estado];
  const mes = suscripcion.periodo ? nombrePeriodo(suscripcion.periodo) : "";
  const debePagar = suscripcion.plan === "mensual" && !suscripcion.pagoEnRevision;

  return (
    <Pantalla titulo="Mi plan" volverA="/mas">
      {listo === "informado" && ultimo?.estado === "informado" && (
        <div className="mb-6">
          <Aviso tipo="exito">
            <p className="font-semibold">Listo, recibimos tu comprobante.</p>
            {leido?.monto != null && (
              <p className="mt-1 text-base">
                Leímos: {formatearPesos(leido.monto)}
                {leido.fecha ? ` · ${formatearDia(leido.fecha)}` : ""}
                {leido.banco ? ` · ${leido.banco}` : ""}
              </p>
            )}
            <p className="mt-1 text-base">Lo revisaremos pronto y te avisaremos en Avisos.</p>
          </Aviso>
          {montoDistinto(leido?.monto, ultimo.monto) && (
            <div className="mt-3">
              <Aviso tipo="error">
                El monto que leímos ({formatearPesos(leido!.monto!)}) es distinto al de tu plan ({formatearPesos(ultimo.monto)}). Si fue un error,
                escríbenos por WhatsApp.
              </Aviso>
            </div>
          )}
        </div>
      )}
      {pausada && empresa.suspendida && (
        <div className="mb-6">
          <Aviso tipo="error">{MENSAJE_SUSPENDIDA}</Aviso>
        </div>
      )}
      {ultimo?.estado === "rechazado" && debePagar && (
        <div className="mb-6">
          <Aviso tipo="error">
            No pudimos confirmar tu pago de {nombrePeriodo(ultimo.periodo)}: {ultimo.motivo_rechazo}. Revisa y súbelo de nuevo.
          </Aviso>
        </div>
      )}

      <section className="rounded-3xl bg-fondo p-5 shadow-sm" aria-label="Tu plan">
        {suscripcion.plan === "piloto" ? (
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="text-5xl leading-none">
              🎁
            </span>
            <div>
              <p className="font-titulo text-2xl font-bold text-texto">{NOMBRE_PLAN.piloto}</p>
              <p className="mt-1 text-lg text-texto-suave">No tienes que pagar nada por ahora. Te avisaremos antes de empezar a cobrar.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-titulo text-2xl font-bold text-texto">Plan {NOMBRE_PLAN.mensual.toLowerCase()}</p>
              {suscripcion.pagoEnRevision && suscripcion.estado !== "suspendido" ? (
                <span className={`rounded-full px-3 py-1 text-base font-semibold ${ETIQUETA_PAGO.informado.clases}`}>{ETIQUETA_PAGO.informado.texto}</span>
              ) : (
                <span className={`rounded-full px-3 py-1 text-base font-semibold ${etiqueta.clases}`}>{etiqueta.texto}</span>
              )}
            </div>
            <p className="mt-2 text-lg text-texto">
              Pagas <strong>{formatearPesos(suscripcion.precioMensual)}</strong> al mes <span className="text-texto-suave">(IVA incluido)</span>.
            </p>
            {suscripcion.proximoVencimiento && !suscripcion.pagoEnRevision && (
              <p className="mt-1 text-lg text-texto">
                Tu pago de {mes} vence el <strong>{formatearDia(suscripcion.proximoVencimiento)}</strong>.
              </p>
            )}
          </>
        )}
      </section>

      {suscripcion.plan === "mensual" && suscripcion.pagoEnRevision && listo !== "informado" && (
        <div className="mt-6">
          <Aviso tipo="info">Recibimos tu comprobante de {mes}. Lo estamos revisando y te avisaremos en Avisos.</Aviso>
        </div>
      )}

      {debePagar && (
        <section className="mt-8" aria-labelledby="como-pagar">
          <h2 id="como-pagar" className="text-2xl font-bold text-texto">
            Cómo pagar
          </h2>
          {transferencia ? (
            <>
              <p className="mt-2 text-lg text-texto">
                <strong className="text-marca">Paso 1.</strong> Transfiere {formatearPesos(suscripcion.precioMensual)} a esta cuenta:
              </p>
              <dl className="mt-3 divide-y divide-gray-100 rounded-2xl bg-fondo text-lg shadow-sm">
                {[
                  ["Banco", transferencia.banco],
                  ["Cuenta", transferencia.tipoCuenta],
                  ["Número", transferencia.numero],
                  ["Nombre", transferencia.titular],
                  ["RUT", transferencia.rut],
                  ["Correo", transferencia.correo],
                ].map(([dato, valor]) => (
                  <div key={dato} className="flex flex-wrap justify-between gap-x-4 px-4 py-3">
                    <dt className="text-texto-suave">{dato}</dt>
                    <dd className="font-semibold break-all text-texto">{valor}</dd>
                  </div>
                ))}
              </dl>
              {transferencia.deEjemplo && <p className="mt-2 text-base text-texto-suave">💡 Cuenta inventada, solo para probar la app.</p>}
              <div className="mt-3">
                <BotonCopiar texto={textoTransferencia(transferencia, suscripcion.precioMensual)} />
              </div>
              <p className="mt-6 text-lg text-texto">
                <strong className="text-marca">Paso 2.</strong> Cuando hayas transferido, sube el comprobante:
              </p>
              <div className="mt-3">
                <BotonEnlace href="/mas/mi-plan/comprobante" icono="📎">
                  Ya pagué: subir comprobante
                </BotonEnlace>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg text-texto">Escríbenos y te enviamos los datos para transferir.</p>
              <div className="mt-3">
                <BotonWhatsApp texto="Pedir datos para transferir" mensaje={MENSAJES_WHATSAPP.datosPago} />
              </div>
              <div className="mt-3">
                <BotonEnlace href="/mas/mi-plan/comprobante" variante="secundario" icono="📎">
                  Ya pagué: subir comprobante
                </BotonEnlace>
              </div>
            </>
          )}
        </section>
      )}

      {lista.length > 0 && (
        <section className="mt-10" aria-labelledby="mis-pagos">
          <h2 id="mis-pagos" className="text-2xl font-bold text-texto">
            Mis pagos
          </h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl bg-fondo shadow-sm">
            {lista.map((pago) => {
              const estiloPago = ETIQUETA_PAGO[pago.estado as EstadoPago];
              return (
                <li key={pago.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-lg">
                    <span className="font-semibold text-texto first-letter:uppercase">{nombrePeriodo(pago.periodo)}</span>
                    <span className="block text-base text-texto-suave">
                      {formatearPesos(pago.monto)}
                      {pago.informado_en ? ` · enviado el ${formatearFecha(pago.informado_en)}` : ""}
                    </span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-base font-semibold ${estiloPago.clases}`}>
                    <span aria-hidden="true">{estiloPago.icono} </span>
                    {estiloPago.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {suscripcion.plan === "mensual" && (
        <div className="mt-8">
          <ComoSeUsa
            pasos={[
              { dibujo: "🏦", texto: "Transfiere el monto de tu plan desde la app de tu banco. Usa \"Copiar datos\" para no escribirlos." },
              { dibujo: "📎", texto: "Aprieta \"Ya pagué\" y sube la captura o el PDF del comprobante." },
              { dibujo: "✅", texto: "Lo revisamos y te avisamos. Si te atrasas más de 10 días, la app queda solo para mirar." },
            ]}
          />
        </div>
      )}
    </Pantalla>
  );
}
