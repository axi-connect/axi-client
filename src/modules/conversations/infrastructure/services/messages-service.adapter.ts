import { http } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import type { Message } from "@/modules/conversations/domain/message"
import type { MessageStatus } from "@/modules/channels/domain/enums"

export async function sendMessage(payload: {
  from?: string
  to?: string
  message: string
  payload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  direction: import("@/modules/channels/domain/enums").MessageDirection
  conversation_id: string
  content_type: string
}): Promise<ApiResponse<Message>> {
  return http.post<ApiResponse<Message>>("/channels/messages", payload)
}

export async function getMessage(id: string): Promise<ApiResponse<Message>> {
  return http.get<ApiResponse<Message>>(`/channels/messages/${id}`, undefined, { authenticate: true })
}

export async function updateMessageStatus(id: string, status: MessageStatus): Promise<ApiResponse<Message>> {
  return http.put<ApiResponse<Message>>(`/channels/messages/${id}/status`, { status })
}

export async function getMessagesByConversation(conversationId: string): Promise<ApiResponse<Message[]>> {
  return http.get<ApiResponse<Message[]>>(`/channels/messages/conversations/${conversationId}`, undefined, { authenticate: true })
}