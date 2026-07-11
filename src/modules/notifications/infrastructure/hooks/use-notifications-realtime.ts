"use client"

import { useEffect, useRef } from "react"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import { playNotificationSound } from "@/modules/notifications/infrastructure/lib/notification-sound"
import { useNotificationsStore } from "@/modules/notifications/infrastructure/stores/notifications.store"

/**
 * Conecta el namespace `/inbox` y enruta `notification.created` al store.
 * Se monta una sola vez dentro de `NotificationBell` (el header privado es
 * global a todo el panel); si el header dejara de serlo, mover este hook a
 * un bridge client en `(private)/layout.tsx`.
 *
 * Convive con `useInboxSocket`: `useSocket` ref-cuenta consumidores por
 * namespace y comparte el mismo socket.
 */
export function useNotificationsRealtime() {
  const { socket, connected } = useSocket("inbox")

  useSocketEvent(socket, "notification.created", (payload) => {
    const store = useNotificationsStore.getState()
    const isNew = store.onNotificationCreated(payload)
    if (isNew && !store.muted) playNotificationSound()
  })

  // Durante una caída pueden perderse eventos: al reconectar se re-sincroniza
  // badge y página 1. El guard salta el primer connect (el bootstrap del Bell
  // ya hace ese fetch).
  const wasConnected = useRef(false)
  useEffect(() => {
    if (connected && wasConnected.current) {
      void useNotificationsStore.getState().refresh()
    }
    if (connected) wasConnected.current = true
  }, [connected])

  return { connected }
}
