"use client"

import { Socket } from 'socket.io-client'
import { useEffect, useCallback, useRef, useState } from 'react'
import { WebSocketService } from '@/core/websocket/websocket.service'
import { WebSocketEventBus } from '@/core/websocket/websocket-event-bus'
import type { ChannelEvents, ChannelsWebSocketEvents } from '../../domain/websocket.types'

/**
 * Hook for channel-specific WebSocket operations
 * Handles channel join/leave and status monitoring
*/
export function useChannelsWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const channelSocketRef = useRef<Socket<ChannelsWebSocketEvents> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    const handler = () => setIsConnected(true)
    WebSocketService.connect('channel').then(socket => {
      channelSocketRef.current = socket
      WebSocketEventBus.on('channel-ws-connected', handler)
    })

    return () => {
      if (channelSocketRef.current) {
        channelSocketRef.current = null
        WebSocketService.disconnect('channel')
        WebSocketEventBus.off('channel-ws-connected', handler)
      }
    }
  }, [])

  // Join a channel
  const joinChannel = useCallback((channelId: string) => {
    if (channelSocketRef.current) {
      console.log("🔐 joining channel", channelId)
      channelSocketRef.current.emit('channel.join', { channelId })
    } else console.error("🔐 channel socket not connected")
  }, [])

  // Leave a channel
  const leaveChannel = useCallback((channelId: string) => {
    if (channelSocketRef.current) {
      channelSocketRef.current.emit('channel.leave', { channelId })
    }
  }, [])

  // Get channel status
  const getChannelStatus = useCallback((channelId: string) => {
    if (channelSocketRef.current) channelSocketRef.current.emit('channel.status', { channelId })
    else console.error("🔐 channel socket not connected")
  }, [])

  // Listen to channel events
  const useChannelEvents = (callbacks: Partial<ChannelEvents>) => {
    useEffect(() => {
      if (!channelSocketRef.current) return

      const socket = channelSocketRef.current

      // Register event listeners
      Object.entries(callbacks).forEach(([event, callback]) => {
        if (callback) socket.on(event as keyof ChannelEvents, callback)
      })

      // Cleanup
      return () => {
        Object.keys(callbacks).forEach((event) => socket.off(event as keyof ChannelEvents))
      }
    }, [callbacks])
  }

  return {
    joinChannel,
    isConnected,
    leaveChannel,
    getChannelStatus,
    useChannelEvents,
  }
}