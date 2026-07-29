import type { OffsetQuery, Schemas } from "@/core/api/types";
import type { ContactLifecycleStage, ContactSource } from "./enums";

/**
 * Contratos del recurso contactos (`/contacts`, ampliado por el CRM).
 * DTOs = wire snake_case 1:1 con el backend; `ContactRow` es la forma que
 * consumen las tablas (el mapeo vive aquí, nunca disperso en la UI).
 */

export type ContactDTO = Schemas["ContactDto"];
export type ContactListItemDTO = Schemas["ContactsListDto"]["data"][number];
export type CreateContactDTO = Schemas["CreateContactDto"];
export type UpdateContactDTO = Schemas["UpdateContactDto"];
export type ContactChannelIdentity = ContactDTO["channel_identities"][number];

/** Query de `GET /contacts` (espejo de ContactsController_list_v1). */
export type ListContactsParams = OffsetQuery & {
  q?: string;
  lifecycle_stage?: ContactLifecycleStage;
  source?: ContactSource;
  city?: string;
  created_after?: string;
  created_before?: string;
  min_score?: number;
  owner_user_id?: string;
  tag_id?: string;
  sort?: "created_at" | "score";
};

/** Forma plana que consume `DataTable` (valores primitivos por contrato de DataRow). */
export type ContactRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  lifecycle_stage: ContactLifecycleStage;
  source: ContactSource;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Contacto 360 (F2): profile/score, timeline multi-fuente, tags y duplicados
// ---------------------------------------------------------------------------

export type ContactProfileDTO = Schemas["ContactProfileDto"];
export type ContactTagDTO = Schemas["ContactTagsDto"]["data"][number];
export type TimelineEntryDTO = Schemas["TimelineDto"]["data"][number];
export type TimelineSource = TimelineEntryDTO["source"];
export type DuplicatePairDTO = Schemas["DuplicatesListDto"]["data"][number];

export const TIMELINE_SOURCES: readonly TimelineSource[] = [
  "activities",
  "deals",
  "orders",
  "conversations",
  "appointments",
];

export const TIMELINE_SOURCE_LABELS: Record<TimelineSource, string> = {
  activities: "Actividades",
  deals: "Oportunidades",
  orders: "Pedidos",
  conversations: "Conversaciones",
  appointments: "Citas",
};

export const DUPLICATE_REASON_LABELS: Record<DuplicatePairDTO["reason"], string> = {
  email_exact: "Email exacto",
  similar_name: "Nombre similar",
};

/**
 * Señales del score con sus pesos DEFAULT (espejo de crm_settings del backend,
 * cap 100). El breakdown se muestra tal cual: `score_signals` marca cuáles
 * están activas (`clave: true`); los pesos por tenant no viajan en el DTO.
 */
export const SCORE_SIGNALS: ReadonlyArray<{ key: string; label: string; weight: number }> = [
  { key: "engaged_conversation", label: "Conversación activa", weight: 30 },
  { key: "sales_intent", label: "Intención de venta", weight: 20 },
  { key: "has_order", label: "Pedido realizado", weight: 20 },
  { key: "open_deal", label: "Oportunidad abierta", weight: 20 },
  { key: "appointment", label: "Cita agendada", weight: 15 },
];

export function isSignalActive(profile: ContactProfileDTO, key: string): boolean {
  return profile.score_signals?.[key] === true;
}

/** Nombre visible con fallback: full_name → first+last → teléfono → correo. */
export function contactDisplayName(
  dto: Pick<ContactListItemDTO, "full_name" | "first_name" | "last_name" | "phone" | "email">,
): string {
  const composed = [dto.first_name, dto.last_name].filter(Boolean).join(" ").trim();
  return dto.full_name?.trim() || composed || dto.phone || dto.email || "Sin nombre";
}

export function mapContactToRow(dto: ContactListItemDTO): ContactRow {
  return {
    id: dto.id,
    full_name: contactDisplayName(dto),
    phone: dto.phone,
    email: dto.email,
    city: dto.city,
    avatar_url: dto.avatar_url,
    lifecycle_stage: dto.lifecycle_stage,
    source: dto.source,
    created_at: dto.created_at,
  };
}
