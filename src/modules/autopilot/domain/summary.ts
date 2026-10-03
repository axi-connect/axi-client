import type { Schemas } from "@/core/api/types";

/**
 * La ficha «Lo que trajeron tus pilotos» (P6b, mockup aprobado por el dueño):
 * GET /autopilot/summary. El tipo sale del contrato (`SummaryDto`).
 */
export type PilotsSummaryDTO = Schemas["SummaryDto"];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

/** «2026-09» → «septiembre». */
export function monthName(month: string): string {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTHS[index] ?? month;
}

/** El mes anterior, en minúscula, para el «vs. agosto». */
export function previousMonthName(month: string): string {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTHS[(index + 11) % 12] ?? "";
}

/** Las etapas del embudo en el orden del mockup, con su etiqueta. */
export const FUNNEL_STAGES = [
  { key: "found", label: "Encontradas" },
  { key: "qualified", label: "Calificadas" },
  { key: "contacted", label: "Contactadas" },
  { key: "replied", label: "Respondieron" },
  { key: "demo", label: "Demos" },
] as const satisfies readonly { key: keyof PilotsSummaryDTO["funnel"]; label: string }[];

/** El ancho de cada barra, relativo a la primera etapa; nunca 0 para que se vea. */
export function barWidth(value: number, max: number): number {
  if (max <= 0) return 4;
  return Math.max(4, Math.round((value / max) * 100));
}

/** «+2 vs. agosto», «−1 vs. agosto» o nada si no hay cambio. */
export function demosDelta(current: number, previous: number, month: string): string | null {
  const diff = current - previous;
  if (diff === 0) return null;
  return `${diff > 0 ? "+" : "−"}${String(Math.abs(diff))} vs. ${previousMonthName(month)}`;
}

/** Créditos con separador de miles de Colombia. */
export function formatCredits(value: number): string {
  return Math.round(value).toLocaleString("es-CO");
}
