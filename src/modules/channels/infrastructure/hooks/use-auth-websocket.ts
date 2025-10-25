"use client"

import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { WebSocketService } from '../services/websocket.service'
import type { AuthEvents, ChannelsWebSocketEvents } from '../../domain/websocket.types'

/**
 * Hook for authentication WebSocket operations
 * Handles authentication state and company management
 */
export function useAuthWebSocket() {
  const authSocketRef = useRef<Socket<ChannelsWebSocketEvents> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    authSocketRef.current = WebSocketService.connect('/auth')

    return () => {
      if (authSocketRef.current) {
        WebSocketService.disconnect('/auth')
        authSocketRef.current = null
      }
    }
  }, [])

  // Listen to auth events
  const useAuthEvents = (callbacks: Partial<AuthEvents>) => {
    useEffect(() => {
      if (!authSocketRef.current) return

      const socket = authSocketRef.current

      // Register event listeners
      Object.entries(callbacks).forEach(([event, callback]) => {
        if (callback) {
          socket.on(event as keyof AuthEvents, callback)
        }
      })

      // Cleanup
      return () => {
        Object.keys(callbacks).forEach((event) => {
          socket.off(event as keyof AuthEvents)
        })
      }
    }, [callbacks])
  }

  return {
    useAuthEvents,
    isConnected: authSocketRef.current?.connected ?? false,
  }
}
