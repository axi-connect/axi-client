/**
 * Dominio del tablero «Capacidades» y del borrador «Convertir en escenario»
 * (upgrade quality F5). TypeScript PURO.
 */
import type { Schemas } from "@/core/api/types";
import { parseSuccessCriteria, type SuccessCriterion } from "./quality";

export type CapabilitiesReport = Schemas["QualityCapabilitiesDto"];
export type Capability = CapabilitiesReport["capabilities"][number];
export type CapabilityStatus = Capability["status"];
export type ScenarioDraft = Schemas["QualityScenarioDraftDto"];

export const CAPABILITY_STATUS_KEY: Record<CapabilityStatus, string> = {
  pass: "cap_pass",
  warn: "cap_warn",
  fail: "cap_fail",
  untested: "cap_untested",
};

export const CAPABILITY_STATUS_ORDER: readonly CapabilityStatus[] = ["fail", "warn", "untested", "pass"];

/** Conteo por estado (tiles de cabecera). */
export function countByStatus(capabilities: readonly Pick<Capability, "status">[]): Record<CapabilityStatus, number> {
  const counts: Record<CapabilityStatus, number> = { pass: 0, warn: 0, fail: 0, untested: 0 };
  for (const capability of capabilities) counts[capability.status] += 1;
  return counts;
}

/** Orden de la tabla: primero lo que falla, al final lo aprobado. */
export function sortCapabilities<T extends Pick<Capability, "status" | "label">>(capabilities: readonly T[]): T[] {
  return [...capabilities].sort(
    (a, b) =>
      CAPABILITY_STATUS_ORDER.indexOf(a.status) - CAPABILITY_STATUS_ORDER.indexOf(b.status) ||
      a.label.localeCompare(b.label, "es"),
  );
}

/** «0,91 · Recall@k (probe)», «96 % · Checks aprobados» o «—». */
export function capabilityMetricText(capability: Pick<Capability, "metric_label" | "metric_value" | "source">): string {
  if (capability.metric_value === null) return "—";
  const value =
    capability.source === "probe"
      ? capability.metric_value.toFixed(2).replace(".", ",")
      : `${Math.round(capability.metric_value * 100)} %`;
  return capability.metric_label ? `${value} · ${capability.metric_label}` : value;
}

/** Muestra según la fuente: ítems del probe, checks o cases. */
export function capabilitySampleText(capability: Pick<Capability, "sample_size" | "source">): string {
  if (capability.source === null || capability.sample_size === 0) return "—";
  const noun =
    capability.source === "probe" ? "ítems" : capability.source === "checks" ? "checks" : "casos";
  return `${capability.sample_size} ${noun}`;
}

/** Criterios del borrador ya parseados para el editor. */
export function draftCriteria(draft: Pick<ScenarioDraft, "success_criteria">): SuccessCriterion[] {
  return parseSuccessCriteria(draft.success_criteria);
}

/** Texto corto de un criterio descartado por el borrador. */
export function droppedCriterionText(entry: ScenarioDraft["dropped"][number]): string {
  const raw = typeof entry.criterion === "object" && entry.criterion !== null ? JSON.stringify(entry.criterion) : String(entry.criterion);
  return `${raw.length > 80 ? `${raw.slice(0, 79)}…` : raw} — ${entry.reason}`;
}
