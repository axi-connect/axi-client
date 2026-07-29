import type { Schemas } from "@/core/api/types";
import type { ContactLifecycleStage, ContactSource } from "./enums";

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
