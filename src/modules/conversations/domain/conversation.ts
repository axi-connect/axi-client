import type { ParticipantType } from "@/modules/channels/domain/enums"

export type Conversation = {
  id: string
  status: string
  company_id: number
  channel_id: string
  external_id: string
  updated_at: string
  created_at: string
  participant: {
    id: string
    type: ParticipantType
    meta: {
      name: string
      avatar: string
      [key: string]: unknown
    }
  }
  last_message: {
    id: string
    message: string
    created_at: string
  }
  assigned_agent?: {
    id: string
    name: string
    avatar: string
  }
}

export type ConversationSearchCriteria = {
  id?: string;
  date_to?: Date;
  limit?: number;
  offset?: number;
  status?: string;
  date_from?: Date;
  company_id?: number;
  channel_id?: string;
  external_id?: string;
  participant_id?: string;
  sortDir?: 'asc' | 'desc';
  assigned_agent_id?: number;
  participant_type?: ParticipantType;
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at';
}