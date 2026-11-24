/**
 * Dinero › Saldos (alerta de saldos de proveedores, 24-nov). Dominio puro: los
 * tipos salen del contrato del servidor y aquí solo se decide cómo se DICE cada
 * cosa. El servidor ya ordena (lo peor primero) y calcula niveles y días.
 */
import type { components } from "@/core/api/schema";

export type ProviderBalances = components["schemas"]["ProviderBalancesDto"];
export type ProviderBalance = ProviderBalances["providers"][number];
export type ProviderAlerts = components["schemas"]["ProviderAlertsDto"];
export type ProviderAlertItem = ProviderAlerts["items"][number];
export type BalanceLevel = ProviderBalance["level"];
export type UpdateProviderBalanceDTO = components["schemas"]["UpdateProviderBalanceDto"];

/** La clave de `PLATFORM_STATES` de la fila: el incidente manda sobre el saldo. */
export function balanceStateKey(row: Pick<ProviderBalance, "level" | "incident">): string {
  if (row.incident) return row.incident.kind;
  switch (row.level) {
    case "critical":
      return "balance_critical";
    case "warning":
      return "balance_low";
    case "unknown":
      return "balance_unknown";
    default:
      return "balance_ok";
  }
}

const USD = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «US$ 1.234,50». */
export function formatUsd(value: number): string {
  return `US$ ${USD.format(value)}`;
}

/** «6 días», «1 día», «menos de 1 día»; null → «—». */
export function formatRunway(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return "menos de 1 día";
  const rounded = Math.round(days);
  return rounded === 1 ? "1 día" : `${String(rounded)} días`;
}

/** El saldo como se lee en la tabla, con su nota debajo. */
export function balanceText(row: ProviderBalance): { value: string; note: string } {
  if (!row.measurable) return { value: "—", note: "sin consulta de saldo" };
  if (row.balance_usd === null) {
    if (row.probe === "openai_admin") return { value: "—", note: "registra una recarga" };
    return { value: "—", note: row.check_error ? "no se pudo leer" : "sin dato aún" };
  }
  return {
    value: formatUsd(row.balance_usd),
    note: row.balance_source === "estimated" ? "cargado − gastado" : "exacto",
  };
}

const CLOCK = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
const DAY = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

/** «9:45 a. m.»; si no es de hoy, «23 nov, 9:45 a. m.». */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const clock = CLOCK.format(at)
    .replace(/\s+/g, " ")
    .replace(/a\.?\s?m\.?/i, "a. m.")
    .replace(/p\.?\s?m\.?/i, "p. m.");
  const sameDay = at.toDateString() === now.toDateString();
  return sameDay ? clock : `${DAY.format(at).replace(".", "")}, ${clock}`;
}

/** La última señal de la fila: el rechazo si hay incidente; si no, cuándo respondió bien. */
export function lastSignal(row: ProviderBalance, now: Date = new Date()): string {
  if (row.incident) {
    const what = row.incident.kind === "no_funds" ? "sin saldo" : "llave inválida";
    return `Rechaza: ${what} · ${formatWhen(row.incident.last_seen_at, now)}`;
  }
  if (row.check_error) return `No se pudo leer el saldo · ${row.check_error}`;
  if (row.last_success_at) return `Respondió bien · ${formatWhen(row.last_success_at, now)}`;
  if (row.checked_at) return `Consultado · ${formatWhen(row.checked_at, now)}`;
  return "Sin actividad reciente";
}

/** La frase de la franja y del correo: qué pasó y desde cuándo. */
export function alertHeadline(item: ProviderAlertItem, now: Date = new Date()): string {
  const since = item.since ? ` desde las ${formatWhen(item.since, now)}` : "";
  switch (item.reason) {
    case "no_funds":
      return `${item.name} se quedó sin saldo${since}.`;
    case "auth_invalid":
      return `${item.name} rechaza la llave de Axi${since}.`;
    default:
      return item.level === "critical"
        ? `El saldo de ${item.name} está en crítico${item.balance_usd === null ? "" : `: ${formatUsd(item.balance_usd)}`}.`
        : `El saldo de ${item.name} está bajo${item.balance_usd === null ? "" : `: ${formatUsd(item.balance_usd)}`}.`;
  }
}

/** Un número que el dueño escribió («50», «50,5», «1.234,50»); undefined si no es válido, null si vacío. */
export function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000 ? value : undefined;
}

/** «2026-11-24» (input date) → ISO al mediodía de Bogotá, para que el día no salte por el huso. */
export function dateInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T12:00:00.000-05:00`;
}

/** ISO → «2026-11-24» en hora de Bogotá, para el input date. */
export function isoToDateInput(iso: string | null): string {
  if (iso === null) return "";
  const at = new Date(new Date(iso).getTime() - 5 * 3_600_000);
  return at.toISOString().slice(0, 10);
}
