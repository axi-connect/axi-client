import type { MessageDirection, MessageStatus } from "@/modules/channels/domain/enums"

export type Message = {
  id: string
  from: string | null
  to: string | null
  message: string
  payload: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  direction: MessageDirection
  timestamp: string
  conversation_id: string
  status: MessageStatus
  content_type: string
  created_at: string
  updated_at: string
}