"use client"

import { Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/shared/components/ui/badge"
import { parseHttpError } from "@/core/services/api"
import { Button } from "@/shared/components/ui/button"
import { useAlert } from "@/core/providers/alert-provider"
import type { Channel } from "@/modules/channels/domain/channel"
import { DetailSheet } from "@/shared/components/features/detail-sheet"
import { useChannels } from "../../infrastructure/store/channels.context"
import { deleteChannel } from "../../infrastructure/services/channels-service.adapter"

/**
 * ChannelDetailSheet
 *
 * Listens to the custom event "channels:detail:open" with payload { defaults: Channel }
 * and renders a responsive DetailSheet with channel detail view.
 *
 * Optimizations:
 * - Uses DetailSheet's fetchDetail for deferred loading with built-in skeleton handling
 * - Minimal state (channel + fetched detail)
*/
export function ChannelDetailSheet() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const { fetchChannels } = useChannels()
    const { showModal, closeModal, showAlert } = useAlert()
    const [channel, setChannel] = useState<Channel | null>(null)

    useEffect(() => {
        const onOpen = (e: Event) => {
            const detail = (e as CustomEvent).detail as { defaults: Channel }
            setChannel(detail.defaults)
            console.log(channel)
            setOpen(true)
        }
        window.addEventListener("channels:detail:open", onOpen)
        return () => window.removeEventListener("channels:detail:open", onOpen)
    }, [channel])

    const getStatusBadge = (isActive: boolean) => (
        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
        {isActive ? "Activo" : "Inactivo"}
        </Badge>
    )

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
        WHATSAPP: "WhatsApp",
        EMAIL: "Email",
        TELEGRAM: "Telegram",
        INSTAGRAM: "Instagram",
        MESSENGER: "Messenger",
        CALL: "Llamada",
        }
        return labels[type] || type
    }

    const getProviderLabel = (provider: string) => {
        const labels: Record<string, string> = {
        META: "Meta",
        TWILIO: "Twilio",
        CUSTOM: "Custom",
        DEFAULT: "Default",
        }
        return labels[provider] || provider
    }

    const handleClose = () => {
        setOpen(false)
        setChannel(null)
        router.back()
    }

    const onOpenChange = (open: boolean) => {
        setOpen(open)
        if (!open) handleClose()
    }

    const onDeleteChannel = () => {
        handleClose()
        showModal({
            title: "Eliminar canal",
            description: `¿Seguro que deseas eliminar el canal “${channel?.name}”?`,
            actions: [
                { label: "Cancelar", variant: "outline", asClose: true, id: "channels-delete-cancel" },
                { label: "Eliminar", variant: "destructive", asClose: false, onClick: () => handleDeleteChannel(), id: "channels-delete-confirm" },
            ],
            className: "sm:max-w-md z-[70]",
        })
    }

    const handleDeleteChannel = async () => {
        try{
            if (!channel?.id) throw new Error("ID de canal no encontrado")
            const res = await deleteChannel(channel.id)
            if (res.successful) {
                fetchChannels()
                showAlert({ tone: "success", title: res.message || "Canal eliminado correctamente", open: true })
            }
        } catch (error) {
            const { message, status } = parseHttpError(error)
            showAlert({ tone: "error", title: message || "No se pudo eliminar el canal", description: status ? `Código: ${status}` : undefined })
        }
        finally {
            closeModal()
        }
    }

    return (
        <DetailSheet
            open={open}
            zIndex={49}
            id={channel?.id}
            title="Detalle del Canal"
            onOpenChange={onOpenChange}
            subtitle={channel ? `${channel.name} • ${getTypeLabel(channel.type)}` : undefined}
            skeleton={<div className="animate-pulse space-y-4"><div className="h-4 bg-secondary rounded"></div><div className="h-4 bg-secondary rounded w-3/4"></div><div className="h-8 bg-secondary rounded"></div></div>}
        >
        {channel && (
            <div className="space-y-6">
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{channel.name}</h3>
                {getStatusBadge(channel.is_active)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <div className="font-medium">{getTypeLabel(channel.type)}</div>
                </div>
                <div>
                    <span className="text-muted-foreground">Proveedor:</span>
                    <div className="font-medium">{getProviderLabel(channel.provider)}</div>
                </div>
                <div className="col-span-2">
                    <span className="text-muted-foreground">Cuenta:</span>
                    <div className="font-medium font-mono text-xs bg-muted px-2 py-1 rounded">
                    {channel.provider_account}
                    </div>
                </div>
                </div>
            </section>

            {/* ELIMINAR CANAL */}
            <Button variant="destructive" onClick={() => onDeleteChannel()}>
                <Trash2 className="size-4" />
                Eliminar Canal
            </Button>

            <section className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Información Técnica</h4>
                <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{channel.id}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Empresa:</span>
                    <span>{channel.company_id}</span>
                </div>
                {channel.default_agent_id && (
                    <div className="flex justify-between">
                    <span className="text-muted-foreground">Agente por defecto:</span>
                    <span>{channel.default_agent_id}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Creado:</span>
                    <span className="text-xs">{new Date(channel.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Actualizado:</span>
                    <span className="text-xs">{new Date(channel.updated_at).toLocaleDateString()}</span>
                </div>
                </div>
            </section>

            {channel.config && Object.keys(channel.config).length > 0 && (
                <section className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Configuración</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(channel.config, null, 2)}
                </pre>
                </section>
            )}
            </div>
        )}
        </DetailSheet>
    )
}

export default ChannelDetailSheet
