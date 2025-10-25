"use client"

import { useChannelsWebSocket } from "../hooks"
import type { ApiResponse } from "@/core/services/api"
import { ChannelEvents } from "../../domain/websocket.types"
import { WebSocketEventBus } from "@/core/websocket/websocket-event-bus"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { listChannels } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import type { Channel, ChannelsListResponse, ChannelWsState, ListChannelsParams } from "@/modules/channels/domain/channel"

type ChannelsContextValue = {
  loading: boolean
  channels: Channel[]
  error: string | null
  fetchChannels: (params?: ListChannelsParams) => Promise<void>
  // WS
  isConnected: boolean
  joinChannel: (channelId: string) => void
  leaveChannel: (channelId: string) => void
  useChannelEvents: (callbacks: Partial<ChannelEvents>) => void
  setChannelState: (channelId: string, update: Partial<ChannelWsState>) => void
}

const ChannelsContext = createContext<ChannelsContextValue | undefined>(undefined)

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])

  const setChannelState = useCallback((channelId: string, update: Partial<ChannelWsState>) => {
    setChannels((channels) => channels.map((channel) => {
      if (channel.id === channelId) channel.state = channel.state ? { ...channel.state, ...update } : update as ChannelWsState
      return channel
    }))
  }, [])

  // const getChannelState = useCallback((channelId: string) => {
  //   return channels.find((channel) => channel.id === channelId)?.state
  // }, [channels])

  // WS
  const { useChannelEvents, isConnected, joinChannel, leaveChannel, getChannelStatus } = useChannelsWebSocket()
  useChannelEvents({
    "channel.joined": ({ channelId }) => {
      console.log("🔐 channel joined", channelId)
      getChannelStatus(channelId)
      // TODO: Implementar logica
      // setChannelState(channelId, { status: "connected", hasJoined: true })
    },
    "channel.authenticated": ({ channelId }) => {
      console.log("🔐 channel authenticated", channelId)
      setChannelState(channelId, { status: "authenticated" })
      WebSocketEventBus.emit('channel-authenticated')
    },
    "channel.started": ({ channelId }) => {
      console.log("🔐 channel started", channelId)
      setChannelState(channelId, { status: "connecting" })
    },
    "channel.disconnected": ({ channelId }) => {
      console.log("🔐 channel disconnected", channelId)
      setChannelState(channelId, { status: "disconnected", hasJoined: false })
    },
    "channel.status_response": ({ channelId, status }) => {
      const { isAuthenticated, isConnected, lastActivity } = status
      const statusValue = isAuthenticated ? "authenticated" : isConnected ? "connected" : "disconnected"
      console.log("🔐 channel status response", status, statusValue)
      setChannelState(channelId, { status: statusValue, metadata: { lastActivity } })
    },
  })

  const fetchChannels = useCallback(async (params?: ListChannelsParams) => {
    setLoading(true)
    setError(null)
    try {
      const res: ApiResponse<ChannelsListResponse> = await listChannels(params ?? {})
      const list = res.data?.channels ?? []
      setChannels(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<ChannelsContextValue>(() => ({
    loading,
    error,
    channels,
    fetchChannels,
    // WS
    isConnected,
    joinChannel,
    leaveChannel,
    setChannelState,
    useChannelEvents
  }), [
    loading,
    error,
    channels,
    fetchChannels,
    // WS
    isConnected,
    joinChannel,
    leaveChannel,
    setChannelState,
    useChannelEvents
  ])

  return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>
}

export function useChannels() {
  const ctx = useContext(ChannelsContext)
  if (!ctx) throw new Error("useChannels must be used within ChannelsProvider")
  return ctx
}