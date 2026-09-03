"use client"

import { API_ERROR_CODES, COMPANY_SUSPENDED_EVENT } from "@/core/api/problem"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"

/**
 * Conecta el namespace `/channels` (solo lectura) y enruta sus eventos al
 * store: cambios de estado de conexión. Montar una vez en el layout del
 * workspace.
 */
export function useChannelsRealtime() {
  const { socket, connected } = useSocket("channels")
  const setChannelStatus = useChannelStore((s) => s.setChannelStatus)

  useSocketEvent(socket, "channel.status_changed", (payload) => {
    setChannelStatus(payload.channel_id, payload.status, payload.phone_number ?? undefined)
  })

  // F15: el AuthProvider (único listener) frena el tiempo real y muestra la
  // pantalla bloqueante. dispatchEvent es síncrono: el halt ocurre antes de
  // que socket.io procese la desconexión forzada que sigue al evento.
  useSocketEvent(socket, "company.suspended", (payload) => {
    // El reason del backend distingue trial vencido de suspensión manual
    const code =
      payload.reason === "trial_expired"
        ? API_ERROR_CODES.trialExpired
        : API_ERROR_CODES.companySuspended
    window.dispatchEvent(new CustomEvent(COMPANY_SUSPENDED_EVENT, { detail: code }))
  })

  return { connected }
}
