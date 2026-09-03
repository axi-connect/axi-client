import { create } from "zustand"
import { errorMessage } from "@/core/lib/error-messages"
import { listChannels } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import type { ChannelDTO, ChannelStatus } from "@/modules/channels/domain/channel"

/**
 * Último cambio de estado que llegó por WS para un canal, con su hora. Es la
 * memoria que hace posible fusionar un snapshot REST con los eventos que
 * llegaron mientras ese snapshot viajaba.
 */
type StatusEvent = {
  status: ChannelStatus
  phone_number?: string | null
  at: number
}

/**
 * Store del slice channels. Los canales vienen de REST; el estado de conexión
 * se actualiza en vivo desde el namespace WS `/channels` (via
 * use-channels-realtime).
 *
 * **Fusión, no reemplazo.** `fetchChannels` reemplazaba la lista entera y
 * `setChannelStatus` descartaba en silencio los eventos de canales que aún no
 * estaban en ella. Dos ventanas reales: la carga inicial (la vista monta el WS
 * y dispara el GET a la vez, y todo evento que llega antes de que resuelva el
 * GET se perdía), y «Actualizar» (una respuesta que puede ser anterior al último
 * evento aplicado pisaba ese evento). En ambas, un canal que Meta acababa de
 * revocar podía volver a pintarse conectado.
 *
 * La regla: un evento posterior al INICIO del fetch gana sobre el snapshot. Un
 * evento anterior ya viene reflejado en él (o es más viejo que él), y se
 * descarta. Ante la duda —evento en la ventana del fetch— gana el evento: que un
 * canal caído se pinte conectado es peor que lo contrario.
 */
type ChannelStore = {
  loading: boolean
  channels: ChannelDTO[]
  error: string | null
  /** Último evento por canal; ver `StatusEvent`. */
  statusEvents: Record<string, StatusEvent>

  fetchChannels: () => Promise<void>
  /** Inserta o reemplaza un canal sin volver a pedir la lista completa. */
  upsertChannel: (channel: ChannelDTO) => void
  /** Lo quita del store tras un DELETE, para no esperar al refetch. */
  removeChannel: (channelId: string) => void
  setChannelStatus: (channelId: string, status: ChannelStatus, phoneNumber?: string | null) => void
}

function applyEvent(channel: ChannelDTO, event: StatusEvent): ChannelDTO {
  return {
    ...channel,
    status: event.status,
    ...(event.phone_number !== undefined ? { display_phone_number: event.phone_number } : {}),
  }
}

export const useChannelStore = create<ChannelStore>((set) => ({
  error: null,
  channels: [],
  loading: true,
  statusEvents: {},

  fetchChannels: async () => {
    const startedAt = Date.now()
    set({ loading: true, error: null })
    try {
      const res = await listChannels()
      set((state) => {
        const channels = res.data.map((channel) => {
          const event = state.statusEvents[channel.id]
          return event !== undefined && event.at >= startedAt ? applyEvent(channel, event) : channel
        })
        // Lo anterior al fetch ya está en el snapshot: no hace falta recordarlo
        const statusEvents = Object.fromEntries(
          Object.entries(state.statusEvents).filter(([, event]) => event.at >= startedAt),
        )
        return { channels, statusEvents }
      })
    } catch (err) {
      // El error se muestra; la lista que ya había NO se toca (ver ChannelsView)
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
    set((state) => {
      const statusEvents = { ...state.statusEvents }
      delete statusEvents[channelId]
      return { channels: state.channels.filter((item) => item.id !== channelId), statusEvents }
    })
  },

  setChannelStatus: (channelId, status, phoneNumber) => {
    const event: StatusEvent = { status, phone_number: phoneNumber, at: Date.now() }
    set((state) => ({
      // Se recuerda SIEMPRE, esté o no el canal en la lista: si no está, es que
      // el fetch todavía no resolvió, y el evento tiene que sobrevivirle
      statusEvents: { ...state.statusEvents, [channelId]: event },
      channels: state.channels.map((channel) =>
        channel.id === channelId ? applyEvent(channel, event) : channel,
      ),
    }))
  },
}))
