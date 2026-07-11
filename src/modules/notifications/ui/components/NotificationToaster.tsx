"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell, X } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { fade, press, spring } from "@/core/styles/motion"
import { notificationTarget } from "@/modules/notifications/domain/notification-target"
import { useNotificationsStore } from "@/modules/notifications/infrastructure/stores/notifications.store"
import type { NotificationDTO } from "@/modules/notifications/domain/notification"

const AUTO_DISMISS_MS = 6000

/**
 * Stack de toasts de notificación (esquina superior derecha, bajo el header).
 * Cola FIFO alimentada por el store (cap 4); auto-dismiss pausable on hover;
 * clic marca leída y navega si el tipo tiene destino.
 */
export function NotificationToaster() {
  const toasts = useNotificationsStore((s) => s.toasts)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-[60px] z-[9999] flex w-[min(92vw,22rem)] flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((notification) => (
          <ToastCard key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

function ToastCard({ notification }: { notification: NotificationDTO }) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    useNotificationsStore.getState().dismissToast(notification.id)
  }, [notification.id])

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  // Re-armar completo al salir del hover es aceptable y simple.
  const armTimer = useCallback(() => {
    pauseTimer()
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS)
  }, [dismiss, pauseTimer])

  useEffect(() => {
    armTimer()
    return pauseTimer
  }, [armTimer, pauseTimer])

  const target = notificationTarget(notification.type, notification.data)

  const handleClick = () => {
    void useNotificationsStore.getState().markRead(notification.id)
    dismiss()
    if (target) router.push(target)
  }

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={
        reducedMotion
          ? { opacity: 1, transition: fade.fast }
          : { opacity: 1, x: 0, transition: spring.snappy }
      }
      exit={{ opacity: 0, transition: fade.fast }}
      whileTap={target ? press : undefined}
      role="status"
      onMouseEnter={pauseTimer}
      onMouseLeave={armTimer}
      onClick={handleClick}
      className={cn(
        "glass pointer-events-auto relative flex items-start gap-3 rounded-xl p-3 pr-9",
        target && "cursor-pointer",
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-brand"
      >
        <Bell className="size-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block truncate text-sm font-medium">{notification.title}</span>
        {notification.body && (
          <span className="line-clamp-2 block text-xs text-muted-foreground">
            {notification.body}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={(event) => {
          event.stopPropagation()
          dismiss()
        }}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}
