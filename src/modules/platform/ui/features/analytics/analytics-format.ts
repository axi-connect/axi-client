/**
 * Formato de las métricas de analytics — único punto del patrón (triage,
 * dashboard). Latencias `ms → s` a partir de 1000 (spec §4); null → "—".
 */
const PCT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const SECONDS = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const SCORE = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${PCT.format(value)} %`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms >= 1000) return `${SECONDS.format(ms / 1000)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return "—";
  return SCORE.format(score);
}
