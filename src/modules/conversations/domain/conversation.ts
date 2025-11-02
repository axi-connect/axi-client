import type { ContactType } from "@/modules/channels/domain/enums"
export interface Contact {
  id: string;
  name: string;
  number: string;
  company_id: number;
  type: ContactType;
  profile_pic_url: string;
  meta: Record<string, unknown> | null;
}

export interface ConversationDto {
  id: string
  status: string
  contact: Contact
  company_id: number
  channel_id: string
  updated_at: string
  created_at: string
  external_id: string
  last_message?: {
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
  contact_id?: string;
  sortDir?: 'asc' | 'desc';
  assigned_agent_id?: number;
  contact_type?: ContactType;
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at';
}