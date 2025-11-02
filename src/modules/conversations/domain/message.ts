import type { MessageDirection, MessageStatus } from "@/modules/channels/domain/enums"

export interface Message {
  id: string;
  from?: string;
  to?: string;
  timestamp: Date;
  message: string;
  created_at: Date;
  updated_at: Date;
  content_type: string;
  status: MessageStatus;
  conversation_id: string;
  direction: MessageDirection;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}