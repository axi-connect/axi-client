"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"
import ChannelDetailSheet from "@/modules/channels/ui/components/ChannelDetailSheet"
import { useChannels } from "@/modules/channels/infrastructure/store/channels.context"

export default function ChannelsInterceptDetailView() {
  const router = useRouter()
  const params = useParams()
  const { channels } = useChannels()
  const channelId = params.id as string

  useEffect(() => {
    if (!channelId || !channels.length) return

    const channel = channels.find(c => c.id === channelId)
    if (channel) {
      // Disparar evento para abrir el detail sheet
      window.dispatchEvent(new CustomEvent("channels:detail:open", {
        detail: { defaults: channel }
      }))
    }
  }, [channelId, channels])

  // Cerrar automáticamente cuando no hay channelId
  useEffect(() => {
    if (!channelId) {
      router.back()
    }
  }, [channelId, router])

  return <ChannelDetailSheet />
}