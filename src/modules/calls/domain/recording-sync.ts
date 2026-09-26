/**
 * Sincronía transcripción ↔ grabación (premium F1/F2). Un segmento suena en
 * la grabación en `(spoken_at_ms ?? at_ms) + (recording_offset_ms ?? 0)`.
 * Sin `spoken_at_ms` (llamadas anteriores o sin eventos de habla) se usa
 * `at_ms`, que es aproximado: basta para saltar a la frase, no para el
 * resaltado fino. TS puro.
 */

export type SyncSegment = {
  at_ms: number;
  spoken_at_ms?: number | null;
  text: string;
};

export type SegmentWindow = { start: number; end: number };

/** Ms que tarda en decirse un texto (~15 caracteres por segundo del TTS). */
export function estimatedSpeechMs(text: string): number {
  return Math.max(800, text.length * 65);
}

export function segmentStartMs(segment: SyncSegment, offsetMs: number | null): number {
  return Math.max(0, (segment.spoken_at_ms ?? segment.at_ms) + (offsetMs ?? 0));
}

/**
 * Ventana de cada segmento en la grabación: empieza en su marca y termina en
 * la del siguiente o cuando se acaba de decir, lo que llegue antes. Las
 * ventanas quedan ordenadas y sin solaparse aunque las marcas lleguen raras.
 */
export function segmentWindows(
  segments: readonly SyncSegment[],
  offsetMs: number | null,
  totalMs: number,
): SegmentWindow[] {
  const starts = segments.map((segment) => Math.min(segmentStartMs(segment, offsetMs), totalMs));
  let floor = 0;
  const monotonic = starts.map((start) => (floor = Math.max(floor, start)));
  return segments.map((segment, index) => {
    const start = monotonic[index] ?? 0;
    const next = monotonic[index + 1] ?? totalMs;
    const end = Math.min(next, start + estimatedSpeechMs(segment.text), totalMs);
    return { start, end: Math.max(start, end) };
  });
}

/** Índice del segmento que suena en `positionMs` (el último que ya empezó), o -1. */
export function activeSegmentIndex(windows: readonly SegmentWindow[], positionMs: number): number {
  let active = -1;
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index];
    if (window !== undefined && window.start <= positionMs) active = index;
    else break;
  }
  return active;
}

/**
 * Palabra que suena dentro de un segmento, repartiendo su ventana en
 * proporción a la longitud de cada palabra; -1 fuera de la ventana.
 */
export function activeWordIndex(text: string, window: SegmentWindow, positionMs: number): number {
  const words = text.split(/\s+/).filter((word) => word !== "");
  if (words.length === 0 || positionMs < window.start || positionMs >= window.end) return -1;
  const total = words.reduce((sum, word) => sum + word.length + 1, 0);
  const target = ((positionMs - window.start) / (window.end - window.start)) * total;
  let acc = 0;
  for (let index = 0; index < words.length; index++) {
    acc += (words[index]?.length ?? 0) + 1;
    if (target < acc) return index;
  }
  return words.length - 1;
}
