import { http } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import type { Conversation } from "@/modules/channels/domain/conversation"

export async function createConversation(payload: {
  company_id: number
  channel_id: string
  external_id: string
  participant_id?: string
  participant_meta?: Record<string, unknown>
  participant_type: import("@/modules/channels/domain/enums").ParticipantType
}): Promise<ApiResponse<Conversation>> {
  return http.post<ApiResponse<Conversation>>("/channels/conversations", payload)
}

export async function getConversation(id: string): Promise<ApiResponse<Conversation>> {
  return http.get<ApiResponse<Conversation>>(`/channels/conversations/${id}`)
}

export async function updateConversation(id: string, payload: Partial<Pick<Conversation, "status" | "assigned_agent_id">> & { participant_meta?: Record<string, unknown> }): Promise<ApiResponse<Conversation>> {
  return http.put<ApiResponse<Conversation>>(`/channels/conversations/${id}`, payload)
}

export async function assignAgent(conversationId: string, agent_id: number): Promise<ApiResponse<Conversation>> {
  return http.put<ApiResponse<Conversation>>(`/channels/conversations/${conversationId}/assign-agent`, { agent_id })
}

export async function unassignAgent(conversationId: string): Promise<ApiResponse<Conversation>> {
  return http.put<ApiResponse<Conversation>>(`/channels/conversations/${conversationId}/unassign-agent`)
}