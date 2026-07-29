import { http } from "@/core/services/http";
import type { ImportJobDTO, ImportOptions } from "@/modules/crm/domain/import";
import type { SegmentFilters } from "@/modules/crm/domain/segment";

/**
 * Adapter HTTP del import CSV (`/crm/imports`, permiso contacts:import) y de
 * la URL del export (`/crm/exports/contacts`, contacts:export, AUDITADO).
 */

/** Multipart: el job vuelve `pending` y se sigue por polling + WS. */
export function createImport(file: File, options: ImportOptions): Promise<ImportJobDTO> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("on_duplicate", options.on_duplicate);
  if (options.tag_ids.length > 0) form.append("tag_ids", options.tag_ids.join(","));
  if (options.lifecycle_stage !== undefined) {
    form.append("lifecycle_stage", options.lifecycle_stage);
  }
  return http.post<ImportJobDTO>("/crm/imports", form);
}

export async function listImports(): Promise<ImportJobDTO[]> {
  const res = await http.get<{ data: ImportJobDTO[] }>("/crm/imports");
  return res.data;
}

export function getImport(id: string): Promise<ImportJobDTO> {
  return http.get<ImportJobDTO>(`/crm/imports/${id}`);
}

/**
 * URL de descarga directa del export (streaming CSV con BOM, cap 50k):
 * pasa por el proxy BFF (`/api/proxy` antepone /api/v1 e inyecta el Bearer)
 * y el navegador respeta el Content-Disposition. Nunca parsear como JSON.
 * Query: `segment_id` O `filters` (DSL serializado como JSON).
 */
export function exportContactsUrl(
  params: { segment_id: string } | { filters: SegmentFilters },
): string {
  const query = new URLSearchParams();
  if ("segment_id" in params) query.set("segment_id", params.segment_id);
  else query.set("filters", JSON.stringify(params.filters));
  return `/api/proxy/crm/exports/contacts?${query.toString()}`;
}
