import type { Paginated } from "@/core/api/types";
import { http } from "@/core/services/http";
import type {
  AudiencePreviewDTO,
  CampaignDTO,
  CampaignRecipientDTO,
  CampaignStatsDTO,
  CreateCampaignDTO,
  ListCampaignsParams,
  ListRecipientsParams,
  UpdateCampaignDTO,
} from "@/modules/marketing/domain/campaign";

/**
 * Adapter HTTP de campañas (`/marketing/campaigns`).
 *
 * OJO con dos formas del contrato que condicionan a los consumidores:
 *  - el LISTADO no trae stats: el funnel exige `getCampaignStats(id)` aparte,
 *    así que jamás se pide en bucle sobre la lista (ver `overview.store`).
 *  - `previewAudience` es un POST sobre una campaña que YA existe: el wizard
 *    tiene que crear el borrador antes de poder estimar la audiencia.
 */

export async function listCampaigns(
  params: ListCampaignsParams = {},
): Promise<Paginated<CampaignDTO>> {
  return http.get<Paginated<CampaignDTO>>("/marketing/campaigns", { ...params });
}

export function getCampaign(id: string): Promise<CampaignDTO> {
  return http.get<CampaignDTO>(`/marketing/campaigns/${id}`);
}

export function createCampaign(dto: CreateCampaignDTO): Promise<CampaignDTO> {
  return http.post<CampaignDTO>("/marketing/campaigns", dto);
}

/** Solo en `draft`/`scheduled`; después → 409 `marketing/campaign_not_editable`. */
export function updateCampaign(id: string, dto: UpdateCampaignDTO): Promise<CampaignDTO> {
  return http.patch<CampaignDTO>(`/marketing/campaigns/${id}`, dto);
}

/** Solo en `draft`. */
export function deleteCampaign(id: string): Promise<void> {
  return http.delete<void>(`/marketing/campaigns/${id}`);
}

/** Los opt-outs se cuentan sobre una MUESTRA (cap 1000): es una estimación. */
export function previewAudience(id: string): Promise<AudiencePreviewDTO> {
  return http.post<AudiencePreviewDTO>(`/marketing/campaigns/${id}/preview-audience`);
}

/** Valida el contenido, congela el snapshot y arranca (o programa) el envío. */
export function launchCampaign(id: string): Promise<{ status: string }> {
  return http.post<{ status: string }>(`/marketing/campaigns/${id}/launch`);
}

export function pauseCampaign(id: string): Promise<void> {
  return http.post<void>(`/marketing/campaigns/${id}/pause`);
}

export function resumeCampaign(id: string): Promise<void> {
  return http.post<void>(`/marketing/campaigns/${id}/resume`);
}

/** Los pendientes quedan `skipped(campaign_cancelled)`. Irreversible. */
export function cancelCampaign(id: string): Promise<void> {
  return http.post<void>(`/marketing/campaigns/${id}/cancel`);
}

export function getCampaignStats(id: string): Promise<CampaignStatsDTO> {
  return http.get<CampaignStatsDTO>(`/marketing/campaigns/${id}/stats`);
}

export function listCampaignRecipients(
  id: string,
  params: ListRecipientsParams = {},
): Promise<Paginated<CampaignRecipientDTO>> {
  return http.get<Paginated<CampaignRecipientDTO>>(
    `/marketing/campaigns/${id}/recipients`,
    { ...params },
  );
}
