import { formatDuration } from "@/core/lib/format";

/**
 * Costo estimado de una llamada. El backend lo da en USD (unidad de usage);
 * la factura real la arma billing — esto es lectura de panel. `null` = sin
 * tarifa configurada: se muestra el vacío, jamás $0 (cero mentiría).
 */
export function formatCallCost(usd: number | null): string {
  if (usd === null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    // Una llamada corta cuesta centavos: con 2 decimales se vería $0,00
    maximumFractionDigits: usd > 0 && usd < 0.1 ? 3 : 2,
  }).format(usd);
}

/** `formatDuration` del core no maneja horas (3900 → "65:00"); las llamadas
 * largas sí las necesitan. */
export function formatCallClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 3600) {
    return formatDuration(totalSeconds);
  }
  const hours = Math.floor(totalSeconds / 3600);
  const rest = Math.floor(totalSeconds % 3600);
  const minutes = Math.floor(rest / 60);
  const seconds = rest % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Milisegundos legibles para el desglose de latencia (`2 382 ms` / `2.4 s`). */
export function formatMs(ms: number): string {
  if (ms >= 10_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${new Intl.NumberFormat("es-CO").format(Math.round(ms))} ms`;
}
