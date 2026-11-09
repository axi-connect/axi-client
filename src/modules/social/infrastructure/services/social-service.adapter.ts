import { http } from "@/core/services/http";
import type {
  ActivityItemDTO,
  CreateSocialAutomationDTO,
  SocialAutomationDTO,
  SocialChannelDTO,
  SocialAssetDTO,
  SocialMediaDTO,
  UpdateSocialAutomationDTO,
} from "@/modules/social/domain/social";

/** Marketing › Redes («Comenta y recibe»): /api/v1/social/*. */

export async function listSocialAutomations(): Promise<SocialAutomationDTO[]> {
  const res = await http.get<{ data: SocialAutomationDTO[] }>("/social/automations");
  return res.data;
}

export function getSocialAutomation(id: string): Promise<SocialAutomationDTO> {
  return http.get<SocialAutomationDTO>(`/social/automations/${id}`);
}

export function createSocialAutomation(dto: CreateSocialAutomationDTO): Promise<SocialAutomationDTO> {
  return http.post<SocialAutomationDTO>("/social/automations", dto);
}

export function updateSocialAutomation(
  id: string,
  dto: UpdateSocialAutomationDTO,
): Promise<SocialAutomationDTO> {
  return http.patch<SocialAutomationDTO>(`/social/automations/${id}`, dto);
}

export function activateSocialAutomation(id: string): Promise<SocialAutomationDTO> {
  return http.post<SocialAutomationDTO>(`/social/automations/${id}/activate`);
}

export function pauseSocialAutomation(id: string): Promise<SocialAutomationDTO> {
  return http.post<SocialAutomationDTO>(`/social/automations/${id}/pause`);
}

export function deleteSocialAutomation(id: string): Promise<void> {
  return http.delete(`/social/automations/${id}`);
}

export function listSocialActivity(
  id: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<{ data: ActivityItemDTO[]; next_cursor: string | null }> {
  return http.get(`/social/automations/${id}/activity`, { ...params });
}

export async function listSocialChannels(): Promise<SocialChannelDTO[]> {
  const res = await http.get<{ data: SocialChannelDTO[] }>("/social/channels");
  return res.data;
}

/**
 * Sube un archivo de la entrega a la biblioteca del negocio. El bloque lo
 * referencia por `id`: el cliente nunca maneja rutas de almacenamiento.
 */
export function uploadSocialAsset(file: File): Promise<SocialAssetDTO> {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.post<SocialAssetDTO>("/social/assets", form);
}

export async function listChannelMedia(channelId: string): Promise<SocialMediaDTO[]> {
  const res = await http.get<{ data: SocialMediaDTO[] }>(`/social/channels/${channelId}/media`);
  return res.data;
}
