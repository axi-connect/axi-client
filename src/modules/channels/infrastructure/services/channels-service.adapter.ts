import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  ChannelDTO,
  CreateChannelDTO,
  UpdateChannelDTO,
  WwebPairingStateDTO,
} from "@/modules/channels/domain/channel";

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

export function deleteChannel(id: string): Promise<void> {
  return http.delete(`/channels/${id}`);
}

// ---------------------------------------------------------------------------
// Subrecurso WhatsApp Web — TODO asíncrono (202): el estado final llega por
// WS `/channels` (channel.qr_code / channel.status_changed / session_failed).
// ---------------------------------------------------------------------------

/** Inicia (o retoma) la sesión del worker → 202 { status: "connecting" }. */
export function startWwebSession(id: string): Promise<{ status: string }> {
  return http.post<{ status: string }>(`/channels/${id}/whatsapp-web/session`);
}

/** Detiene el socket conservando la sesión (202). */
export function stopWwebSession(id: string): Promise<void> {
  return http.delete(`/channels/${id}/whatsapp-web/session`);
}

/** Snapshot del pairing para polling (~2 s) como fallback del WS. */
export function getWwebPairingState(id: string): Promise<WwebPairingStateDTO> {
  return http.get<WwebPairingStateDTO>(`/channels/${id}/whatsapp-web/qr`);
}

/** Pide código de 8 dígitos (phone E.164 sin `+`) → 202. */
export function requestWwebPairingCode(id: string, phoneNumber: string): Promise<void> {
  return http.post<void>(`/channels/${id}/whatsapp-web/pairing-code`, { phone_number: phoneNumber });
}

/** Desvincula el dispositivo y borra la sesión (202). */
export function logoutWweb(id: string): Promise<void> {
  return http.post<void>(`/channels/${id}/whatsapp-web/logout`);
}
