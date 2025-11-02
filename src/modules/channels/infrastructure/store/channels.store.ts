import { create } from 'zustand'
import type { ApiResponse } from "@/core/services/api"
import { listChannels } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import type { Channel, ChannelsListResponse, ChannelWsState, ListChannelsParams } from "@/modules/channels/domain/channel"

type ChannelStore = {
  loading: boolean
  channels: Channel[]
  error: Error | null
  fetchChannels: (params?: ListChannelsParams) => Promise<void>
  setChannelState: (channelId: string, update: Partial<ChannelWsState>) => void
}

export const useChannelStore = create<ChannelStore>((set) => ({
  error: null,
  channels: [],
  loading: true,
  
  fetchChannels: async (params?: ListChannelsParams) => {
    set({ loading: true, error: null })
    try {
      const res: ApiResponse<ChannelsListResponse> = await listChannels(params ?? {})
      const list = res.data?.channels ?? []
      set({ channels: list })
    } catch (e) {
      set({ error: e instanceof Error ? e : new Error("Error desconocido") })
    } finally {
      set({ loading: false })
    }
  },
  
  setChannelState: (channelId: string, update: Partial<ChannelWsState>) => {
    set((state) => ({
      channels: state.channels.map((channel) => {
        if (channel.id === channelId) {
          return {
            ...channel,
            state: channel.state ? { ...channel.state, ...update } : update as ChannelWsState
          }
        }
        return channel
      })
    }))
  },
}))