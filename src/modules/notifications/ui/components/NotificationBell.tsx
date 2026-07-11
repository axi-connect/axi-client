"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Bell } from "lucide-react"
import { spring } from "@/core/styles/motion"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { useNotificationsRealtime } from "@/modules/notifications/infrastructure/hooks/use-notifications-realtime"
import { useNotificationsStore } from "@/modules/notifications/infrastructure/stores/notifications.store"
import { NotificationPanel } from "./NotificationPanel"
import { NotificationToaster } from "./NotificationToaster"

/**
 * Campana de notificaciones del header privado. Es el punto de montaje de
 * todo el módulo: conecta el realtime, hace el bootstrap del badge y
 * renderiza el toaster — integrar el slice = montar este componente.
 */
export function NotificationBell() {
  useNotificationsRealtime()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const [open, setOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  // Bootstrap: mute persistido + página 1 (trae `unread_count` real para el
  // badge sin necesidad de abrir el panel).
  useEffect(() => {
    const store = useNotificationsStore.getState()
    store.hydrateMute()
    if (!store.tabs.all.initialized && !store.tabs.all.loading) {
      void store.fetchPage("all", 1)
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      // Datos frescos al abrir (si el bootstrap ya corrió).
      const store = useNotificationsStore.getState()
      if (store.tabs.all.initialized && !store.tabs.all.loading) void store.refresh()
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unreadCount > 0 ? `Notificaciones: ${unreadCount} sin leer` : "Notificaciones"
            }
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={reducedMotion ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={spring.snappy}
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,400px)] rounded-xl p-0">
          <NotificationPanel onNavigate={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      <NotificationToaster />
    </>
  )
}
