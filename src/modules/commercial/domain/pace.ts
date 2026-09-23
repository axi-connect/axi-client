/**
 * Aritmética del ritmo, en el cliente. El servidor calcula el ritmo oficial;
 * esto es lo que la pantalla necesita derivar sobre la marcha (la barra de
 * una fila, las ventas por día que faltan) y lo que fija la voz «progreso»:
 * ningún número sale negativo.
 */

export interface PaceThresholds {
  ahead_pct: number;
  on_track_pct: number;
  at_risk_pct: number;
}

/** Umbrales del plan (`settings.commercial`): >110 adelantado, ≥90 al ritmo, ≥80 ritmo bajo. */
export const DEFAULT_THRESHOLDS: PaceThresholds = { ahead_pct: 110, on_track_pct: 90, at_risk_pct: 80 };

/** Días hábiles mínimos antes de afirmar un ritmo. */
export const MIN_BUSINESS_DAYS = 3;

export type PaceStatusValue = "ahead" | "on_track" | "at_risk" | "behind" | "insufficient_data" | "achieved";

const clampPct = (value: number): number => Math.min(100, Math.max(0, value));

/** Camino recorrido en %, acotado a 0–100. Sin meta (≤ 0) no hay camino. */
export function progressPct(actual: number, target: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return 0;
  return clampPct((actual / target) * 100);
}

/** Dónde deberías ir hoy si el mes se reparte por igual entre sus días hábiles. */
export function expectedPct(daysElapsed: number, daysTotal: number): number {
  if (!Number.isFinite(daysElapsed) || !Number.isFinite(daysTotal) || daysTotal <= 0) return 0;
  return clampPct((daysElapsed / daysTotal) * 100);
}

/** Lo que falta y lo que sobra, nunca negativos: la voz dice «faltan 16», jamás «−57 %». */
export function gap(actual: number, target: number): { missing: number; surplus: number } {
  const diff = target - actual;
  return { missing: Math.max(0, diff), surplus: Math.max(0, -diff) };
}

/**
 * Cuánto por día hace falta para cubrir lo que falta. Con 0 días hábiles
 * todo lo que falta es de hoy. Devuelve la tasa cruda; redondear es cosa de la
 * frase (`copy.ts` redondea hacia arriba: «3 ventas al día»).
 */
export function dailyRateNeeded(missing: number, daysLeft: number): number {
  if (!Number.isFinite(missing) || missing <= 0) return 0;
  if (!Number.isFinite(daysLeft) || daysLeft <= 0) return missing;
  return missing / daysLeft;
}

/** Ritmo real hasta hoy. Sin días transcurridos no hay ritmo. */
export function dailyRateActual(actual: number, daysElapsed: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(daysElapsed) || daysElapsed <= 0) return 0;
  return actual / daysElapsed;
}

/**
 * El estado del ritmo, con los umbrales del plan.
 *
 * - Menos de 3 días hábiles → `insufficient_data`: con un día de datos no se
 *   afirma nada.
 * - Meta alcanzada (con `target`) → `achieved`, gane o pierda el ritmo.
 * - Si no, la razón real/esperado contra los umbrales.
 */
export function paceStatus(
  actual: number,
  expected: number,
  thresholds: PaceThresholds = DEFAULT_THRESHOLDS,
  daysElapsed: number = MIN_BUSINESS_DAYS,
  target?: number,
): PaceStatusValue {
  if (target !== undefined && target > 0 && actual >= target) return "achieved";
  if (daysElapsed < MIN_BUSINESS_DAYS || expected <= 0) return "insufficient_data";
  // `actual * 100 / expected` y no `(actual / expected) * 100`: 110/100*100 da
  // 110,00000000000001 y el umbral «>110» se cruzaba solo.
  const ratio = (actual * 100) / expected;
  if (ratio > thresholds.ahead_pct) return "ahead";
  if (ratio >= thresholds.on_track_pct) return "on_track";
  if (ratio >= thresholds.at_risk_pct) return "at_risk";
  return "behind";
}

/**
 * A dónde llegas si sigues así, en % de la meta (puede pasar de 100).
 * `null` sin días transcurridos o sin meta.
 */
export function projectedPct(actual: number, daysElapsed: number, daysTotal: number, target: number): number | null {
  if (target <= 0 || daysElapsed <= 0 || daysTotal <= 0) return null;
  const projected = (actual / daysElapsed) * daysTotal;
  return Math.max(0, (projected / target) * 100);
}
