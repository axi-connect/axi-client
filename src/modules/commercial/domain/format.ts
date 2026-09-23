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

/** Un ritmo por día: «1,35», «1,6», «2». Hasta dos decimales, sin ceros de relleno. */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Entero con separador de miles es-CO: «1.240». */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("es-CO");
}

/** Porcentaje entero: «41 %». */
export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0 %";
  return `${String(Math.round(value))} %`;
}

/** El mes de una fecha local `YYYY-MM-DD`, en minúsculas: «septiembre». */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return "";
  return new Intl.DateTimeFormat("es-CO", { month: "long" }).format(new Date(y, m - 1, 1));
}

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

/**
 * «1 sep» a partir de un ISO date-time o `YYYY-MM-DD`. Con abreviaturas
 * propias: `Intl` en es-CO da «1 de sept», que no es lo que dice la pantalla.
 */
export function shortDay(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseIsoDate(iso) : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate())} ${MONTH_ABBR[date.getMonth()]}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
