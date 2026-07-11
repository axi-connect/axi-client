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
