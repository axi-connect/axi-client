import { http } from "@/core/services/http";
import type { BoardDTO, PipelineDTO } from "@/modules/crm/domain/deal";

/**
 * Adapter HTTP de pipelines (`/crm/pipelines`, crm:read; config crm:manage).
 * El primer GET del tenant materializa el pipeline default (server-side):
 * la lista nunca se trata como "sin configurar". El CRUD de etapas llega en F5.
 */
export async function listPipelines(): Promise<PipelineDTO[]> {
  const res = await http.get<{ data: PipelineDTO[] }>("/crm/pipelines");
  return res.data;
}

/** Kanban: columnas = stages con `total_count`, `total_value_cents` y ≤25 deals. */
export function getBoard(pipelineId: string): Promise<BoardDTO> {
  return http.get<BoardDTO>(`/crm/pipelines/${pipelineId}/board`);
}
