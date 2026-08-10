"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useAlert } from "@/core/providers/alert-provider"
import { errorMessage } from "@/core/lib/error-messages"
import { DetailSheet } from "@/shared/components/features/detail-sheet"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import {
  CHANNEL_KIND_LABELS,
  type ChannelDTO,
} from "@/modules/channels/domain/channel"
import {
  deleteChannel,
  getChannelById,
} from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { ChannelStatusBadge } from "./ChannelStatusBadge"
import { WwebSessionActions } from "./WwebSessionActions"

/**
 * Detalle de canal (panel lateral). Se abre con el CustomEvent
 * `channels:detail:open` (detail: { id }). El estado de conexión se pinta
 * en vivo desde el store (eventos WS `/channels`); las acciones de sesión
 * wweb son 202 → la confirmación llega por WS.
 */
export function ChannelDetailSheet() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | undefined>(undefined)
  const [detail, setDetail] = useState<ChannelDTO | null>(null)
  const { showModal, closeModal, showAlert } = useAlert()
  // Selectores estables: los `set` frecuentes del WS (QR/status) solo
  // re-renderizan si cambia lo que el sheet consume, no todo el store.
  const channels = useChannelStore((s) => s.channels)
  const pairingByChannel = useChannelStore((s) => s.pairingByChannel)
  const fetchChannels = useChannelStore((s) => s.fetchChannels)

  // El estado en vivo del store manda sobre el snapshot del fetch.
  const live = channels.find((c) => c.id === id)
  const channel = live ?? detail
  const pairing = id ? pairingByChannel[id] : undefined

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

  const confirmDelete = () => {
    if (!channel) return
    showModal({
      title: "Eliminar canal",
      description: `¿Seguro que deseas eliminar “${channel.name}”? Las conversaciones asociadas dejarán de recibir mensajes.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "channel-delete-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "channel-delete-confirm",
          onClick: async () => {
            try {
              await deleteChannel(channel.id)
              closeModal()
              setOpen(false)
              await fetchChannels()
              showAlert({ tone: "success", title: "Canal eliminado", open: true, autoCloseMs: 3500 })
            } catch (err) {
              showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el canal"), open: true })
            }
          },
        },
      ],
      className: "sm:max-w-md",
    })
  }

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

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <div>{CHANNEL_KIND_LABELS[channel.kind]}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Teléfono</div>
              <div>{channel.display_phone_number ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Nombre verificado</div>
              <div>{channel.verified_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Credenciales</div>
              <div>
                {channel.credentials_configured
                  ? `Configuradas${channel.token_last4 ? ` (…${channel.token_last4})` : ""}`
                  : "Sin configurar"}
              </div>
            </div>
          </div>

          {/* QR y acciones de sesión: la MISMA pieza que usa
              /settings/channels/[id], para que el ciclo de vinculación no viva
              en dos copias que se desincronizan */}
          {channel.kind === "whatsapp_web" && (
            <WwebSessionActions channel={channel} pairing={pairing} />
          )}

          <div className="border-t border-border pt-3">
            <Button size="sm" variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Eliminar canal
            </Button>
          </div>
        </div>
      )}
    </DetailSheet>
  )
}
