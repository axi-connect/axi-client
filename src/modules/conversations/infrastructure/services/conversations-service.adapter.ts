import { http, Params } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import type { ConversationDto } from "@/modules/conversations/domain/conversation"
import type { ConversationSearchCriteria } from "@/modules/conversations/domain/conversation"

export async function createConversation(payload: {
  company_id: number
  channel_id: string
  external_id: string
  contact_id?: string
  contact_meta?: Record<string, unknown>
  contact_type: import("@/modules/channels/domain/enums").ContactType
}): Promise<ApiResponse<ConversationDto>> {
  return http.post<ApiResponse<ConversationDto>>("/channels/conversations", payload)
}

export async function getConversation(id: string): Promise<ApiResponse<ConversationDto>> {
  return http.get<ApiResponse<ConversationDto>>(`/channels/conversations/${id}`)
}

export async function getConversations(params: ConversationSearchCriteria): Promise<ApiResponse<ConversationDto[]>> {
  return http.get<ApiResponse<ConversationDto[]>>("/channels/conversations", params as Params, { authenticate: true })
}

export async function updateConversation(id: string, payload: Partial<Pick<ConversationDto, "status" | "assigned_agent">> & { participant_meta?: Record<string, unknown> }): Promise<ApiResponse<ConversationDto>> {
  return http.put<ApiResponse<ConversationDto>>(`/channels/conversations/${id}`, payload)
}

export async function assignAgent(conversationId: string, agent_id: number): Promise<ApiResponse<ConversationDto>> {
  return http.put<ApiResponse<ConversationDto>>(`/channels/conversations/${conversationId}/assign-agent`, { agent_id })
}

export async function unassignAgent(conversationId: string): Promise<ApiResponse<ConversationDto>> {
  return http.put<ApiResponse<ConversationDto>>(`/channels/conversations/${conversationId}/unassign-agent`)
}