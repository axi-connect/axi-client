// Agents module models
import { CharacterDTO } from "./characters/model";

export type AgentsSortDir = "asc" | "desc";
export type AgentsView = "summary" | "detail";
export type AgentsSortBy = "id" | "name" | "phone" | "company_id" | "alive";

export interface ListAgentsParams {
  name?: string;
  phone?: string;
  company_id?: number;
  alive?: boolean;
  limit?: number; // default 20 (handled server-side)
  offset?: number; // default 0 (handled server-side)
  sortBy?: AgentsSortBy;
  sortDir?: AgentsSortDir;
  view?: AgentsView; // default "summary" (handled server-side)
}

export interface CompanyMiniDTO {
  id: number | string;
  name: string;
}

export interface AgentIntentionRequirementsDTO {
  require_db: boolean;
  require_sheet: boolean;
  require_catalog: boolean;
  require_reminder: boolean;
  require_schedule: boolean;
}

export interface AgentIntentionInstructionDTO {
  context: string;
  parameters: {
    top_p: number;
    max_tokens: number;
    temperature: number;
  };
  output_format: {
    style: string;
    language: string;
    max_length: number;
  };
  input_examples: string[];
  prompt_template: string;
}

export interface AiRequirementDTO {
  id: number;
  instructions: AgentIntentionInstructionDTO[];
}

export interface IntentionDTO {
  id: number;
  code: string;
  flow_name: string;
  description: string;
  ai_instructions: string;
  priority: string; // e.g. "high"
  type: string; // e.g. "support"
}

export interface AgentIntentionDTO {
  id: number;
  requirements: AgentIntentionRequirementsDTO;
  agent_id: number;
  intention_id: number;
  ai_requirement_id: number;
  intention?: IntentionDTO;
  ai_requirement?: AiRequirementDTO;
}

export interface AgentSummaryDTO{
  id: number;
  name:string;
  phone:string;
  alive:boolean;
  company:CompanyMiniDTO;
  character: CharacterDTO;
}

export interface AgentDetailDTO extends AgentSummaryDTO{
  client_id:string;
  character:CharacterDTO;
  agentIntention: AgentIntentionDTO[];
}
export interface ApiAgentSummaryPayload {
  agents: AgentSummaryDTO[];
  total: number;
}

// Row shape used by the shared DataTable component
export type AgentRow = {
  id: string;
  name: string;
  phone: string;
  alive: boolean;
  avatar: string;
  company_name?: string;
  avatar_background: string;
}

// Create Agent DTOs
export type AgentChannel = "whatsapp" | "telegram" | string
export type AgentStatus = "available" | "busy" | "offline" | string

export type CreateAgentIntentionItem = {
  intention_id: number
  requirements: AgentIntentionRequirementsDTO | Record<string, unknown>
  ai_requirement_id?: number
}

export interface CreateAgentDTO {
  name: string
  phone: string
  skills?: string[]
  company_id: number
  status?: AgentStatus
  channel: AgentChannel
  character_id?: number
  intentions?: CreateAgentIntentionItem[]
}