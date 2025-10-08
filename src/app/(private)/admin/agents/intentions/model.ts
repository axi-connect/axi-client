export type IntentionType = "sales" | "support" | "technical" | "onboarding" | "follow_up";

export type IntentionPriority = "low" | "medium" | "high" | "urgent";

export type IntentionSortDir = "asc" | "desc";
export type IntentionView = "summary" | "detail";
export type IntentionSortBy = "id" | "code" | "flow_name" | "type" | "priority";

export interface ListIntentionParams {
  type?: IntentionType;
  priority?: IntentionPriority;
  code?: string;
  flow_name?: string;
  description?: string;
  ai_instructions?: string;
  limit?: number; // default 20 (handled server-side)
  offset?: number; // default 0 (handled server-side)
  sortBy?: IntentionSortBy;
  sortDir?: IntentionSortDir;
  view?: IntentionView; // default "summary" (handled server-side)
}

export interface IntentionDTO {
  id: number;
  code: string;
  flow_name: string;
  description: string;
  ai_instructions: string;
  priority: IntentionPriority;
  type: IntentionType;
}

export interface ApiIntentionPayload {
  intentions: IntentionDTO[];
  total: number;
}