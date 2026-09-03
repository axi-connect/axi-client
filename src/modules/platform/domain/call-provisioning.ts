import type { Schemas } from "@/core/api/types";

/**
 * Dominio del aprovisionamiento de telefonía (calls F4-E): la cuenta madre de
 * Twilio y el inventario de números. Las llaves y los números los pone axi —
 * el tenant recibe un número asignado, jamás ve una credencial.
 */

export type CallAccount = Schemas["CallProviderAccountDto"];
export type CallNumber = Schemas["CallPhoneNumberDto"];
export type AvailableNumber = Schemas["AvailableCallNumberDto"];
export type CallCredentials = Schemas["CreateCallProviderDto"]["credentials"];
export type TenantCallAgent = Schemas["PlatformTenantAgentDto"];
export type OwnedTwilioNumber = Schemas["OwnedCallNumberDto"];
/** Identificador de llamada VERIFICADO en Twilio (OutgoingCallerId): solo se
 * muestra como From en las salientes; no recibe llamadas ni tiene renta. */
export type OwnedCallerId = Schemas["OwnedCallerIdDto"];
export type CallNumberKind = CallNumber["kind"];

export const CALL_NUMBER_KIND_LABELS: Record<CallNumberKind, string> = {
  twilio: "Número Twilio",
  caller_id: "Identificador",
};

export type CallAccountStatus =
  | "active"
  | "disabled"
  | "unhealthy"
  | "no_credential"
  | "capped_day"
  | "capped_month";

/** Mismo criterio que prospecting: la salud y los topes se derivan, no se guardan. */
export function callAccountStatus(account: CallAccount): CallAccountStatus {
  if (account.token_last4 === null) return "no_credential";
  if (!account.enabled) return "disabled";
  if (!account.healthy) return "unhealthy";
  if (account.daily_cap !== null && account.spent_today >= account.daily_cap) return "capped_day";
  if (account.monthly_cap !== null && account.spent_cycle >= account.monthly_cap) {
    return "capped_month";
  }
  return "active";
}

export const CALL_ACCOUNT_STATUS_LABELS: Record<CallAccountStatus, string> = {
  active: "Activa",
  disabled: "Apagada",
  unhealthy: "Con problemas",
  no_credential: "Sin llave",
  capped_day: "Tope diario alcanzado",
  capped_month: "Tope mensual alcanzado",
};

/** Fila PLANA para la tabla de números (DataRow exige primitivos). */
export type CallNumberRow = {
  id: string;
  phone_number: string;
  country_code: string;
  status: CallNumber["status"];
  kind: CallNumberKind;
  company_id: string | null;
  company_name: string | null;
  default_ai_agent_name: string | null;
  inbound_enabled: boolean;
  monthly_cost_cents: number | null;
  created_at: string;
};

export function toCallNumberRow(dto: CallNumber): CallNumberRow {
  return {
    id: dto.id,
    phone_number: dto.phone_number,
    country_code: dto.country_code,
    status: dto.status,
    kind: dto.kind,
    company_id: dto.company_id,
    company_name: dto.company_name,
    default_ai_agent_name: dto.default_ai_agent_name,
    inbound_enabled: dto.inbound_enabled,
    monthly_cost_cents: dto.monthly_cost_cents,
    created_at: dto.created_at,
  };
}
