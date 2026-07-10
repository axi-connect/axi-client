"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

/**
 * Deep-link a un canal: dispara la apertura del ChannelDetailSheet (montado
 * en el layout del workspace) y vuelve a la vista anterior.
 */
export default function ChannelsInterceptDetailView() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const channelId = params?.id

  useEffect(() => {
    if (!channelId) return
    window.dispatchEvent(new CustomEvent("channels:detail:open", { detail: { id: channelId } }))
    router.back()
  }, [channelId, router])

  return null
}
