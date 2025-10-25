"use client"

import { io, Socket } from 'socket.io-client'
import { WS_BASE_URL } from '@/core/config/env'
import type { Namespace, ChannelsWebSocketEvents } from '../../domain/websocket.types'

/**
 * WebSocket service for Channels module
 * Handles Socket.IO connections with automatic authentication
*/
export class WebSocketService {
  private static instances = new Map<Namespace, Socket>()

  /**
   * Get or create a socket instance for a specific namespace
  */
  static async getSocket(namespace: Namespace): Promise<Socket<ChannelsWebSocketEvents>> {
    if (this.instances.has(namespace)) return this.instances.get(namespace)!

    const socket = await this.createSocket(namespace)
    this.instances.set(namespace, socket)

    return socket
  }

  /**
   * Create a new socket connection
  */
  private static async createSocket(namespace: Namespace): Promise<Socket<ChannelsWebSocketEvents>> {
    console.log(`🔌 Connecting to: ${WS_BASE_URL}${namespace}`)

    const auth = await this.getAuthToken()
    const socket = io(`${WS_BASE_URL}${namespace}`, {
      auth,
      // autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Socket.IO will automatically handle cookies for authentication
    })

    // Basic connection event handlers
    socket.on('connect', () => {
      console.log(`🔌 Connected to ${namespace} (ID: ${socket.id})`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected from ${namespace}: ${reason}`)
    })

    socket.on('connect_error', (error: Error) => {
      console.error(`❌ Connection error for ${namespace}:`, error.message)
    })

    return socket
  }

  /**
   * Get authentication token from cookies
  */
  private static getAuthToken = async (): Promise<{ token: string } | undefined> => {
    try {
      // Get token from API endpoint that can access HttpOnly cookies
      const response = await fetch('/api/auth/token', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        return { token: data.accessToken }
      }

      console.warn('Failed to get WebSocket auth token')
      return undefined
    } catch (error) {
      console.error('Error getting WebSocket auth token:', error)
      return undefined
    }
  }

  /**
   * Connect to a namespace
  */
  static async connect(namespace: Namespace): Promise<Socket<ChannelsWebSocketEvents>> {
    const socket = await this.getSocket(namespace)
    if (!socket.connected) socket.connect()
    return socket
  }

  /**
   * Disconnect from a namespace
  */
  static disconnect(namespace: Namespace): void {
    const socket = this.instances.get(namespace)
    if (socket) {
      socket.disconnect()
      this.instances.delete(namespace)
    }
  }

  /**
   * Disconnect all sockets
  */
  static disconnectAll(): void {
    this.instances.forEach((socket) => socket.disconnect())
    this.instances.clear()
  }

  /**
   * Check if a namespace is connected
  */
  static isConnected(namespace: Namespace): boolean {
    const socket = this.instances.get(namespace)
    return socket?.connected ?? false
  }
}
