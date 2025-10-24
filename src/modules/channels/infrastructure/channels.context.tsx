"use client"

import type { ApiResponse } from "@/core/services/api"
import type { ChannelType } from "@/modules/channels/domain/enums"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { listChannels } from "@/modules/channels/infrastructure/channels-service.adapter"
import type { Channel, ChannelsListResponse, ListChannelsParams } from "@/modules/channels/domain/channel"

export type ChannelsCounts = {
  inbox: number
  myInbox: number
  chats: number
  scheduled: number
  archived: number
  closed: number
  starred: number
  byType: Partial<Record<ChannelType, number>>
}

type ChannelsContextValue = {
  loading: boolean
  error: string | null
  channels: Channel[]
  counts: ChannelsCounts
  fetchChannels: (params?: ListChannelsParams) => Promise<void>
}

const ChannelsContext = createContext<ChannelsContextValue | undefined>(undefined)

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [counts, setCounts] = useState<ChannelsCounts>({
    inbox: 0,
    myInbox: 0,
    chats: 0,
    scheduled: 0,
    archived: 0,
    closed: 0,
    starred: 0,
    byType: {},
  })

  const fetchChannels = useCallback(async (params?: ListChannelsParams) => {
    setLoading(true)
    setError(null)
    try {
      const res: ApiResponse<ChannelsListResponse> = await listChannels(params ?? {})
      const list = res.data?.channels ?? []
      setChannels(list)
      // naive counts by type for sidebar badges
      const grouped = list.reduce<Partial<Record<ChannelType, number>>>((acc, ch) => {
        acc[ch.type] = (acc[ch.type] ?? 0) + 1
        return acc
      }, {})
      setCounts((c) => ({ ...c, byType: grouped }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<ChannelsContextValue>(() => ({ loading, error, channels, counts, fetchChannels }), [loading, error, channels, counts, fetchChannels])

  return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>
}

export function useChannels() {
  const ctx = useContext(ChannelsContext)
  if (!ctx) throw new Error("useChannels must be used within ChannelsProvider")
  return ctx
}