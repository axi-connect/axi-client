"use client"

import ChannelsList from "./ChannelList"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Radio, CircleFadingPlus, RefreshCw} from "lucide-react"
import { ChannelSectionProps } from "./types/channel-section.types"
import { useChannels } from "@/modules/channels/infrastructure/store/channels.context"
import { getChannelQR } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/shared/components/layout/sidebar/core"

export default function ChannelSection({ onQrGenerated, onQrError }: ChannelSectionProps) {
  const router = useRouter()
  const [error, setError] = useState<Error | null>(null)
  const { fetchChannels, channels, loading, isConnected, joinChannel, setChannelState } = useChannels()

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

  const handleNavigate = (path: string) => {
    router.push(path)
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
              onClick={() => handleNavigate("/workspace/channels/create")}
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
          <ChannelsList
            error={error} 
            loading={loading}
            channels={channels}
            onNavigate={handleNavigate}
            onQrCodeClick={handleFetchQrCode}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}