import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  ContactDTO,
  ContactListItemDTO,
  CreateContactDTO,
  ListContactsParams,
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
