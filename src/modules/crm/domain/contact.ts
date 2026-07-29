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
