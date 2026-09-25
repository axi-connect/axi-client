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

/**
 * Familias del tablero (quality_premium_plan F3). Los códigos son los del
 * `CAPABILITY_CATALOG` del servidor; uno nuevo que aún no esté aquí cae en
 * «Otras» en vez de desaparecer.
 */
export const CAPABILITY_FAMILIES: readonly { key: string; label: string; codes: readonly string[] }[] = [
  { key: "sell", label: "Vender", codes: ["advising", "quote_order", "closing", "negotiation", "payments", "delivery", "promotions"] },
  { key: "understand", label: "Entender y encontrar", codes: ["intent", "catalog_search", "recognition", "media"] },
  { key: "follow", label: "Datos y seguimiento", codes: ["contact_capture", "crm_journey", "scheduling", "escalation"] },
  { key: "care", label: "Cuidado", codes: ["security", "style", "performance"] },
];

export type CapabilityGroup<T> = { key: string; label: string; items: T[] };

/** Agrupa por familia (orden del catálogo de familias) y ordena cada grupo con `sortCapabilities`. */
export function groupCapabilities<T extends Pick<Capability, "code" | "status" | "label">>(capabilities: readonly T[]): CapabilityGroup<T>[] {
  const known = new Set(CAPABILITY_FAMILIES.flatMap((family) => family.codes));
  const groups = CAPABILITY_FAMILIES.map((family) => ({
    key: family.key,
    label: family.label,
    items: sortCapabilities(capabilities.filter((capability) => family.codes.includes(capability.code))),
  }));
  const rest = sortCapabilities(capabilities.filter((capability) => !known.has(capability.code)));
  if (rest.length > 0) groups.push({ key: "other", label: "Otras", items: rest });
  return groups.filter((group) => group.items.length > 0);
}

/**
 * La capacidad que más urge (isla del tablero): la fallida con peor cifra; si
 * no hay, la de alerta con peor cifra; si todo pasa o nada se probó, null.
 */
export function mostUrgentCapability<T extends Pick<Capability, "status" | "metric_value" | "label">>(capabilities: readonly T[]): T | null {
  for (const status of ["fail", "warn"] as const) {
    const candidates = capabilities
      .filter((capability) => capability.status === status)
      .sort((a, b) => (a.metric_value ?? 1) - (b.metric_value ?? 1) || a.label.localeCompare(b.label, "es"));
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

/** Solo la cifra: «0,91» (probe), «96 %» (checks/casos) o «—». */
export function capabilityMetricValue(capability: Pick<Capability, "metric_value" | "source">): string {
  if (capability.metric_value === null) return "—";
  return capability.source === "probe"
    ? capability.metric_value.toFixed(2).replace(".", ",")
    : `${Math.round(capability.metric_value * 100)} %`;
}

/** «0,91 · Recall@k (probe)», «96 % · Checks aprobados» o «—». */
export function capabilityMetricText(capability: Pick<Capability, "metric_label" | "metric_value" | "source">): string {
  const value = capabilityMetricValue(capability);
  if (capability.metric_value === null) return value;
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
