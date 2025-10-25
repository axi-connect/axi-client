"use client"

import { Socket } from 'socket.io-client'
import { useEffect, useCallback, useRef } from 'react'
import { WebSocketService } from '../services/websocket.service'
// MessageEvents
import type { ChannelEvents, ChannelsWebSocketEvents } from '../../domain/websocket.types'

/**
 * Hook for channel-specific WebSocket operations
 * Handles channel join/leave and status monitoring
*/
export function useChannelsWebSocket() {
  const channelSocketRef = useRef<Socket<ChannelsWebSocketEvents> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    WebSocketService.connect('/channel').then(socket => channelSocketRef.current = socket)

    return () => {
      if (channelSocketRef.current) {
        WebSocketService.disconnect('/channel')
        channelSocketRef.current = null
      }
    }
  }, [])

  // Join a channel
  const joinChannel = useCallback((channelId: string) => {
    if (channelSocketRef.current) {
      channelSocketRef.current.emit('channel.join', { channelId })
    }
  }, [])

  // Leave a channel
  const leaveChannel = useCallback((channelId: string) => {
    if (channelSocketRef.current) {
      channelSocketRef.current.emit('channel.leave', { channelId })
    }
  }, [])

  // Get channel status
  const getChannelStatus = useCallback((channelId: string) => {
    if (channelSocketRef.current) {
      channelSocketRef.current.emit('channel.status', { channelId })
    }
  }, [])

  // Listen to channel events
  const useChannelEvents = (callbacks: Partial<ChannelEvents>) => {
    useEffect(() => {
      if (!channelSocketRef.current) return

      const socket = channelSocketRef.current

      // Register event listeners
      Object.entries(callbacks).forEach(([event, callback]) => {
        if (callback) {
          socket.on(event as keyof ChannelEvents, callback)
        }
      })

      // Cleanup
      return () => {
        Object.keys(callbacks).forEach((event) => {
          socket.off(event as keyof ChannelEvents)
        })
      }
    }, [callbacks])
  }

  return {
    joinChannel,
    leaveChannel,
    getChannelStatus,
    useChannelEvents,
    isConnected: channelSocketRef.current?.connected ?? false,
  }
}

/**
 * Hook for message-specific WebSocket operations
 * Handles sending/receiving messages
*/
// export function useMessagesWebSocket() {
//   const messageSocketRef = useRef<Socket<ChannelsWebSocketEvents> | null>(null)

//   // Initialize socket connection
//   useEffect(() => {
//     messageSocketRef.current = WebSocketService.connect('/message')

//     return () => {
//       if (messageSocketRef.current) {
//         WebSocketService.disconnect('/message')
//         messageSocketRef.current = null
//       }
//     }
//   }, [])

//   // Send a message
//   const sendMessage = useCallback((channelId: string, message: string, recipient?: string) => {
//     if (messageSocketRef.current) {
//       messageSocketRef.current.emit('send_message', {
//         channelId,
//         message,
//         recipient
//       })
//     }
//   }, [])

//   // Listen to message events
//   const useMessageEvents = (callbacks: Partial<MessageEvents>) => {
//     useEffect(() => {
//       if (!messageSocketRef.current) return

//       const socket = messageSocketRef.current

//       // Register event listeners
//       Object.entries(callbacks).forEach(([event, callback]) => {
//         if (callback) {
//           socket.on(event as keyof MessageEvents, callback)
//         }
//       })

//       // Cleanup
//       return () => {
//         Object.keys(callbacks).forEach((event) => {
//           socket.off(event as keyof MessageEvents)
//         })
//       }
//     }, [callbacks])
//   }

//   return {
//     sendMessage,
//     useMessageEvents,
//     isConnected: messageSocketRef.current?.connected ?? false,
//   }
// }