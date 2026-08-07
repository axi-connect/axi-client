/**
 * Formato del valor de un límite según su unidad — único punto del patrón
 * (editor, tabla de límites efectivos, futuras vistas de uso).
 * Reutiliza los formatters transversales de core.
 */
import { formatBytes, formatMoney } from "@/core/lib/format";
import { CHARS_PER_VOICE_NOTE, metricInfo, type LimitInput } from "../../../domain/limits";

type LimitLike = Pick<LimitInput, "limit_value" | "is_cost_limit" | "metric">;

export function limitValueLabel(limit: LimitLike): string {
  if (!Number.isFinite(limit.limit_value)) return "—";
  if (limit.is_cost_limit) return `${formatMoney(limit.limit_value, "USD")} USD`;
  const unit = metricInfo(limit.metric).unit;
  if (unit === "bytes") return formatBytes(limit.limit_value);
  if (unit === "characters") {
    // La equivalencia en notas hace decidible el tope (≈280 chars por nota)
    const notes = Math.round(limit.limit_value / CHARS_PER_VOICE_NOTE);
    return `${limit.limit_value.toLocaleString("es-CO")} caracteres ≈ ${notes.toLocaleString("es-CO")} notas de voz`;
  }
  return limit.limit_value.toLocaleString("es-CO");
}
