import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  CreateTagDTO,
  SegmentContactDTO,
  SegmentDTO,
  SegmentFilters,
  TagDTO,
  UpdateTagDTO,
} from "@/modules/crm/domain/segment";

/** Adapter HTTP de tags y segmentos (`/crm/tags`, `/crm/segments`). */
export async function listTags(): Promise<TagDTO[]> {
  const res = await http.get<{ data: TagDTO[] }>("/crm/tags");
  return res.data;
}

// OJO: POST/PATCH de tags devuelven la LISTA COMPLETA, no el tag creado.
export async function createTag(dto: CreateTagDTO): Promise<TagDTO[]> {
  const res = await http.post<{ data: TagDTO[] }>("/crm/tags", dto);
  return res.data;
}

export async function updateTag(id: string, dto: UpdateTagDTO): Promise<TagDTO[]> {
  const res = await http.patch<{ data: TagDTO[] }>(`/crm/tags/${id}`, dto);
  return res.data;
}

/** Hard delete: limpia los joins con contactos. */
export function deleteTag(id: string): Promise<void> {
  return http.delete<void>(`/crm/tags/${id}`);
}

export async function listSegments(): Promise<SegmentDTO[]> {
  const res = await http.get<{ data: SegmentDTO[] }>("/crm/segments");
  return res.data;
}

/** 409 `crm/segment_name_taken`; claves extrañas en filters → 400. */
export function createSegment(dto: {
  name: string;
  description?: string | null;
  filters: SegmentFilters;
}): Promise<SegmentDTO> {
  return http.post<SegmentDTO>("/crm/segments", dto);
}

export function updateSegment(
  id: string,
  dto: { name?: string; description?: string | null; filters?: SegmentFilters },
): Promise<SegmentDTO> {
  return http.patch<SegmentDTO>(`/crm/segments/${id}`, dto);
}

export function deleteSegment(id: string): Promise<void> {
  return http.delete<void>(`/crm/segments/${id}`);
}

/** Ejecuta el DSL del segmento, paginado. */
export function listSegmentContacts(
  id: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Paginated<SegmentContactDTO>> {
  return http.get<Paginated<SegmentContactDTO>>(`/crm/segments/${id}/contacts`, params);
}
