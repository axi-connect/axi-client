import type { CommercialPaceDTO, PaceStatus } from "./commercial";

/**
 * Aritmética del ritmo, en el cliente. **El estado del ritmo lo decide el
 * servidor** (`pace.status`, con sus umbrales y su calendario): aquí solo vive
 * lo que la pantalla deriva sobre la marcha —la barra de una fila, las ventas
 * por día que faltan— y la regla de la voz «progreso»: ningún número sale
 * negativo.
 */

const clampPct = (value: number): number => Math.min(100, Math.max(0, value));

/** Camino recorrido en %, acotado a 0–100. Sin meta (≤ 0) no hay camino. */
export function progressPct(actual: number, target: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return 0;
  return clampPct((actual / target) * 100);
}

/**
 * La razón en %, SIN tope arriba (nunca negativa): «132 %» de un ticket por
 * encima del plan o de una proyección que pasa la meta. La línea y las reglas
 * se acotan con `progressPct`; la CIFRA no esconde el excedente (C10).
 */
export function ratioPct(actual: number, target: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, (actual / target) * 100);
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

/**
 * El estado que se PINTA. Una meta cumplida gana siempre, aunque los datos
 * no alcancen para un ritmo; sin datos suficientes se está «aprendiendo» sea
 * lo que sea lo que diga el ritmo. Un solo sitio para esa regla: el hero, la
 * franja del Panel y las listas la leen de aquí.
 */
export function displayStatus(pace: Pick<CommercialPaceDTO, "status" | "data_sufficiency">): PaceStatus {
  if (pace.status === "achieved") return "achieved";
  if (pace.data_sufficiency !== "ok") return "insufficient_data";
  return pace.status;
}

export function isLearning(pace: Pick<CommercialPaceDTO, "status" | "data_sufficiency">): boolean {
  return displayStatus(pace) === "insufficient_data";
}
