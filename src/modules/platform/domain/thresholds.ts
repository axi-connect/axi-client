/**
 * Umbrales de los semáforos de analytics — FUENTE ÚNICA (spec §4).
 * Escala semántica verde/ámbar/rojo INDEPENDIENTE de la marca: el rojo de
 * marca jamás significa severidad. Funciones puras, testeadas en frontera.
 *
 *   failure_rate_pct   >10 rojo · >5 ámbar
 *   avg_overall_score  <60 rojo · <80 ámbar · null "—"
 *   major_hallucinations >0 rojo
 *   latency_p95_ms     >5000 rojo · >2500 ámbar
 */
export type MetricTone = "success" | "warning" | "destructive" | "neutral";

export function failureRateTone(pct: number): MetricTone {
  if (pct > 10) return "destructive";
  if (pct > 5) return "warning";
  return "success";
}

export function scoreTone(score: number | null): MetricTone {
  if (score === null) return "neutral";
  if (score < 60) return "destructive";
  if (score < 80) return "warning";
  return "success";
}

export function hallucinationsTone(count: number): MetricTone {
  return count > 0 ? "destructive" : "success";
}

export function latencyTone(ms: number | null): MetricTone {
  if (ms === null) return "neutral";
  if (ms > 5000) return "destructive";
  if (ms > 2500) return "warning";
  return "success";
}

/** % de la barra valor-vs-umbral de una alerta (clamp 0..100). */
export function alertProgressPct(value: number, threshold: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Umbral 0 o negativo (p.ej. major_hallucinations > 0): el valor ya lo superó.
  if (!Number.isFinite(threshold) || threshold <= 0) return 100;
  return Math.min(100, Math.round((value / threshold) * 100));
}
