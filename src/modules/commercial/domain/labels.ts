import type { StatusMap } from "@/shared/components/features/status-badge/types";
import type { KeyResultKey, PaceStatus, SourceKind } from "./commercial";

/** Etiquetas de los resultados clave, en el orden en que se listan. */
export const KR_LABELS: Record<KeyResultKey, string> = {
  sales: "Ventas cerradas",
  quotes: "Cotizaciones enviadas",
  meetings: "Citas agendadas",
  contacted: "Contactados",
  leads: "Conversaciones nuevas",
  calls: "Llamadas contestadas",
};

export const KR_ORDER: readonly KeyResultKey[] = ["sales", "quotes", "meetings", "contacted", "leads", "calls"];

/** La procedencia de una cifra, dicha como se dice en la pantalla. */
export const SOURCE_LABELS: Record<SourceKind, string> = {
  history: "según tu historia",
  declared: "lo dijiste tú",
  benchmark: "supuesto para tu tipo de negocio",
};

/**
 * «supuesto para clínicas estéticas» cuando se conoce el nicho; si no, la
 * etiqueta genérica. Las otras dos procedencias no cambian con el nicho.
 */
export function sourceLabel(source: SourceKind, nicheLabel?: string | null): string {
  if (source === "benchmark" && nicheLabel) return `supuesto para ${nicheLabel}`;
  return SOURCE_LABELS[source];
}

/**
 * El ritmo como badge de punto (`StatusBadge appearance="dot"`). Ámbar para
 * lo que pide atención, verde para lo que va bien, neutro mientras se
 * aprende: el coral de la marca no significa nunca «mal».
 */
export const PACE_BADGES: StatusMap = {
  ahead: { label: "Adelantado", tone: "success" },
  on_track: { label: "Al ritmo", tone: "success" },
  at_risk: { label: "Ritmo bajo", tone: "warning" },
  behind: { label: "Atrasado", tone: "warning" },
  insufficient_data: { label: "Aprendiendo tu ritmo", tone: "neutral" },
  achieved: { label: "Cumplida", tone: "success" },
};

/** Fuera de ritmo = merece un badge en la fila. «Al ritmo» y «aprendiendo» no. */
export function isOffPace(status: PaceStatus): boolean {
  return status !== "on_track" && status !== "insufficient_data";
}
