import { http } from "@/core/services/http";
import type {
  BulkDTO,
  BulkPreviewDTO,
  CreateBulkDTO,
} from "@/modules/crm/domain/bulk-follow-up";

/** Audiencia: una lista explícita, un segmento o lo que creó un import —
 *  nunca dos a la vez. */
export type BulkAudience =
  | { source: "contacts"; contact_ids: string[] }
  | { source: "segment"; segment_id: string }
  | { source: "import"; import_job_id: string };

/**
 * Acción masiva del agente (F4a). El preflight y el alta comparten audiencia:
 * lo que el recuento promete es lo que el lote aplica.
 */
export function previewBulk(audience: BulkAudience): Promise<BulkPreviewDTO> {
  return http.post<BulkPreviewDTO>("/crm/agent-tasks/bulk/preview", audience);
}

/** 202: el lote queda encolado. Las tareas aparecen según se materializan. */
export function createBulk(body: CreateBulkDTO): Promise<BulkDTO> {
  return http.post<BulkDTO>("/crm/agent-tasks/bulk", body);
}

export function getBulk(bulkId: string): Promise<BulkDTO> {
  return http.get<BulkDTO>(`/crm/agent-tasks/bulk/${bulkId}`);
}

/** Anula las tareas que QUEDAN. Lo ya enviado no se recoge. */
export function cancelBulk(bulkId: string): Promise<{ cancelled_tasks: number }> {
  return http.post<{ cancelled_tasks: number }>(`/crm/agent-tasks/bulk/${bulkId}/cancel`, {});
}
