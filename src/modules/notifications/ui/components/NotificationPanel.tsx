"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BellOff, CheckCheck, Inbox, LoaderCircle, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { notificationTarget } from "@/modules/notifications/domain/notification-target"
import {
  useNotificationsStore,
  type NotificationsTab,
} from "@/modules/notifications/infrastructure/stores/notifications.store"
import type { NotificationDTO } from "@/modules/notifications/domain/notification"
import { NotificationItem } from "./NotificationItem"

type NotificationPanelProps = {
  /** Cierra el popover cuando un clic navega a otra vista. */
  onNavigate: () => void
}

export function NotificationPanel({ onNavigate }: NotificationPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<NotificationsTab>("all")
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const muted = useNotificationsStore((s) => s.muted)

  // La tab "No leídas" se inicializa perezosamente la primera vez que se abre.
  useEffect(() => {
    const store = useNotificationsStore.getState()
    const state = store.tabs[tab]
    if (!state.initialized && !state.loading) void store.fetchPage(tab, 1)
  }, [tab])

  const handleSelect = (notification: NotificationDTO) => {
    void useNotificationsStore.getState().markRead(notification.id)
    const target = notificationTarget(notification.type, notification.data)
    if (target) {
      router.push(target)
      onNavigate()
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 py-2 pl-4 pr-2">
        <h2 className="text-base font-semibold">Notificaciones</h2>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
            title={muted ? "Activar sonido" : "Silenciar sonido"}
            onClick={() => useNotificationsStore.getState().toggleMute()}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={unreadCount === 0}
            onClick={() => void useNotificationsStore.getState().markAllRead()}
          >
            <CheckCheck />
            Marcar todas
          </Button>
        </div>
      </div>
      <Separator />
      <Tabs value={tab} onValueChange={(value) => setTab(value as NotificationsTab)} className="gap-0">
        <div className="px-3 pt-2 pb-1">
          {/* `w-full` + `flex-1`: en un panel de 320px las dos pestañas se
              reparten el ancho en vez de dejar un hueco a la derecha. */}
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Todas
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              No leídas{unreadCount > 0 ? ` (${unreadCount > 99 ? "99+" : unreadCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all">
          <NotificationList tab="all" onSelect={handleSelect} />
        </TabsContent>
        <TabsContent value="unread">
          <NotificationList tab="unread" onSelect={handleSelect} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type NotificationListProps = {
  tab: NotificationsTab
  onSelect: (notification: NotificationDTO) => void
}

function NotificationList({ tab, onSelect }: NotificationListProps) {
  const state = useNotificationsStore((s) => s.tabs[tab])
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Scroll infinito: el sentinel al final del contenedor dispara loadMore
  // (los guards del store evitan llamadas dobles).
  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void useNotificationsStore.getState().loadMore(tab)
        }
      },
      { root, rootMargin: "80px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [tab, state.initialized])

  if (!state.initialized && state.loading) {
    return (
      <div role="status" aria-label="Cargando notificaciones" className="space-y-3 px-4 py-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-start gap-3">
            <Skeleton className="mt-1.5 size-2 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    )
  }

  if (!state.initialized && state.error) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{state.error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void useNotificationsStore.getState().fetchPage(tab, 1)}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (state.initialized && state.items.length === 0) {
    const Icon = tab === "unread" ? BellOff : Inbox
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Icon aria-hidden className="size-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          {tab === "unread" ? "Estás al día" : "Sin notificaciones"}
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="sidebar-scroll max-h-[min(60vh,480px)] overflow-y-auto">
      <div className="divide-y divide-border/60">
        {state.items.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onSelect={onSelect} />
        ))}
      </div>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {state.loading && (
        <div
          role="status"
          aria-label="Cargando más notificaciones"
          className="flex justify-center py-2"
        >
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
