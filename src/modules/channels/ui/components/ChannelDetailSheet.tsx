"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowUpRight, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { DetailSheet } from "@/shared/components/features/detail-sheet"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import { useDeleteChannel } from "@/modules/channels/infrastructure/hooks/use-delete-channel"
import { type ChannelDTO } from "@/modules/channels/domain/channel"
import { getChannelById } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { ChannelHealthCard } from "./ChannelHealthCard"
import { ChannelStatusBadge } from "./ChannelStatusBadge"

/**
 * Detalle de canal (panel lateral). Se abre con el CustomEvent
 * `channels:detail:open` (detail: { id }). El estado de conexión se pinta
 * en vivo desde el store (eventos WS `/channels`).
 */
export function ChannelDetailSheet() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | undefined>(undefined)
  const [detail, setDetail] = useState<ChannelDTO | null>(null)
  // Selectores estables: los `set` frecuentes del WS solo re-renderizan si
  // cambia lo que el sheet consume, no todo el store.
  const channels = useChannelStore((s) => s.channels)
  // El MISMO borrado que la página de detalle (confirmación, DELETE, store,
  // aviso); aquí, además, se cierra el panel. El store ya quita el canal: no
  // hace falta volver a pedir la lista.
  const { confirmDelete, deleting } = useDeleteChannel({ onDeleted: () => setOpen(false) })

  // El estado en vivo del store manda sobre el snapshot del fetch.
  const live = channels.find((c) => c.id === id)
  const channel = live ?? detail

  useEffect(() => {
    const onOpen = (e: Event) => {
      const { id: channelId } = (e as CustomEvent<{ id: string }>).detail
      setId(channelId)
      setOpen(true)
    }
    window.addEventListener("channels:detail:open", onOpen)
    return () => window.removeEventListener("channels:detail:open", onOpen)
  }, [])

  // Identidad estable: DetailSheet re-fetchea solo por open/id, y esta función
  // no debe recrearse en cada render (getChannelById es import de módulo y
  // setDetail es un setter de useState; ambos estables → deps vacías).
  const fetchDetail = useCallback(async (channelId: string) => {
    const data = await getChannelById(channelId)
    setDetail(data)
    return data
  }, [])

  return (
    <DetailSheet
      id={id}
      open={open}
      onOpenChange={setOpen}
      title="Detalle del canal"
      fetchDetail={fetchDetail}
      skeleton={<div className="animate-pulse h-40 bg-secondary rounded-lg" />}
    >
      {channel && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{channel.name}</h1>
            <ChannelStatusBadge status={channel.status} className="ml-auto" />
          </div>

          {/* El bloque de datos estaba escrito a mano aquí: cada campo nuevo
              había que añadirlo también en la página de detalle, y el primero en
              olvidarse mostraba menos información sin que nadie se enterara */}
          <ChannelHealthCard channel={channel} compact />

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {/* Renovar la conexión abre un Modal, y en este proyecto un Modal NO
                puede apilarse sobre un DetailSheet: por eso esa acción vive en la
                página de detalle y aquí solo hay un enlace hacia ella. No es un
                olvido. */}
            <Button asChild size="sm" variant="outline">
              <Link href={`/settings/channels/${channel.id}`}>
                Ver todo el detalle <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" variant="destructive" disabled={deleting} onClick={() => confirmDelete(channel)}>
              <Trash2 className="h-4 w-4" /> Eliminar canal
            </Button>
          </div>
        </div>
      )}
    </DetailSheet>
  )
}
