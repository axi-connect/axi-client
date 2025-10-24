import type { ParticipantType } from "./enums"

export type Conversation = {
  id: string
  status: string
  company_id: number
  channel_id: string
  external_id: string
  assigned_agent_id: number | null
  participant_id: string | null
  participant_meta: Record<string, unknown> | null
  participant_type: ParticipantType
  created_at: string
  updated_at: string
  last_message_at?: string | null
}