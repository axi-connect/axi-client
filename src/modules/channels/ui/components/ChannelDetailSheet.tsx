"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Trash2, Power, PowerOff, Unlink, RefreshCw } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { useAlert } from "@/core/providers/alert-provider"
import { errorMessage } from "@/core/lib/error-messages"
import { DetailSheet } from "@/shared/components/features/detail-sheet"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import {
  CHANNEL_KIND_LABELS,
  CHANNEL_STATUS_LABELS,
  type ChannelDTO,
  type ChannelStatus,
} from "@/modules/channels/domain/channel"
import {
  deleteChannel,
  getChannelById,
  logoutWweb,
  startWwebSession,
  stopWwebSession,
} from "@/modules/channels/infrastructure/services/channels-service.adapter"

/**
 * Detalle de canal (panel lateral). Se abre con el CustomEvent
 * `channels:detail:open` (detail: { id }). El estado de conexión se pinta
 * en vivo desde el store (eventos WS `/channels`); las acciones de sesión
 * wweb son 202 → la confirmación llega por WS.
 */
const STATUS_DOT: Record<ChannelStatus, string> = {
  pending_setup: "bg-zinc-400",
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-green-500",
  disconnected: "bg-zinc-400",
  error: "bg-red-500",
}

export function ChannelDetailSheet() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | undefined>(undefined)
  const [detail, setDetail] = useState<ChannelDTO | null>(null)
  const [busy, setBusy] = useState(false)
  const { showModal, closeModal, showAlert } = useAlert()
  const { channels, pairingByChannel, fetchChannels } = useChannelStore()

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

  const runAction = async (action: () => Promise<unknown>, pendingMessage: string) => {
    if (!id || busy) return
    setBusy(true)
    try {
      await action()
      showAlert({ tone: "success", title: pendingMessage, open: true, autoCloseMs: 3500 })
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo completar la acción"), open: true })
    } finally {
      setBusy(false)
    }
  }

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
      fetchDetail={async (channelId: string) => {
        const data = await getChannelById(channelId)
        setDetail(data)
        return data
      }}
      skeleton={<div className="animate-pulse h-40 bg-secondary rounded-lg" />}
    >
      {channel && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", STATUS_DOT[channel.status])} aria-hidden />
            <h1 className="text-xl font-bold">{channel.name}</h1>
            <Badge variant="secondary" className="ml-auto">{CHANNEL_STATUS_LABELS[channel.status]}</Badge>
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

          {/* Pairing en vivo (wweb) */}
          {channel.kind === "whatsapp_web" && pairing?.qr_image && channel.status !== "connected" && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Escanea con WhatsApp</p>
              <Image src={pairing.qr_image} alt="Código QR de vinculación" width={200} height={200} unoptimized />
              {pairing.pairing_code && (
                <p className="text-sm text-muted-foreground">
                  O ingresa el código: <span className="font-mono font-semibold">{pairing.pairing_code}</span>
                </p>
              )}
            </div>
          )}

          {channel.kind === "whatsapp_web" && (
            <div className="flex flex-wrap gap-2">
              {(channel.status === "disconnected" || channel.status === "pending_setup" || channel.status === "error") && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void runAction(() => startWwebSession(channel.id), "Iniciando sesión… el QR llegará en unos segundos")}
                >
                  <Power className="h-4 w-4" /> Conectar
                </Button>
              )}
              {channel.status === "connecting" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void runAction(() => startWwebSession(channel.id), "Reintentando conexión…")}
                >
                  <RefreshCw className="h-4 w-4" /> Reintentar
                </Button>
              )}
              {channel.status === "connected" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void runAction(() => stopWwebSession(channel.id), "Deteniendo sesión (se conserva la vinculación)…")}
                >
                  <PowerOff className="h-4 w-4" /> Detener
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void runAction(() => logoutWweb(channel.id), "Desvinculando dispositivo…")}
              >
                <Unlink className="h-4 w-4" /> Desvincular
              </Button>
            </div>
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
