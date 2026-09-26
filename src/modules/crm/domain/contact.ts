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
  /**
   * Columna «Datos» (F1): campos de los formularios de captura con valor /
   * definidos. `null` en ambos = el tenant no tiene formularios activos («—»).
   */
  data_filled: number | null;
  data_total: number | null;
  /** Canal por el que escribió por última vez (lienzo F2): `null` sin identidades. */
  channel_kind: ContactChannelIdentity["channel_kind"] | null;
  last_seen_at: string | null;
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
  "lifecycle",
];

export const TIMELINE_SOURCE_LABELS: Record<TimelineSource, string> = {
  activities: "Actividades",
  deals: "Oportunidades",
  orders: "Pedidos",
  conversations: "Conversaciones",
  appointments: "Citas",
  lifecycle: "Ciclo de vida",
};

export const DUPLICATE_REASON_LABELS: Record<DuplicatePairDTO["reason"], string> = {
  email_exact: "Email exacto",
  similar_name: "Nombre similar",
};

/**
 * HITOS del embudo con sus pesos DEFAULT (S3 backend: espejo de crm_settings,
 * cap 100). El modelo es MONOTÓNICO: cada hito implica los anteriores (un
 * pedido ⇒ hubo intención) y los caminos producto (pedido→pago) y servicio
 * (cita→completada) convergen al mismo hito — ambos llegan a 100.
 * `score_signals.milestones[hito] = { at, evidence }`; los pesos por tenant
 * no viajan en el DTO.
 */
export const SCORE_MILESTONES: ReadonlyArray<{
  key: string;
  label: string;
  detail: string;
  weight: number;
}> = [
  { key: "engaged", label: "Conversación iniciada", detail: "Habló con el negocio", weight: 15 },
  {
    key: "interest",
    label: "Interés demostrado",
    detail: "Exploró catálogo o intención de venta",
    weight: 20,
  },
  {
    key: "evaluating",
    label: "Evaluando",
    detail: "Cotización u oportunidad abierta",
    weight: 25,
  },
  { key: "committed", label: "Compromiso", detail: "Pedido creado o cita agendada", weight: 25 },
  {
    key: "converted",
    label: "Convertido",
    detail: "Pago verificado, deal ganado o cita cumplida",
    weight: 15,
  },
];

export interface MilestoneEntry {
  at?: string;
  evidence?: string;
}

/** Entry del hito si fue alcanzado; undefined si está pendiente. */
export function milestoneEntry(
  profile: ContactProfileDTO,
  key: string,
): MilestoneEntry | undefined {
  const milestones = (profile.score_signals as { milestones?: Record<string, unknown> } | null)
    ?.milestones;
  const entry = milestones?.[key];
  return entry !== null && typeof entry === "object" ? (entry as MilestoneEntry) : undefined;
}

/** Evidencia legible del hito: qué evento lo disparó. */
export function milestoneEvidenceLabel(entry: MilestoneEntry | undefined): string | null {
  const evidence = entry?.evidence;
  if (!evidence) return null;
  if (evidence.startsWith("implied_by:")) return "Implícito por un hito posterior";
  if (evidence === "backfill") return "Derivado del historial";
  const map: Record<string, string> = {
    "conversation.created": "Inició conversación",
    "conversation.intent_detected": "Intención detectada",
    "conversation.intent_detected:behavior": "Cotizó o pidió en la conversación",
    "ai.turn_completed:catalog_tools": "Exploró el catálogo",
    "order.quoted": "Recibió cotización",
    "crm.deal_created": "Oportunidad abierta",
    "order.created": "Creó un pedido",
    "scheduling.appointment_booked": "Agendó una cita",
    "order.status_changed": "Pago verificado",
    "crm.deal_won": "Oportunidad ganada",
  };
  return map[evidence] ?? evidence;
}

/** Lo que se pinta cuando un contacto no tiene con qué identificarse. Una sola
 *  copia en el repo: el servidor manda `null` y el literal es de la interfaz. */
export const UNNAMED_CONTACT = "Sin nombre";

/** Nombre visible con fallback: full_name → first+last → teléfono → correo. */
export function contactDisplayName(
  dto: Pick<ContactListItemDTO, "full_name" | "first_name" | "last_name" | "phone" | "email">,
): string {
  const composed = [dto.first_name, dto.last_name].filter(Boolean).join(" ").trim();
  return dto.full_name?.trim() || composed || dto.phone || dto.email || UNNAMED_CONTACT;
}

/**
 * `completeness` la calcula `fetchContacts` con `dataCompleteness()` sobre los
 * formularios activos del tenant; `null` = sin formularios (celda «—»).
 */
export function mapContactToRow(
  dto: ContactListItemDTO,
  completeness: { filled: number; total: number } | null = null,
): ContactRow {
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
    data_filled: completeness?.filled ?? null,
    data_total: completeness?.total ?? null,
    ...primaryChannel(dto.channel_identities),
  };
}

/**
 * El canal que manda en la fila: el de la última vez que la persona escribió.
 * Una identidad sin `last_seen_at` solo gana si no hay otra con fecha; sin
 * identidades, «Sin canal».
 */
export function primaryChannel(
  identities: readonly Pick<ContactChannelIdentity, "channel_kind" | "last_seen_at">[],
): { channel_kind: ContactChannelIdentity["channel_kind"] | null; last_seen_at: string | null } {
  let best: Pick<ContactChannelIdentity, "channel_kind" | "last_seen_at"> | null = null;
  for (const identity of identities) {
    if (best === null) best = identity;
    else if (identity.last_seen_at !== null && (best.last_seen_at === null || identity.last_seen_at > best.last_seen_at)) best = identity;
  }
  return { channel_kind: best?.channel_kind ?? null, last_seen_at: best?.last_seen_at ?? null };
}
