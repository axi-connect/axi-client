import { create } from "zustand"
import { errorMessage } from "@/core/lib/error-messages"
import { listChannels } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import type { ChannelDTO, ChannelStatus } from "@/modules/channels/domain/channel"

/**
 * Store del slice channels. Los canales vienen de REST; el estado de
 * conexión se actualiza en vivo desde el namespace WS `/channels` (via
 * use-channels-realtime).
 */
type ChannelStore = {
  loading: boolean
  channels: ChannelDTO[]
  error: string | null

  fetchChannels: () => Promise<void>
  /** Inserta o reemplaza un canal sin volver a pedir la lista completa. */
  upsertChannel: (channel: ChannelDTO) => void
  /** Lo quita del store tras un DELETE, para no esperar al refetch. */
  removeChannel: (channelId: string) => void
  setChannelStatus: (channelId: string, status: ChannelStatus, phoneNumber?: string | null) => void
}

export const useChannelStore = create<ChannelStore>((set) => ({
  error: null,
  channels: [],
  loading: true,

  fetchChannels: async () => {
    set({ loading: true, error: null })
    try {
      const res = await listChannels()
      set({ channels: res.data })
    } catch (err) {
      set({ error: errorMessage(err, "No se pudieron cargar los canales") })
    } finally {
      set({ loading: false })
    }
  },

  upsertChannel: (channel) => {
    set((state) => {
      const index = state.channels.findIndex((item) => item.id === channel.id)
      if (index === -1) return { channels: [...state.channels, channel] }
      const channels = [...state.channels]
      channels[index] = channel
      return { channels }
    })
  },

  removeChannel: (channelId) => {
    set((state) => ({ channels: state.channels.filter((item) => item.id !== channelId) }))
  },

  setChannelStatus: (channelId, status, phoneNumber) => {
    set((state) => ({
      channels: state.channels.map((channel) =>
        channel.id === channelId
          ? {
              ...channel,
              status,
              ...(phoneNumber !== undefined ? { display_phone_number: phoneNumber } : {}),
            }
          : channel,
      ),
    }))
  },
}))
