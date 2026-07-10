import { create } from "zustand"
import { errorMessage } from "@/core/lib/error-messages"
import { listChannels } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import type {
  ChannelDTO,
  ChannelStatus,
  WwebPairingState,
} from "@/modules/channels/domain/channel"

/**
 * Store del slice channels. Los canales vienen de REST; el estado de
 * conexión y el pairing de WhatsApp Web se actualizan en vivo desde el
 * namespace WS `/channels` (via use-channels-realtime).
 */
type ChannelStore = {
  loading: boolean
  channels: ChannelDTO[]
  error: string | null
  /** Estado efímero de pairing por canal (QR/pairing code), alimentado por WS. */
  pairingByChannel: Record<string, WwebPairingState>

  fetchChannels: () => Promise<void>
  setChannelStatus: (channelId: string, status: ChannelStatus, phoneNumber?: string | null) => void
  setPairingState: (channelId: string, state: Partial<WwebPairingState>) => void
  clearPairingState: (channelId: string) => void
}

export const useChannelStore = create<ChannelStore>((set) => ({
  error: null,
  channels: [],
  loading: true,
  pairingByChannel: {},

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
      // El status del pairing sigue al del canal.
      pairingByChannel: state.pairingByChannel[channelId]
        ? {
            ...state.pairingByChannel,
            [channelId]: { ...state.pairingByChannel[channelId], status },
          }
        : state.pairingByChannel,
    }))
  },

  setPairingState: (channelId, update) => {
    set((state) => {
      const current: WwebPairingState = state.pairingByChannel[channelId] ?? {
        status: "connecting",
        qr: null,
        qr_image: null,
        pairing_code: null,
        phone_number: null,
      }
      return {
        pairingByChannel: {
          ...state.pairingByChannel,
          [channelId]: { ...current, ...update },
        },
      }
    })
  },

  clearPairingState: (channelId) => {
    set((state) => {
      const next = { ...state.pairingByChannel }
      delete next[channelId]
      return { pairingByChannel: next }
    })
  },
}))
