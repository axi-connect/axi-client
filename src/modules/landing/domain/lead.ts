/**
 * Dominio del slice `landing`: contrato del lead de demo.
 * TypeScript puro — sin React, sin http, sin zod (arquitectura §3.2).
 */

/** Rangos del selector "¿Cuántas conversaciones maneja tu negocio al mes?". */
export const MONTHLY_CONVERSATION_RANGES = [
  "lt_300",
  "300_1000",
  "1000_3000",
  "gt_3000",
  "unknown",
] as const;

export type MonthlyConversationRange = (typeof MONTHLY_CONVERSATION_RANGES)[number];

/**
 * Payload wire (snake_case) de un lead de demo.
 * Contrato previsto para `POST /leads` en axi-server (aún no existe; ver
 * `infrastructure/services/lead-service.adapter.ts`).
 */
export interface DemoLeadPayload {
  name: string;
  business_name: string;
  whatsapp: string;
  monthly_conversations: MonthlyConversationRange;
}
