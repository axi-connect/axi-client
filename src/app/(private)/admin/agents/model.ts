// Agents module models

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

export interface AgentDTO {
  id: number | string;
  name: string;
  phone: string;
  alive: boolean;
  company_id: number;
  client_id: string; // UUID
  // summary view may omit nested objects
  company?: CompanyMiniDTO;
  agentIntention?: AgentIntentionDTO[];
  [key: string]: unknown;
}

export interface ApiAgentsPayload {
  agents: AgentDTO[];
  total: number;
}