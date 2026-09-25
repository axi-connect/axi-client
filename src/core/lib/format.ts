/** Utilidades de formato transversales (tamaños de archivo, duraciones). */

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${BYTE_UNITS[unit]}`;
}

/** Segundos → `m:ss` (duración de audio). */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** ISO date-time → fecha corta es-CO (`10 jul 2026`). */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Precio en centavos → moneda localizada es-CO (`$ 45.000`).
 * El backend guarda `price_cents` (int) + `currency` ISO 4217 (default COP).
 * COP no usa decimales en la práctica comercial; otras monedas muestran 2.
 */
export function formatMoney(cents: number, currency = "COP"): string {
  if (!Number.isFinite(cents)) return "";
  const fractionDigits = currency === "COP" ? 0 : 2;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

/**
 * Dinero grande con un decimal: «$ 11,1 M». Por debajo del millón, la cifra
 * completa. Es la forma de las cabeceras (la ruta del mes, el resumen de Alba); en
 * las filas y en la meta exacta se usa `formatMoney` («$ 30.000.000»),
 * porque ahí la cifra se compara.
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

/**
 * Equivalente APROXIMADO de un importe en otra moneda, para cotizar antes de
 * confirmar: «US$ 3.500 ≈ $ 11.068.610». El `≈` no es decorativo — hasta que
 * el pedido se confirma la tasa no está congelada y el total puede cambiar,
 * así que la cifra se presenta como indicativa y nunca sustituye al importe
 * real (F2 del programa Cobros).
 *
 * `cents` está en la moneda `from`; `rate` son unidades de `to` por unidad de
 * `from` (la tasa EFECTIVA del tenant, con su ajuste ya aplicado). Sin tasa no
 * se inventa nada: devuelve `null` y el llamador calla.
 */
export function formatMoneyApprox(
  cents: number,
  from: string,
  to: { currency: string; rate: number | null | undefined },
): string | null {
  if (!Number.isFinite(cents) || to.rate === null || to.rate === undefined) return null;
  if (!Number.isFinite(to.rate) || to.rate <= 0) return null;
  if (from === to.currency) return formatMoney(cents, from);
  return `≈ ${formatMoney(Math.round(cents * to.rate), to.currency)}`;
}

/**
 * Entrada de usuario es-CO (`45.000` o `45.000,50`) → centavos (int) o null si
 * no es un número válido. Acepta `.` como separador de miles y `,` decimal.
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * ISO → «jue 18 sep · 9:00 a. m.» en una zona horaria dada (la del negocio).
 * Es la hora ABSOLUTA que la bandeja de tareas pinta junto a la relativa: «se
 * ejecuta mañana» no le sirve a nadie que tenga que decidir si llega antes.
 * Sin `tz` usa la del navegador.
 */
export function formatDayTime(iso: string, tz?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(tz === undefined ? {} : { timeZone: tz }),
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = `${get("weekday").replace(".", "")} ${get("day")} ${get("month").replace(".", "")}`;
  const time = `${get("hour")}:${get("minute")} ${get("dayPeriod")}`.trim();
  return plainSpaces(`${day} · ${time}`);
}

/** `Intl` emite espacios no separables (U+202F/U+00A0) dentro de «a. m.»:
 *  se normalizan para que el texto se compare, copie y parta como texto. */
function plainSpaces(text: string): string {
  return text.replace(/[\u202f\u00a0]/g, " ");
}

/** ISO → «10 jul 2026, 9:00 a. m.» (tooltip de las fechas relativas). */
export function formatShortDateTime(iso: string, tz?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return plainSpaces(
    date.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...(tz === undefined ? {} : { timeZone: tz }),
    }),
  );
}
