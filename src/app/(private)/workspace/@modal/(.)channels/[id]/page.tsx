"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ChannelDetailSheet from "@/modules/channels/ui/components/ChannelDetailSheet"
import { useChannelStore } from "@/modules/channels/infrastructure/store/channels.store"

export default function ChannelsInterceptDetailView() {
  const router = useRouter()
  const params = useParams()
  const { channels } = useChannelStore()
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