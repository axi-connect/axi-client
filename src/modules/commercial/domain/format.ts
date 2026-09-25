import { dayKeyToUtcNoon, type DayKey } from "@/core/lib/business-time";

/**
 * «$ 11,1 M». Promovido a `core/lib/format` (lo usa también el resumen de
 * Alba, F7); se re-exporta para no tocar a los consumidores del slice.
 */
export { formatMillions } from "@/core/lib/format";

/** Un ritmo por día: «1,35», «1,6», «2». Hasta `digits` decimales (2), sin ceros de relleno. */
export function formatRate(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** Porcentaje entero: «41 %». */
export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0 %";
  return `${String(Math.round(value))} %`;
}

const UTC = { timeZone: "UTC" } as const;

/** El mes de un DayKey, en minúsculas: «septiembre». */
export function monthLabel(key: DayKey): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  return new Intl.DateTimeFormat("es-CO", { month: "long", ...UTC }).format(dayKeyToUtcNoon(key));
}

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

/**
 * «1 sep» a partir de un ISO date-time o de un DayKey. Con abreviaturas
 * propias: `Intl` en es-CO da «1 de sept», que no es lo que dice la pantalla.
 */
export function shortDay(iso: string): string {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const date = key ? dayKeyToUtcNoon(iso) : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return key ? `${String(date.getUTCDate())} ${MONTH_ABBR[date.getUTCMonth()]}` : `${String(date.getDate())} ${MONTH_ABBR[date.getMonth()]}`;
}
