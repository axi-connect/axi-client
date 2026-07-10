import { http } from "@/core/services/http";
import type { CursorPage, Paginated } from "@/core/api/types";
import type {
  ConversationDTO,
  ConversationEvent,
  EnqueuedMessage,
  InboxConversation,
  InboxCounts,
  Message,
  SendMessageDTO,
} from "@/modules/inbox/domain/inbox";

/**
 * Adapter HTTP del slice inbox. Las ACCIONES de handoff van por WebSocket
 * (use-inbox-socket) — estos endpoints REST espejo son el fallback cuando el
 * socket está caído.
 */
export function listInboxConversations(params: {
  page?: number;
  page_size?: number;
  status?: string;
  mode?: string;
  assigned?: string;
  channel_id?: string;
  priority?: string;
}): Promise<Paginated<InboxConversation>> {
  return http.get<Paginated<InboxConversation>>("/inbox/conversations", params);
}

export function getInboxCounts(): Promise<InboxCounts> {
  return http.get<InboxCounts>("/inbox/counts");
}

export function getConversation(id: string): Promise<ConversationDTO> {
  return http.get<ConversationDTO>(`/conversations/${id}`);
}

/** Timeline de mensajes por cursor (scroll-up infinito). */
export function getConversationMessages(
  id: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<CursorPage<Message>> {
  return http.get<CursorPage<Message>>(`/conversations/${id}/messages`, params);
}

/** Timeline de eventos de handoff por cursor. */
export function getConversationEvents(
  id: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<CursorPage<ConversationEvent>> {
  return http.get<CursorPage<ConversationEvent>>(`/inbox/conversations/${id}/events`, params);
}

/** URL firmada de un adjunto. */
export function getAttachmentUrl(
  conversationId: string,
  messageId: string,
  attachmentId: string,
): Promise<{ url: string; expires_in_seconds: number }> {
  return http.get(`/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/url`);
}

// --- Fallbacks REST de acciones (el camino primario es el WS) ---

/** 202: el estado final llega por `conversation.message_sent`. */
export function sendMessageRest(conversationId: string, dto: SendMessageDTO): Promise<EnqueuedMessage> {
  return http.post<EnqueuedMessage>(`/conversations/${conversationId}/messages`, dto);
}

export function claimRest(id: string): Promise<ConversationDTO> {
  return http.post<ConversationDTO>(`/inbox/conversations/${id}/claim`);
}

export function takeoverRest(id: string): Promise<ConversationDTO> {
  return http.post<ConversationDTO>(`/inbox/conversations/${id}/takeover`);
}

export function returnToAiRest(id: string, note?: string): Promise<ConversationDTO> {
  return http.post<ConversationDTO>(`/inbox/conversations/${id}/return-to-ai`, note ? { note } : {});
}

export function closeRest(id: string, opts: { resolved?: boolean; reason?: string } = {}): Promise<ConversationDTO> {
  return http.post<ConversationDTO>(`/inbox/conversations/${id}/close`, opts);
}

export function markReadRest(id: string): Promise<void> {
  return http.post<void>(`/inbox/conversations/${id}/mark-read`);
}
