import type { Paginated, Schemas } from "@/core/api/types";
import { http, type Params } from "@/core/services/http";

import type {
  LeadDTO,
  LeadDetailDTO,
  LeadSource,
  LeadStatus,
  OutreachChannel,
  PromoteResultDTO,
  ProspectingStatsDTO,
  QualityStatus,
} from "../../domain/lead";

export type ProspectingSettingsDTO = Schemas["ProspectingSettingsDto"];
export type SuppressionDTO = Schemas["SuppressionDto"];

export interface ListLeadsParams extends Params {
  page?: number;
  page_size?: number;
  status?: LeadStatus;
  source?: LeadSource;
  quality_status?: QualityStatus;
  /** «Enséñame solo los que permiten WhatsApp». */
  allows?: OutreachChannel;
  min_score?: number;
  city?: string;
  q?: string;
}

/**
 * Adapter HTTP de la captación (`/prospecting`).
 *
 * Gotcha del contrato: `POST /prospecting/leads/promote` responde **200 con
 * resultado por lead**, no 2xx/4xx global. Que uno de cinco esté suprimido no
 * invalida los otros cuatro, así que la UI tiene que leer `failed` aunque la
 * petición haya ido bien.
 */
export function listLeads(
  params: ListLeadsParams = {},
): Promise<Paginated<LeadDTO>> {
  return http.get<Paginated<LeadDTO>>("/prospecting/leads", params);
}

export function getLead(leadId: string): Promise<LeadDetailDTO> {
  return http.get<LeadDetailDTO>(`/prospecting/leads/${leadId}`);
}

export function getProspectingStats(): Promise<ProspectingStatsDTO> {
  return http.get<ProspectingStatsDTO>("/prospecting/stats");
}

/** Requiere `leads:promote`. Ver el gotcha del 200 con fallos parciales. */
export function promoteLeads(leadIds: string[]): Promise<PromoteResultDTO> {
  return http.post<PromoteResultDTO>("/prospecting/leads/promote", {
    lead_ids: leadIds,
  });
}

export function discardLead(leadId: string, reason?: string): Promise<void> {
  return http.post<void>(`/prospecting/leads/${leadId}/discard`, { reason });
}

export function listSuppressions(): Promise<SuppressionDTO[]> {
  return http.get<SuppressionDTO[]>("/prospecting/suppressions");
}

export function createSuppression(input: {
  kind: SuppressionDTO["kind"];
  value: string;
  reason?: string;
}): Promise<SuppressionDTO> {
  return http.post<SuppressionDTO>("/prospecting/suppressions", input);
}

export function removeSuppression(id: string): Promise<void> {
  return http.delete<void>(`/prospecting/suppressions/${id}`);
}

export function getProspectingSettings(): Promise<ProspectingSettingsDTO> {
  return http.get<ProspectingSettingsDTO>("/prospecting/settings");
}

export function updateProspectingSettings(
  input: ProspectingSettingsDTO,
): Promise<ProspectingSettingsDTO> {
  return http.put<ProspectingSettingsDTO>("/prospecting/settings", input);
}
