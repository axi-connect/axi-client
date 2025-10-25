"use client"

import { Socket } from 'socket.io-client'
import { useEffect, useCallback, useRef } from 'react'
import { WebSocketService } from '../../../../core/websocket/websocket.service'
import type { SystemEvents, ChannelsWebSocketEvents } from '../../domain/websocket.types'

/**
 * Hook for system WebSocket operations
 * Handles health checks and system monitoring
*/
export function useSystemWebSocket() {
  const systemSocketRef = useRef<Socket<ChannelsWebSocketEvents> | null>(null)

  // Initialize socket connection
  useEffect(() => {
    systemSocketRef.current = WebSocketService.connect('/system')

    return () => {
      if (systemSocketRef.current) {
        WebSocketService.disconnect('/system')
        systemSocketRef.current = null
      }
    }
  }, [])

  // Health check
  const healthCheck = useCallback(() => {
    if (systemSocketRef.current) {
      systemSocketRef.current.emit('health_check')
    }
  }, [])

  // Ping for latency measurement
  const ping = useCallback(() => {
    if (systemSocketRef.current) {
      systemSocketRef.current.emit('ping', { timestamp: Date.now() })
    }
  }, [])

  // Listen to system events
  const useSystemEvents = (callbacks: Partial<SystemEvents>) => {
    useEffect(() => {
      if (!systemSocketRef.current) return

      const socket = systemSocketRef.current

      // Register event listeners
      Object.entries(callbacks).forEach(([event, callback]) => {
        if (callback) {
          socket.on(event as keyof SystemEvents, callback)
        }
      })

      // Cleanup
      return () => {
        Object.keys(callbacks).forEach((event) => {
          socket.off(event as keyof SystemEvents)
        })
      }
    }, [callbacks])
  }

  return {
    healthCheck,
    ping,
    useSystemEvents,
    isConnected: systemSocketRef.current?.connected ?? false,
  }
}
