

import { cn } from "@/core/lib/utils"
import { PackageOpen, Plus } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { type Channel } from "../../../../domain/channel"
import { IconChannel } from "./utils/channel-section.utils"
import { ChannelWsStatus } from "../../../../domain/channel"
import { ChannelStatusIcon } from "./utils/channel-section.utils"
import { channelStatusColor } from "./utils/channel-section.utils"
import { ChannelItemProps, ChannelsListProps } from "./types/channel-section.types"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/shared/components/layout/sidebar/core"

// ==========================================
// COMPONENTES AUXILIARES (SoD)
// ==========================================

/**
 * Componente para mostrar el estado de carga
*/
const ChannelsLoadingState = () => (
  <div className="flex flex-col gap-2 w-full" role="status" aria-label="Cargando canales">
    {Array.from({ length: 3 }).map((_, index) => (
      <SidebarMenuSkeleton key={index} showIcon={true} />
    ))}
  </div>
);
  
/**
 * Componente para mostrar estado vacío
*/
const ChannelsEmptyState = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <div>
    <div className="flex flex-col items-center justify-center gap-2">
      <PackageOpen className="size-7 text-brand-2 opacity-50" />
      <span className="text-muted-foreground">No hay canales disponibles</span>
    </div>
    <Button 
      size="sm"
      variant="ghost" 
      className="w-full mt-2 text-muted-foreground"
      onClick={() => onNavigate("/channels/create")}
    >
      <Plus className="size-4" />
      <span>Crear canal</span>
    </Button>
  </div>
);

/**
 * Badge con tooltip para el estado del canal
*/
const ChannelStatusBadge = ({ status }: { status: ChannelWsStatus }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span 
        className={cn(
          channelStatusColor(status),
          'size-2 rounded-full transition-colors',
          'ring-2 ring-background'
        )}
        aria-hidden="true"
      />
    </TooltipTrigger>
    <TooltipContent side="right">
      <Badge variant="outline" className="text-xs capitalize">
        {status}
      </Badge>
    </TooltipContent>
  </Tooltip>
);

/**
 * Componente individual de canal
 * Responsabilidad única: renderizar un canal
*/
const ChannelItem = ({ channel, onQrCodeClick, onNavigate }: ChannelItemProps) => {
  const status = channel.state?.status ?? 'disconnected';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        className="group"
        onClick={() => onNavigate(`/channels/${channel.id}`)}
        aria-label={`Abrir canal ${channel.name}, estado: ${status}`}
      >
        <IconChannel channel={channel.type} />
        <span className="capitalize flex-1">{channel.name.toLowerCase()}</span>
        
        <ChannelStatusBadge status={status} />
      </SidebarMenuButton>

      <SidebarMenuAction>
        <ChannelStatusIcon
          status={status}
          channelId={channel.id}
          onQrCodeClick={onQrCodeClick}
        />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
/**
 * Lista de canales con manejo completo de estados
 * 
 * Estados manejados:
 * - loading: Muestra skeletons
 * - error: Muestra mensaje de error
 * - empty: Muestra estado vacío
 * - success: Renderiza la lista
*/
export default function ChannelsList({ channels, loading, error, onQrCodeClick, onNavigate }: ChannelsListProps) {
  // Pattern: Early returns para manejo de estados
  // Ventaja: Código más plano, fácil de seguir y mantener
  
  if (loading) return <ChannelsLoadingState />
  // if (error) return <ChannelsErrorState error={error} />
  if (channels.length === 0) return <ChannelsEmptyState onNavigate={onNavigate} />

  // Estado exitoso: renderizar lista
  return channels.map((channel: Channel) => (
    <ChannelItem key={channel.id} channel={channel} onQrCodeClick={onQrCodeClick} onNavigate={onNavigate} />
  ))
};