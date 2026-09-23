import { dayKeyToUtcNoon, type DayKey } from "@/core/lib/business-time";
import { formatMoney } from "@/core/lib/format";

/**
 * Dinero grande con un decimal: «$ 11,1 M». Por debajo del millón, la cifra
 * completa. Es la forma de las cabeceras; en las filas y en la meta exacta se
 * usa `formatMoney` («$ 30.000.000»), porque ahí la cifra se compara.
 */
export function formatMillions(cents: number, currency = "COP"): string {
  if (!Number.isFinite(cents)) return "";
  const units = cents / 100;
  if (Math.abs(units) < 1_000_000) return formatMoney(cents, currency);
  const millions = units / 1_000_000;
  const digits = millions.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const symbol = currency === "COP" ? "$" : currency === "USD" ? "US$" : currency;
  return `${symbol} ${digits} M`;
}

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
