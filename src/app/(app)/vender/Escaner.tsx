"use client";

import { useEffect, useRef, useState } from "react";

// Escáner con la cámara usando el lector de códigos que trae Chrome en Android (BarcodeDetector).
// Cada lectura suma 1; el mismo código vuelve a sumar recién después de 1,5 segundos.

type Detector = { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (opciones: { formats: string[] }) => Detector;

type Props = {
  /** Devuelve el nombre del producto agregado, o null si el código no existe. */
  alLeer: (codigo: string) => string | null;
  alCerrar: () => void;
};

function pitido() {
  try {
    const audio = new AudioContext();
    const oscilador = audio.createOscillator();
    oscilador.frequency.value = 1200;
    oscilador.connect(audio.destination);
    oscilador.start();
    oscilador.stop(audio.currentTime + 0.08);
  } catch {
    /* sin sonido */
  }
  navigator.vibrate?.(60);
}

export function Escaner({ alLeer, alCerrar }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<"iniciando" | "leyendo" | "sin_soporte" | "sin_permiso">("iniciando");
  const [ultimo, setUltimo] = useState<string | null>(null);
  const leerRef = useRef(alLeer);
  useEffect(() => {
    leerRef.current = alLeer;
  }, [alLeer]);

  useEffect(() => {
    let flujo: MediaStream | null = null;
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout>;
    const recientes = new Map<string, number>();

    async function iniciar() {
      const Constructor = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!Constructor || !navigator.mediaDevices?.getUserMedia) return setEstado("sin_soporte");
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        return setEstado("sin_permiso");
      }
      if (!activo || !video.current) return;
      video.current.srcObject = flujo;
      await video.current.play().catch(() => {});
      setEstado("leyendo");
      const detector = new Constructor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"] });

      const leer = async () => {
        if (!activo || !video.current) return;
        try {
          const codigos = await detector.detect(video.current);
          for (const { rawValue } of codigos) {
            const ahora = Date.now();
            if ((recientes.get(rawValue) ?? 0) > ahora - 1500) continue;
            recientes.set(rawValue, ahora);
            const nombre = leerRef.current(rawValue);
            if (nombre) {
              pitido();
              setUltimo(nombre);
            }
          }
        } catch {
          /* cuadro sin código: seguimos */
        }
        temporizador = setTimeout(leer, 250);
      };
      void leer();
    }

    void iniciar();
    return () => {
      activo = false;
      clearTimeout(temporizador);
      flujo?.getTracks().forEach((pista) => pista.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Escanear códigos">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {estado === "leyendo" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="h-40 w-4/5 max-w-md rounded-2xl border-4 border-acento shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 p-4 text-center text-xl font-semibold text-white" role="status">
          {estado === "iniciando" && "Abriendo la cámara…"}
          {estado === "leyendo" && (ultimo ? `✅ ${ultimo} agregado` : "Apunta al código de barras")}
          {estado === "sin_soporte" && (
            <span className="block rounded-2xl bg-fondo p-4 text-texto">
              Este celular no puede leer códigos con la cámara. Usa el buscador, un lector USB o los botones de “Más vendidos”.
            </span>
          )}
          {estado === "sin_permiso" && (
            <span className="block rounded-2xl bg-fondo p-4 text-texto">
              No pudimos abrir la cámara. Revisa que el navegador tenga permiso para usarla.
            </span>
          )}
        </div>
      </div>
      <div className="bg-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={alCerrar} className="min-h-16 w-full rounded-2xl bg-marca text-2xl font-bold text-white">
          ✅ Listo
        </button>
      </div>
    </div>
  );
}
