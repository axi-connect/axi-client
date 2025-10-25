import { http, type Params } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import type { Channel, ChannelsListResponse, ListChannelsParams } from "@/modules/channels/domain/channel"

export async function listChannels(params: ListChannelsParams = {}): Promise<ApiResponse<ChannelsListResponse>> {
  return http.get<ApiResponse<ChannelsListResponse>>("/channels", params as Params, {authenticate: true})
}

export async function getChannel(id: string): Promise<ApiResponse<Channel>> {
  return http.get<ApiResponse<Channel>>(`/channels/${id}`)
}

export type CreateChannelDTO = {
  company_id: number
  provider: import("@/modules/channels/domain/enums").ChannelProvider
  type: import("@/modules/channels/domain/enums").ChannelType
  name: string
  provider_account: string
  credentials?: Record<string, unknown>
  config?: Record<string, unknown>
  default_agent_id?: number
  expires_at?: Date
}

export async function createChannel(payload: CreateChannelDTO): Promise<ApiResponse<Channel>> {
  return http.post<ApiResponse<Channel>>("/channels", payload, { authenticate: true })
}

export type UpdateChannelDTO = Partial<Omit<CreateChannelDTO, "company_id">> & {
  is_active?: boolean
}

export async function updateChannel(id: string, payload: UpdateChannelDTO): Promise<ApiResponse<Channel>> {
  return http.put<ApiResponse<Channel>>(`/channels/${id}`, payload)
}