/**
 * La cartera vista por quien tiene que cobrarla (F4 del programa Cobros).
 *
 * La decisión de diseño que gobierna esta pantalla vive aquí y no en el
 * componente: **la lista se agrupa en secciones ordenadas por urgencia**, y la
 * sección lleva los DOS ejes que antes había que descodificar fila a fila —
 * qué pasó con el servicio y cuánta prisa corre el dinero.
 */
import type { Schemas } from "@/core/api/types";

export type ReceivableDTO = Schemas["ReceivablesListDto"]["data"][number];
export type ReceivablesStatsDTO = Schemas["ReceivablesStatsDto"];
export type AgingBucket = ReceivableDTO["bucket"];

export const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Al día",
  d1_30: "1 a 30 días",
  d31_60: "31 a 60 días",
  d61_90: "61 a 90 días",
  d90_plus: "Más de 90 días",
};

export type ReceivableSectionKey = "travelled" | "overdue" | "soon" | "current";

export interface ReceivableSection {
  key: ReceivableSectionKey;
  title: string;
  icon: "plane" | "circle-alert" | "calendar-clock" | "check";
  tone: "destructive" | "warning" | "info" | "success";
  rows: ReceivableDTO[];
}

/** Días que dejan de ser «al día» y pasan a «por vencer». */
export const DUE_SOON_DAYS = 7;

const SECTION_ORDER: readonly {
  key: ReceivableSectionKey;
  title: string;
  icon: ReceivableSection["icon"];
  tone: ReceivableSection["tone"];
}[] = [
  { key: "travelled", title: "Ya viajaron y deben", icon: "plane", tone: "destructive" },
  { key: "overdue", title: "En mora", icon: "circle-alert", tone: "warning" },
  { key: "soon", title: "Por vencer", icon: "calendar-clock", tone: "info" },
  { key: "current", title: "Al día", icon: "check", tone: "success" },
];

/**
 * A qué sección pertenece una fila. Las secciones son EXCLUYENTES y se prueban
 * en orden de urgencia: un cliente que ya viajó y además está en mora aparece
 * una sola vez, arriba. Verlo dos veces sería contar la misma deuda dos veces.
 */
export function sectionOf(row: ReceivableDTO): ReceivableSectionKey {
  if (row.travelled) return "travelled";
  if (row.days_overdue > 0) return "overdue";
  return daysUntil(row.next_due_at) !== null && daysUntil(row.next_due_at)! <= DUE_SOON_DAYS
    ? "soon"
    : "current";
}

export function groupReceivables(rows: readonly ReceivableDTO[]): ReceivableSection[] {
  return SECTION_ORDER.map((section) => ({
    ...section,
    rows: rows.filter((row) => sectionOf(row) === section.key),
  })).filter((section) => section.rows.length > 0);
}

/**
 * Días hasta una fecha del calendario, medidos en el día LOCAL de quien mira.
 * En UTC, a partir de las 19:00 de Bogotá la cuenta salía un día corta — el
 * mismo fallo que costó una ronda en el cliente de F3.
 */
export function daysUntil(day: string | null, today = new Date()): number | null {
  if (day === null) return null;
  const target = new Date(`${day}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - from.getTime()) / 86_400_000);
}

/** «Venció hace 47 días» · «Vence en 3 días» · «Vence el 14 de enero». */
export function dueLabel(row: Pick<ReceivableDTO, "next_due_at" | "days_overdue">, today = new Date()): string {
  if (row.next_due_at === null) return "Sin cuota pendiente";
  if (row.days_overdue > 0) {
    return row.days_overdue === 1
      ? "Venció ayer"
      : `Venció hace ${String(row.days_overdue)} días`;
  }
  const days = daysUntil(row.next_due_at, today);
  if (days === null) return "Sin cuota pendiente";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  if (days <= DUE_SOON_DAYS) return `Vence en ${String(days)} días`;
  return "";
}
