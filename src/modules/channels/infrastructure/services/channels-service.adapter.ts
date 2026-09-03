import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { ChannelDTO, CreateChannelDTO, UpdateChannelDTO } from "@/modules/channels/domain/channel";

/** Adapter HTTP del slice channels → `/channels`. */
export function listChannels(): Promise<Schemas["ChannelListDto"]> {
  return http.get<Schemas["ChannelListDto"]>("/channels");
}

export function getChannelById(id: string): Promise<ChannelDTO> {
  return http.get<ChannelDTO>(`/channels/${id}`);
}

export function createChannel(dto: CreateChannelDTO): Promise<ChannelDTO> {
  return http.post<ChannelDTO>("/channels", dto);
}

/** PATCH de `name` y/o `default_ai_agent_id` (vincula el agente IA al canal). */
export function updateChannel(id: string, dto: UpdateChannelDTO): Promise<ChannelDTO> {
  return http.patch<ChannelDTO>(`/channels/${id}`, dto);
}

/** Rota el access token de un canal whatsapp_cloud. */
export function updateChannelCredentials(id: string, accessToken: string): Promise<ChannelDTO> {
  return http.put<ChannelDTO>(`/channels/${id}/credentials`, { access_token: accessToken });
}

/**
 * Desconexión suave (B10): deja de recibir y de enviar, pero **conserva el
 * canal, su historial y su configuración**. Reconectar recupera el mismo canal.
 */
export function disconnectChannel(id: string): Promise<ChannelDTO> {
  return http.post<ChannelDTO>(`/channels/${id}/disconnect`, {});
}

export function deleteChannel(id: string): Promise<void> {
  return http.delete(`/channels/${id}`);
}
