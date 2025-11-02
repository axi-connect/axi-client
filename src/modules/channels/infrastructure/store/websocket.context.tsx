"use client"
import { useChannelsWebSocket } from "../hooks"
import { useChannelStore } from "./channels.store"
import { ChannelWsState } from "../../domain/channel"
import { createContext, useContext, useMemo } from "react"
import { ChannelEvents } from "../../domain/websocket.types"
import { WebSocketEventBus } from "@/core/websocket/websocket-event-bus"
import { useConversationStore } from "@/modules/conversations/infrastructure/store/conversations.store"

type WebSocketContextValue = {
    isConnected: boolean
    joinChannel: (channelId: string) => void
    leaveChannel: (channelId: string) => void
    useChannelEvents: (callbacks: Partial<ChannelEvents>) => void
    setChannelState: (channelId: string, update: Partial<ChannelWsState>) => void
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    // WS
    const { setChannelState } = useChannelStore()
    const { updateLastMessage } = useConversationStore()
    const { useChannelEvents, isConnected, joinChannel, leaveChannel, getChannelStatus } = useChannelsWebSocket()

    const value = useMemo<WebSocketContextValue>(() => ({
        isConnected,
        joinChannel,
        leaveChannel,
        useChannelEvents,
        setChannelState,
    }), [isConnected, joinChannel, leaveChannel, useChannelEvents, setChannelState])
    
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
        "message.received": ({ channelId, timestamp, data }) => {
          console.log("🔐 message received", channelId, timestamp, data)
          updateLastMessage(data.conversation_id, {
            id: data.id,
            message: data.message,
            created_at: new Date(timestamp)
          })
          // TODO: Implementar logica
          // setChannelState(channelId, { status: "connected", hasJoined: true })
        }
      })

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
    const ctx = useContext(WebSocketContext)
    if (!ctx) throw new Error("useWebSocket must be used within a WebSocketProvider")
    return ctx
}