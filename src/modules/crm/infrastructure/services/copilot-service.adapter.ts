import { http } from "@/core/services/http";
import type {
  CopilotActionDTO,
  CopilotDraftDTO,
  CopilotPipelineDTO,
  CopilotSummaryDTO,
} from "@/modules/crm/domain/copilot";

/** Adapter HTTP del copiloto (on-demand; POST sin body). */
export function generateContactSummary(contactId: string): Promise<CopilotSummaryDTO> {
  return http.post<CopilotSummaryDTO>(`/crm/contacts/${contactId}/ai/summary`, {});
}

export function generateNextBestAction(contactId: string): Promise<CopilotActionDTO> {
  return http.post<CopilotActionDTO>(`/crm/contacts/${contactId}/ai/next-best-action`, {});
}

/** Borrador de WhatsApp para copiar al inbox. */
export function generateFollowupDraft(contactId: string): Promise<CopilotDraftDTO> {
  return http.post<CopilotDraftDTO>(`/crm/contacts/${contactId}/ai/draft-followup`, {});
}

export function generatePipelineSummary(pipelineId: string): Promise<CopilotPipelineDTO> {
  return http.post<CopilotPipelineDTO>(`/crm/pipelines/${pipelineId}/ai/summary`, {});
}
