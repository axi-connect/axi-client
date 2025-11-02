// WebSocket types for Channels module
import { Message } from "@/modules/conversations/domain/message"

export type SocketId = string

// Auth namespace events
export type AuthEvents = {
  // Server -> Client
  authenticated: (data: { userId: string; companyId: number }) => void
  auth_error: (data: { message: string; code: string }) => void

  // Client -> Server (not used in types, just for reference)
  // authenticate: (token: string) => void
}

// Channel namespace events
export type ChannelEvents = {
  // Client -> Server
  // 'channel.join': (data: { channelId: string }) => void
  // 'channel.status': (data: { channelId: string }) => void

  // Server -> Client
  'message.received': (data: {channelId: string, timestamp: string, data: Message }) => void
  'channel.joined': (data: { channelId: string; status: 'active' | 'inactive' }) => void
  'channel.started': (data: { channelId: string; status: 'ready' | 'not_ready'; lastActivity?: string }) => void
  'channel.authenticated': (data: { channelId: string; status: 'authenticated' | 'unauthenticated' }) => void
  'channel.status_response': (data: { channelId: string; status: {isActive: boolean; lastActivity?: string, isAuthenticated: boolean, isConnected: boolean }}) => void
  // 'channel.status.updated': (data: { channelId: string; status: 'active' | 'inactive' }) => void
  'channel.disconnected': (data: { channelId: string; reason: string }) => void
  // 'channel.auth_failure': (data: { channelId: string; error: string }) => void
  // 'channel.disconnect_error': (data: { channelId: string; error: string }) => void
  // 'channel.auth_failure_error': (data: { channelId: string; error: string }) => void
  // 'channel.session_cleaned': (data: { channelId: string }) => void
  // 'channel.started': (data: { channelId: string }) => void
  // 'channel.stopped': (data: { channelId: string }) => void
}

// Message namespace events
export type MessageEvents = {
  // Client -> Server
  // 'send_message': (data: { channelId: string; message: string; recipient?: string }) => void

  // Server -> Client
  'message_sent': (data: { messageId: string; channelId: string; status: 'sent' | 'delivered' | 'failed' }) => void
  'message_received': (data: Message) => void
}

// System namespace events
export type SystemEvents = {
  // Client -> Server
  // 'health_check': () => void
  // 'ping': (data: { timestamp: number }) => void

  // Server -> Client
  'health_response': (data: { status: 'healthy' | 'unhealthy'; timestamp: number }) => void
  'pong': (data: { timestamp: number }) => void
}

// Client emitted events (not typed in server responses)
export type ClientEvents = {
    'health_check': () => void
    'ping': (data: { timestamp: number }) => void
    'channel.join': (data: { channelId: string }) => void
    'channel.status': (data: { channelId: string }) => void
    'channel.leave': (data: { channelId: string }) => void
    'send_message': (data: { channelId: string; message: string; recipient?: string }) => void
}

// Combined events type (server -> client + client -> server)
export type ChannelsWebSocketEvents = AuthEvents & ChannelEvents & MessageEvents & SystemEvents & ClientEvents

// Socket.IO connection options
export type SocketOptions = {
  auth?: {
    token: string
  }
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

// Namespace types
export type Namespace = 'auth' | 'channel' | 'message' | 'system'
