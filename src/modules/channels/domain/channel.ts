import type { ChannelProvider, ChannelType } from "./enums"

export type ChannelWsStatus = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticated"
  | "ready"
export interface ChannelWsState {
  hasJoined: boolean
  status: ChannelWsStatus
  metadata?: Record<string, unknown>
}

export type Channel = {
  id: string
  name: string
  type: ChannelType
  state?: ChannelWsState
  provider: ChannelProvider
  is_active: boolean
  provider_account: string
  default_agent_id: number | null
  company_id: number
  config?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export type ListChannelsParams = {
  name?: string
  type?: ChannelType
  provider?: ChannelProvider
  is_active?: boolean
  limit?: number
  offset?: number
  sortBy?: "created_at" | "updated_at" | "name"
  sortDir?: "asc" | "desc"
}

export type ChannelsListResponse = {
  channels: Channel[]
  total: number
  limit: number
  offset: number
}