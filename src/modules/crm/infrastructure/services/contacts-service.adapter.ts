import { http } from "@/core/services/http";
import type { CursorPage, Paginated } from "@/core/api/types";
import type {
  ContactDTO,
  ContactListItemDTO,
  ContactProfileDTO,
  ContactTagDTO,
  CreateContactDTO,
  DuplicatePairDTO,
  ListContactsParams,
  TimelineEntryDTO,
  TimelineSource,
  UpdateContactDTO,
} from "@/modules/crm/domain/contact";

/** Adapter HTTP de contactos (`/contacts`, permisos contacts:read/manage). */
export function listContacts(
  params: ListContactsParams = {},
): Promise<Paginated<ContactListItemDTO>> {
  return http.get<Paginated<ContactListItemDTO>>("/contacts", params);
}

export function getContact(id: string): Promise<ContactDTO> {
  return http.get<ContactDTO>(`/contacts/${id}`);
}

/** Alta manual (`source: manual`). Duplicado → 409 `contacts/duplicate_identity`. */
export function createContact(dto: CreateContactDTO): Promise<ContactDTO> {
  return http.post<ContactDTO>("/contacts", dto);
}

export function updateContact(id: string, dto: UpdateContactDTO): Promise<ContactDTO> {
  return http.patch<ContactDTO>(`/contacts/${id}`, dto);
}

/** Soft delete: conversaciones y pedidos del contacto sobreviven. */
export function deleteContact(id: string): Promise<void> {
  return http.delete<void>(`/contacts/${id}`);
}

// ---------------------------------------------------------------------------
// Contacto 360 (F2): profile/score, tags, timeline, duplicados y merge
// ---------------------------------------------------------------------------

/** Get lazy: siempre hay profile (el backend lo materializa al pedirlo). */
export function getContactProfile(contactId: string): Promise<ContactProfileDTO> {
  return http.get<ContactProfileDTO>(`/crm/contacts/${contactId}/profile`);
}

/** Reasignar dueño comercial (gate `crm:manage`; null = sin dueño). */
export function assignContactOwner(
  contactId: string,
  ownerUserId: string | null,
): Promise<ContactProfileDTO> {
  return http.patch<ContactProfileDTO>(`/crm/contacts/${contactId}/profile`, {
    owner_user_id: ownerUserId,
  });
}

export async function getContactTags(contactId: string): Promise<ContactTagDTO[]> {
  const res = await http.get<{ data: ContactTagDTO[] }>(`/crm/contacts/${contactId}/tags`);
  return res.data;
}

/** PUT replace-set: la lista enviada sustituye por completo a la anterior. */
export async function setContactTags(
  contactId: string,
  tagIds: string[],
): Promise<ContactTagDTO[]> {
  const res = await http.put<{ data: ContactTagDTO[] }>(`/crm/contacts/${contactId}/tags`, {
    tag_ids: tagIds,
  });
  return res.data;
}

/** Timeline multi-fuente con cursor opaco (orden desc, límite ≤50). */
export function getContactTimeline(
  contactId: string,
  params: { sources?: TimelineSource[]; cursor?: string; limit?: number } = {},
): Promise<CursorPage<TimelineEntryDTO>> {
  return http.get<CursorPage<TimelineEntryDTO>>(`/crm/contacts/${contactId}/timeline`, {
    sources: params.sources?.length ? params.sources.join(",") : undefined,
    cursor: params.cursor,
    limit: params.limit,
  });
}

/** Pares sugeridos deterministas (máx 50): email exacto o nombre similar. */
export async function listDuplicates(): Promise<DuplicatePairDTO[]> {
  const res = await http.get<{ data: DuplicatePairDTO[] }>("/contacts/duplicates");
  return res.data;
}

/**
 * Merge IRREVERSIBLE: `targetId` gana; todo lo del perdedor (`sourceId`) se
 * reasigna y el perdedor desaparece. 422 `contacts/merge_self`.
 */
export function mergeContacts(
  targetId: string,
  sourceId: string,
): Promise<{ target_contact_id: string; merged_contact_id: string }> {
  return http.post(`/contacts/${targetId}/merge`, { source_contact_id: sourceId });
}

/**
 * Usuarios del tenant para el select de owner. El recurso `/users` es del
 * backend compartido; este slice no importa infraestructura de `modules/users`
 * (§3.3.5): expone su propia proyección mínima.
 */
export async function listAssignableUsers(): Promise<
  Array<{ id: string; name: string; status: string }>
> {
  const res = await http.get<{ data: Array<{ id: string; name: string; status: string }> }>(
    "/users",
  );
  return res.data;
}
