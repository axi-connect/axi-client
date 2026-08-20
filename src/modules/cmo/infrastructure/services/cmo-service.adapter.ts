import { http } from "@/core/services/http";
import type {
  ApprovalResultDTO,
  BriefingDTO,
  CmoMessageDTO,
  CmoReplyDTO,
  CmoSettingsDTO,
  CmoThreadDTO,
  CreateDirectiveDTO,
  DirectiveDTO,
  ProposalDTO,
  ProposalStatus,
  RejectProposalDTO,
  SendMessageDTO,
} from "@/modules/cmo/domain/cmo";

/**
 * Adapter HTTP del módulo CMO (`/cmo/*`).
 *
 * Tres formas del contrato que condicionan a los consumidores:
 *
 *  - **`POST /cmo/messages` puede tardar decenas de segundos** y consume cuota
 *    de análisis. No es cacheable ni reintentable a la ligera: un reintento
 *    automático gastaría dos análisis del plan por la misma pregunta.
 *  - **`GET /cmo/proposals` devuelve las PENDIENTES por defecto**, no todas.
 *    Para el histórico hay que pasar `status` explícitamente.
 *  - **`briefings/latest` y el detalle de propuesta devuelven `{data: null}`**
 *    cuando no hay nada, no un 404. Un tenant recién activado es el caso normal,
 *    no un error.
 */

// ------------------------------------------------------------------ chat

export function sendMessage(dto: SendMessageDTO): Promise<CmoReplyDTO> {
  return http.post<CmoReplyDTO>("/cmo/messages", dto);
}

export async function listThreads(): Promise<CmoThreadDTO[]> {
  const { data } = await http.get<{ data: CmoThreadDTO[] }>("/cmo/threads");
  return data;
}

export async function createThread(): Promise<CmoThreadDTO> {
  const { data } = await http.post<{ data: CmoThreadDTO }>("/cmo/threads", {});
  return data;
}

export async function getTranscript(threadId: string): Promise<CmoMessageDTO[]> {
  const { data } = await http.get<{ thread_id: string; data: CmoMessageDTO[] }>(
    `/cmo/threads/${threadId}`,
  );
  return data;
}

export function archiveThread(threadId: string): Promise<void> {
  return http.post<void>(`/cmo/threads/${threadId}/archive`, {});
}

// -------------------------------------------------------------- propuestas

export async function listProposals(status?: ProposalStatus): Promise<ProposalDTO[]> {
  const { data } = await http.get<{ data: ProposalDTO[] }>(
    "/cmo/proposals",
    status === undefined ? {} : { status },
  );
  return data;
}

/** `null` = ya no está (venció o alguien la decidió), no un error. */
export async function getProposal(id: string): Promise<ProposalDTO | null> {
  const { data } = await http.get<{ data: ProposalDTO | null }>(`/cmo/proposals/${id}`);
  return data;
}

export function approveProposal(id: string): Promise<ApprovalResultDTO> {
  return http.post<ApprovalResultDTO>(`/cmo/proposals/${id}/approve`, {});
}

export function rejectProposal(
  id: string,
  dto: RejectProposalDTO,
): Promise<{ directive_created: boolean }> {
  return http.post<{ directive_created: boolean }>(`/cmo/proposals/${id}/reject`, dto);
}

// --------------------------------------------------------------- briefings

export async function listBriefings(): Promise<BriefingDTO[]> {
  const { data } = await http.get<{ data: BriefingDTO[] }>("/cmo/briefings");
  return data;
}

/** `null` cuando el tenant todavía no ha tenido su primer briefing. */
export async function getLatestBriefing(): Promise<BriefingDTO | null> {
  const { data } = await http.get<{ data: BriefingDTO | null }>("/cmo/briefings/latest");
  return data;
}

// -------------------------------------------------------------- directrices

export async function listDirectives(): Promise<DirectiveDTO[]> {
  const { data } = await http.get<{ data: DirectiveDTO[] }>("/cmo/directives");
  return data;
}

export function createDirective(dto: CreateDirectiveDTO): Promise<{ id: string }> {
  return http.post<{ id: string }>("/cmo/directives", dto);
}

/** Desactiva sin borrar: el historial de lo que el dueño pensó tiene valor. */
export function deactivateDirective(id: string): Promise<void> {
  return http.delete<void>(`/cmo/directives/${id}`);
}

export function reactivateDirective(id: string): Promise<void> {
  return http.post<void>(`/cmo/directives/${id}/reactivate`, {});
}

// ------------------------------------------------------------------ ajustes

export function getCmoSettings(): Promise<CmoSettingsDTO> {
  return http.get<CmoSettingsDTO>("/cmo/settings");
}

/** PUT de sección COMPLETA: el backend reemplaza, no hace merge parcial. */
export function saveCmoSettings(dto: CmoSettingsDTO): Promise<CmoSettingsDTO> {
  return http.put<CmoSettingsDTO>("/cmo/settings", dto);
}
