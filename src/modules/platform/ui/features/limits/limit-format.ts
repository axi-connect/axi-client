/**
 * Formato del valor de un límite según su unidad — único punto del patrón
 * (editor, tabla de límites efectivos, futuras vistas de uso).
 * Reutiliza los formatters transversales de core.
 */
import { formatBytes, formatMoney } from "@/core/lib/format";
import { metricInfo, type LimitInput } from "../../../domain/limits";

type LimitLike = Pick<LimitInput, "limit_value" | "is_cost_limit" | "metric">;

export function limitValueLabel(limit: LimitLike): string {
  if (!Number.isFinite(limit.limit_value)) return "—";
  if (limit.is_cost_limit) return `${formatMoney(limit.limit_value, "USD")} USD`;
  if (metricInfo(limit.metric).unit === "bytes") return formatBytes(limit.limit_value);
  return limit.limit_value.toLocaleString("es-CO");
}
