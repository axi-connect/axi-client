"use client"

import { cn } from "@/core/lib/utils"
import { Plus } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { FaWhatsapp, FaInstagram, FaFacebookMessenger, FaRobot } from "react-icons/fa"
import {
  CHANNEL_STATUS_LABELS,
  type ChannelDTO,
  type ChannelKind,
} from "@/modules/channels/domain/channel"
// El punto de estado tiene una sola definición, en el slice channels: este mapa
// vivía duplicado carácter a carácter aquí y en el ChannelDetailSheet
import { channelStatusDotClass } from "@/modules/channels/ui/components/ChannelStatusBadge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { GlassGlyph } from "@/shared/components/ui/glyphs"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/shared/components/layout/sidebar/core"

const KIND_ICONS: Record<ChannelKind, React.ComponentType<{ size?: number }>> = {
  whatsapp_cloud: FaWhatsapp,
  whatsapp_web: FaWhatsapp,
  instagram_dm: FaInstagram,
  facebook_messenger: FaFacebookMessenger,
  // Canal sintético del módulo quality: no aparece en el sidebar en la práctica
  simulator: FaRobot,
}

const ChannelsLoadingState = () => (
  <div className="flex flex-col gap-2 w-full" role="status" aria-label="Cargando canales">
    {Array.from({ length: 3 }).map((_, index) => (
      <SidebarMenuSkeleton key={index} showIcon={true} />
    ))}
  </div>
)

const ChannelsEmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div>
    <div className="flex flex-col items-center justify-center gap-2">
      <GlassGlyph kind="connections" tier="sm" />
      <span className="text-muted-foreground">No hay canales disponibles</span>
    </div>
    <Button size="sm" variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={onCreate}>
      <Plus className="size-4" />
      <span>Crear canal</span>
    </Button>
  </div>
)

function ChannelItem({
  channel,
  onOpenDetail,
}: {
  channel: ChannelDTO
  onOpenDetail: (channel: ChannelDTO) => void
}) {
  const Icon = KIND_ICONS[channel.kind]

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="group"
        onClick={() => onOpenDetail(channel)}
        aria-label={`Abrir canal ${channel.name}, estado: ${CHANNEL_STATUS_LABELS[channel.status]}`}
      >
        <Icon size={20} />
        <span className="capitalize flex-1 line-clamp-1">{channel.name.toLowerCase()}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(channelStatusDotClass(channel.status), "size-2 rounded-full transition-colors ring-2 ring-background")}
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent side="right">
            <Badge variant="outline" className="text-xs">{CHANNEL_STATUS_LABELS[channel.status]}</Badge>
          </TooltipContent>
        </Tooltip>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export default function ChannelsList({
  channels,
  loading,
  onCreate,
  onOpenDetail,
}: {
  channels: ChannelDTO[]
  loading: boolean
  onCreate: () => void
  onOpenDetail: (channel: ChannelDTO) => void
}) {
  if (loading) return <ChannelsLoadingState />
  if (channels.length === 0) return <ChannelsEmptyState onCreate={onCreate} />

  return channels.map((channel) => (
    <ChannelItem key={channel.id} channel={channel} onOpenDetail={onOpenDetail} />
  ))
}
