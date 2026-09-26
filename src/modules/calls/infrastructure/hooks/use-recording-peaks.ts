"use client";

import { useEffect, useState } from "react";
import { computePeaks } from "@/modules/calls/domain/waveform";

/** Cubetas de la onda: de sobra para 1440 px con interpolación. */
const PEAK_BUCKETS = 600;
/** Frecuencia del contexto de decodificación: los picos no necesitan más. */
const DECODE_SAMPLE_RATE = 8_000;

export type RecordingPeaksStatus = "idle" | "loading" | "ready" | "unavailable";

// Por sesión y no por URL: la URL firmada cambia cada 5 minutos, el audio no.
const cache = new Map<string, number[]>();

async function decodePeaks(url: string, signal: AbortSignal): Promise<number[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`recording ${String(response.status)}`);
  const bytes = await response.arrayBuffer();
  // Offline: decodificar no exige un gesto del usuario ni abre la salida de audio.
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(bytes);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  return computePeaks(channels, PEAK_BUCKETS);
}

/**
 * Picos de la grabación para `RecordingWaveform` (premium F2). Descarga el mp3
 * por la URL firmada y lo decodifica en el navegador. Si el storage no permite
 * leerlo desde el navegador (CORS) o el audio no decodifica, queda
 * `unavailable` y la onda cae a su línea plana: la reproducción no depende de esto.
 */
export function useRecordingPeaks(
  sessionId: string,
  url: string | null,
): { peaks: number[] | null; status: RecordingPeaksStatus } {
  const cached = cache.get(sessionId) ?? null;
  const [state, setState] = useState<{
    key: string;
    peaks: number[] | null;
    status: RecordingPeaksStatus;
  }>({ key: sessionId, peaks: cached, status: cached === null ? "idle" : "ready" });

  useEffect(() => {
    if (cache.has(sessionId)) {
      setState({ key: sessionId, peaks: cache.get(sessionId) ?? null, status: "ready" });
      return;
    }
    if (url === null) {
      setState({ key: sessionId, peaks: null, status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ key: sessionId, peaks: null, status: "loading" });
    decodePeaks(url, controller.signal)
      .then((peaks) => {
        cache.set(sessionId, peaks);
        if (!controller.signal.aborted) setState({ key: sessionId, peaks, status: "ready" });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ key: sessionId, peaks: null, status: "unavailable" });
        }
      });
    return () => controller.abort();
  }, [sessionId, url]);

  // Un cambio de sesión no muestra los picos de la anterior mientras carga.
  if (state.key !== sessionId) return { peaks: cached, status: cached === null ? "idle" : "ready" };
  return { peaks: state.peaks, status: state.status };
}
