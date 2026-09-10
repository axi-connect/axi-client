import { listChannels, type ChannelDTO } from "@/modules/channels/public"

/**
 * Canales del tenant para las opciones del filtro. Cache de PROMESA a nivel de
 * módulo (mismo patrón que `getTenantUsers` en crm): varios consumidores
 * comparten la petición en vuelo y un fallo no se cachea. Se excluye el canal
 * `simulator` (QA): sus conversaciones no existen para el inbox.
 */
let channelsPromise: Promise<ChannelDTO[]> | null = null

export function getInboxChannels(): Promise<ChannelDTO[]> {
  if (channelsPromise === null) {
    channelsPromise = listChannels()
      .then((res) => res.data.filter((channel) => channel.kind !== "simulator"))
      .catch((error: unknown) => {
        channelsPromise = null
        throw error
      })
  }
  return channelsPromise
}

/** Solo tests. */
export function clearInboxChannelsCache(): void {
  channelsPromise = null
}
