"use client"

import { useEffect } from "react"
import ChannelsList from "./ChannelList"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Radio, CircleFadingPlus, RefreshCw } from "lucide-react"
import type { ChannelDTO } from "@/modules/channels/domain/channel"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/shared/components/layout/sidebar/core"

/**
 * Sección de canales del sidebar del workspace. El estado de conexión llega
 * en vivo por el namespace WS `/channels` (conectado en el layout); aquí solo
 * se lista, se abre el detalle y se lanza el pairing.
 */
export default function ChannelSection() {
  const router = useRouter()
  const { fetchChannels, channels, loading } = useChannelStore()

  useEffect(() => {
    void fetchChannels()
  }, [fetchChannels])

  const openDetail = (channel: ChannelDTO) => {
    window.dispatchEvent(new CustomEvent("channels:detail:open", { detail: { id: channel.id } }))
  }

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
              title="Conectar un canal nuevo"
              onClick={() => router.push("/settings/channels/connect")}
            >
              <CircleFadingPlus />
            </Button>
            <Button size="sm" variant="ghost" title="Refrescar canales" onClick={() => void fetchChannels()}>
              <RefreshCw />
            </Button>
          </div>
        </div>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          <ChannelsList
            loading={loading}
            channels={channels}
            onOpenDetail={openDetail}
            onCreate={() => router.push("/settings/channels/connect")}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
