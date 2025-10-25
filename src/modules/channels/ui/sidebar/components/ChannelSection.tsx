"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AiOutlineMail } from 'react-icons/ai'
import { ChannelType } from "../../../domain/enums"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ChannelWsStatus } from "../../../domain/channel"
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa'
import { useChannels } from "@/modules/channels/infrastructure/store/channels.context"
import { Radio, CircleFadingPlus, QrCode, CircleCheckBig, RefreshCw, Rocket, Loader } from "lucide-react"
import { getChannelQR, type QRCodeResponse } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/shared/components/layout/sidebar/core"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

interface ChannelSectionProps {
  onQrGenerated?: (qrCode: QRCodeResponse) => void
  onQrError?: (error: string) => void
}

export default function ChannelSection({ onQrGenerated, onQrError }: ChannelSectionProps) {
  const router = useRouter()
  const { fetchChannels, channels, loading, isConnected, joinChannel, setChannelState } = useChannels()

  const QRCodeIcon = ({ channelId }: { channelId: string }) => <QrCode onClick={() => handleFetchQrCode(channelId)} className="cursor-pointer hover:text-blue-500" />

  const statusIcons = (channelId: string): Record<ChannelWsStatus, React.ReactNode> => ({
    ready: <Rocket />,
    connecting: <Loader className="animate-spin" />,
    connected: <QRCodeIcon channelId={channelId} />,
    disconnected: <QRCodeIcon channelId={channelId} />,
    authenticated: <CircleCheckBig />,
  })

  const IconChannel: React.FC<{ channel: ChannelType }> = ({ channel }) => {
    const IconChannelComponent: React.ComponentType<{ size: number; color: string }> = (() => {
      switch (channel) {
        case 'WHATSAPP':
          return FaWhatsapp
        case 'EMAIL':
          return AiOutlineMail
        case 'INSTAGRAM':
          return FaInstagram
        case 'MESSENGER':
          return FaFacebookMessenger
      }
    })()!

    return <IconChannelComponent size={20} color="currentColor" />
  }
  
  const channelStatusColor = (status: ChannelWsStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'disconnected':
        return 'bg-red-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'authenticated':
        return 'bg-blue-500'
      case 'ready':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const ChannelStatusIcon = ({ status, channelId }: { status: ChannelWsStatus; channelId: string }) => useMemo(() => statusIcons(channelId)[status], [status, channelId])

  const handleFetchQrCode = async (channelId: string) => {
    console.log("🔐 fetching qr code for channel:", channelId)

    try {
      setChannelState(channelId, { status: "connecting" })
      const response = await getChannelQR(channelId)
      if (response.successful && response.data) {
        onQrGenerated?.(response.data)
        console.log("✅ QR code fetched successfully")
      } else {
        const errorMessage = response.message || "Error al obtener el código QR"
        onQrError?.(errorMessage)
        console.error("❌ QR fetch failed:", errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      onQrError?.(errorMessage)
      console.error("❌ QR fetch error:", errorMessage)
    }
  }

  useEffect(() => {
    console.log("🔐 WebSocket connected:", isConnected)
    if (!isConnected) return

    channels.forEach((channel) => {
      if (!channel.state?.status) {
        console.log("🔐 Joining channel:", channel.id)
        joinChannel(channel.id)
      }
    })
  }, [isConnected, channels, joinChannel])

  useEffect(() => void fetchChannels() , [fetchChannels])

  return (
    <SidebarGroup className="gap-2">
      <SidebarGroupLabel asChild>
        <div className="flex items-center">
          <Radio />
          <span className="ml-2">Canales</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              title="Agregar canal nuevo"
              onClick={() => router.push("/channels/create")}
            >
              <CircleFadingPlus />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Refrescar canales"
              onClick={() => fetchChannels()}
            >
              <RefreshCw />
            </Button>
          </div>
        </div>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {!loading ? (
            channels.map((channel) => (
              <SidebarMenuItem key={channel.id}>
                <SidebarMenuButton onClick={() => router.push(`/channels/${channel.id}`)}>
                  <IconChannel channel={channel.type as ChannelType} />
                  <span className="capitalize">{channel.name.toLowerCase()}</span>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={
                        cn(
                          channelStatusColor(channel.state?.status ?? 'disconnected'),
                          'size-2 rounded-full'
                        )
                      }/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Badge variant="outline" className="text-xs">
                        {channel.state?.status || 'disconnected'}
                      </Badge>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuButton>

                <SidebarMenuAction>
                  <ChannelStatusIcon
                    status={channel.state?.status ?? 'disconnected'}
                    channelId={channel.id}
                  />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {Array.from({ length: 3 }).map((_, index) => (
                <SidebarMenuSkeleton key={index} showIcon={true} />
              ))}
            </div>
          )}
        </SidebarMenu>

      </SidebarGroupContent>
    </SidebarGroup>
  )
}