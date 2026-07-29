import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
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

// ---------------------------------------------------------------------------
// Configuración (F5, gate crm:manage)
// ---------------------------------------------------------------------------

/** 409 `crm/pipeline_name_taken` si el nombre ya existe. */
export function createPipeline(dto: Schemas["CreatePipelineDto"]): Promise<PipelineDTO> {
  return http.post<PipelineDTO>("/crm/pipelines", dto);
}

/** `is_default: true` mueve el default (único por empresa). */
export function updatePipeline(
  id: string,
  dto: Schemas["UpdatePipelineDto"],
): Promise<PipelineDTO> {
  return http.patch<PipelineDTO>(`/crm/pipelines/${id}`, dto);
}

/** Con deals open → 409 `crm/pipeline_in_use`; reintentar con destino. */
export function deletePipeline(id: string, moveToPipelineId?: string): Promise<void> {
  return http.delete<void>(
    `/crm/pipelines/${id}${moveToPipelineId !== undefined ? `?move_to_pipeline_id=${moveToPipelineId}` : ""}`,
  );
}

/** Etapa nueva al final; devuelve el pipeline completo. */
export function createStage(
  pipelineId: string,
  dto: Schemas["CreateStageDto"],
): Promise<PipelineDTO> {
  return http.post<PipelineDTO>(`/crm/pipelines/${pipelineId}/stages`, dto);
}

export function updateStage(
  pipelineId: string,
  stageId: string,
  dto: Schemas["UpdateStageDto"],
): Promise<PipelineDTO> {
  return http.patch<PipelineDTO>(`/crm/pipelines/${pipelineId}/stages/${stageId}`, dto);
}

/** Con deals → 409 `crm/stage_in_use` (+destino); última → `stage_last_protected`. */
export function deleteStage(
  pipelineId: string,
  stageId: string,
  moveToStageId?: string,
): Promise<PipelineDTO> {
  return http.delete<PipelineDTO>(
    `/crm/pipelines/${pipelineId}/stages/${stageId}${moveToStageId !== undefined ? `?move_to_stage_id=${moveToStageId}` : ""}`,
  );
}

/** Lista COMPLETA de stage_ids; 422 `crm/stage_reorder_mismatch` si difiere. */
export function reorderStages(pipelineId: string, stageIds: string[]): Promise<PipelineDTO> {
  return http.put<PipelineDTO>(`/crm/pipelines/${pipelineId}/stages/reorder`, {
    stage_ids: stageIds,
  });
}
