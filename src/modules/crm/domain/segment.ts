import type { Schemas } from "@/core/api/types";
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STAGE_LABELS,
  type ContactLifecycleStage,
  type ContactSource,
} from "./enums";

/** Contratos de tags y segmentos (`/crm/tags`, `/crm/segments`). */

export type TagDTO = Schemas["TagsListDto"]["data"][number];
export type CreateTagDTO = Schemas["CreateTagDto"];
export type UpdateTagDTO = Schemas["UpdateTagDto"];

export type SegmentDTO = Schemas["SegmentsListDto"]["data"][number];
export type SegmentContactDTO = Schemas["SegmentContactsDto"]["data"][number];

/**
 * DSL de `filters` — espejo EXACTO del zod del backend
 * (`segment_filter.builder.ts`): el builder solo emite estas claves;
 * claves extrañas → 400.
 */
export type SegmentFilters = {
  lifecycle_stage?: ContactLifecycleStage[];
  source?: ContactSource[];
  tag_ids?: { any?: string[]; all?: string[] };
  city?: string;
  q?: string;
  min_score?: number;
  created_after?: string;
  created_before?: string;
  has_open_deal?: boolean;
  /** "Contactos fríos": sin actividad desde la fecha (incluye sin actividad). */
  last_activity_before?: string;
};

/**
 * Resumen del DSL en lenguaje humano ("etapa ∈ [Lead] · score ≥ 50").
 *
 * Vive en `domain` y no en el componente porque lo consumen la card de un
 * segmento del CRM, el builder y el paso de audiencia del wizard de campañas:
 * tres sitios que deben describir los mismos filtros con las mismas palabras.
 */
export function describeSegmentFilters(filters: SegmentFilters, tags: TagDTO[]): string {
  const parts: string[] = [];
  if (filters.lifecycle_stage?.length) {
    parts.push(
      `etapa ∈ [${filters.lifecycle_stage.map((s) => CONTACT_STAGE_LABELS[s]).join(", ")}]`,
    );
  }
  if (filters.source?.length) {
    parts.push(`fuente ∈ [${filters.source.map((s) => CONTACT_SOURCE_LABELS[s]).join(", ")}]`);
  }
  const tagName = (id: string) => tags.find((tag) => tag.id === id)?.name ?? "?";
  if (filters.tag_ids?.any?.length) {
    parts.push(`alguna etiqueta: ${filters.tag_ids.any.map(tagName).join(", ")}`);
  }
  if (filters.tag_ids?.all?.length) {
    parts.push(`todas las etiquetas: ${filters.tag_ids.all.map(tagName).join(", ")}`);
  }
  if (filters.city) parts.push(`ciudad: ${filters.city}`);
  if (filters.q) parts.push(`busca “${filters.q}”`);
  if (filters.min_score !== undefined) parts.push(`score ≥ ${filters.min_score}`);
  if (filters.created_after) parts.push(`creados desde ${filters.created_after.slice(0, 10)}`);
  if (filters.created_before) parts.push(`creados hasta ${filters.created_before.slice(0, 10)}`);
  if (filters.has_open_deal !== undefined) {
    parts.push(filters.has_open_deal ? "con oportunidad abierta" : "sin oportunidad abierta");
  }
  if (filters.last_activity_before) {
    parts.push(`sin actividad desde ${filters.last_activity_before.slice(0, 10)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "sin filtros (todos los contactos)";
}

/**
 * Los filtros de un segmento como chips «nombre · valor» (lienzo CRM premium
 * F4 · Segmentos). Mismo DSL y mismo orden que `describeSegmentFilters`, pero
 * en palabras de persona: la frase de arriba la comparte el asistente de
 * campañas y se queda como está. Una fecha ISO se lee como día.
 */
export function segmentFilterChips(filters: SegmentFilters, tags: TagDTO[]): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  const day = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const tagName = (id: string) => tags.find((tag) => tag.id === id)?.name ?? "Etiqueta borrada";
  if (filters.lifecycle_stage?.length) {
    chips.push({ label: "Etapa", value: filters.lifecycle_stage.map((s) => CONTACT_STAGE_LABELS[s]).join(", ") });
  }
  if (filters.source?.length) {
    chips.push({ label: "Fuente", value: filters.source.map((s) => CONTACT_SOURCE_LABELS[s]).join(", ") });
  }
  if (filters.tag_ids?.any?.length) chips.push({ label: "Alguna etiqueta", value: filters.tag_ids.any.map(tagName).join(", ") });
  if (filters.tag_ids?.all?.length) chips.push({ label: "Todas las etiquetas", value: filters.tag_ids.all.map(tagName).join(", ") });
  if (filters.city) chips.push({ label: "Ciudad", value: filters.city });
  if (filters.q) chips.push({ label: "Busca", value: `“${filters.q}”` });
  if (filters.min_score !== undefined) chips.push({ label: "Puntaje", value: `al menos ${String(filters.min_score)}` });
  if (filters.created_after) chips.push({ label: "Creado desde", value: day(filters.created_after) });
  if (filters.created_before) chips.push({ label: "Creado hasta", value: day(filters.created_before) });
  if (filters.has_open_deal !== undefined) {
    chips.push({ label: "Oportunidad", value: filters.has_open_deal ? "con una abierta" : "sin ninguna abierta" });
  }
  if (filters.last_activity_before) chips.push({ label: "Sin actividad desde", value: day(filters.last_activity_before) });
  return chips;
}

/** Elimina claves vacías para no mandar ruido al validador del backend. */
export function compactSegmentFilters(filters: SegmentFilters): SegmentFilters {
  const out: SegmentFilters = {};
  if (filters.lifecycle_stage?.length) out.lifecycle_stage = filters.lifecycle_stage;
  if (filters.source?.length) out.source = filters.source;
  const any = filters.tag_ids?.any?.length ? filters.tag_ids.any : undefined;
  const all = filters.tag_ids?.all?.length ? filters.tag_ids.all : undefined;
  if (any !== undefined || all !== undefined) {
    out.tag_ids = { ...(any !== undefined && { any }), ...(all !== undefined && { all }) };
  }
  if (filters.city?.trim()) out.city = filters.city.trim();
  if (filters.q?.trim()) out.q = filters.q.trim();
  if (filters.min_score !== undefined) out.min_score = filters.min_score;
  if (filters.created_after) out.created_after = filters.created_after;
  if (filters.created_before) out.created_before = filters.created_before;
  if (filters.has_open_deal !== undefined) out.has_open_deal = filters.has_open_deal;
  if (filters.last_activity_before) out.last_activity_before = filters.last_activity_before;
  return out;
}
