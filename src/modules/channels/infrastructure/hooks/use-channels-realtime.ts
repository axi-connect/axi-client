"use client"

import { COMPANY_SUSPENDED_EVENT } from "@/core/api/problem"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"

/**
 * Conecta el namespace `/channels` (solo lectura) y enruta sus eventos al
 * store: QR/pairing de WhatsApp Web y cambios de estado de conexión.
 * Montar una vez en el layout del workspace.
 */
export function useChannelsRealtime() {
  const { socket, connected } = useSocket("channels")
  const setChannelStatus = useChannelStore((s) => s.setChannelStatus)
  const setPairingState = useChannelStore((s) => s.setPairingState)

  useSocketEvent(socket, "channel.qr_code", (payload) => {
    setPairingState(payload.channel_id, {
      qr: payload.qr,
      qr_image: payload.qr_image,
      pairing_code: payload.pairing_code,
    })
  })

  useSocketEvent(socket, "channel.status_changed", (payload) => {
    setChannelStatus(payload.channel_id, payload.status, payload.phone_number ?? undefined)
  })

  useSocketEvent(socket, "channel.session_failed", (payload) => {
    setChannelStatus(payload.channel_id, "error")
    setPairingState(payload.channel_id, { status: "error" })
  })

  // F15: el AuthProvider (único listener) frena el tiempo real y muestra la
  // pantalla bloqueante. dispatchEvent es síncrono: el halt ocurre antes de
  // que socket.io procese la desconexión forzada que sigue al evento.
  useSocketEvent(socket, "company.suspended", () => {
    window.dispatchEvent(new Event(COMPANY_SUSPENDED_EVENT))
  })

  return { connected }
}
