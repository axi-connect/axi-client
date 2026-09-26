/**
 * Picos de una grabación para la onda del detalle (premium F2). Las pistas
 * (la grabación es de dos canales: cliente y agente) se mezclan tomando el
 * pico mayor de cada cubeta; el color por hablante sale de la transcripción,
 * no del canal. TS puro.
 */

/** Techo mínimo de la normalización: una grabación casi muda no se infla a pantalla completa. */
const MIN_NORMALIZATION_PEAK = 0.05;

export function computePeaks(channels: readonly Float32Array[], buckets: number): number[] {
  const length = channels.reduce((max, channel) => Math.max(max, channel.length), 0);
  if (length === 0 || buckets <= 0) return [];
  const size = length / buckets;
  const peaks: number[] = [];
  for (let bucket = 0; bucket < buckets; bucket++) {
    const from = Math.floor(bucket * size);
    const to = Math.max(from + 1, Math.floor((bucket + 1) * size));
    let peak = 0;
    for (const channel of channels) {
      for (let index = from; index < to && index < channel.length; index++) {
        const value = Math.abs(channel[index] ?? 0);
        if (value > peak) peak = value;
      }
    }
    peaks.push(peak);
  }
  const max = Math.max(MIN_NORMALIZATION_PEAK, ...peaks);
  return peaks.map((peak) => Math.min(1, peak / max));
}

/** Pico interpolado en una posición 0..1 (la onda se dibuja con más puntos que cubetas). */
export function peakAt(peaks: readonly number[], position: number): number {
  if (peaks.length === 0) return 0;
  const x = Math.min(1, Math.max(0, position)) * (peaks.length - 1);
  const left = Math.floor(x);
  const right = Math.min(peaks.length - 1, left + 1);
  const t = x - left;
  return (peaks[left] ?? 0) * (1 - t) + (peaks[right] ?? 0) * t;
}
