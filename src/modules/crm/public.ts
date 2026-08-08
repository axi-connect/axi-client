/**
 * SUPERFICIE PÚBLICA del slice `crm` (architecture.md §3.3).
 *
 * Lo que otros slices pueden consumir del CRM se declara AQUÍ y solo aquí.
 * Un import de `@/modules/crm/...` desde otro slice es una violación de
 * frontera; el import correcto es `@/modules/crm/public`.
 *
 * Consumidores actuales: `modules/inbox` (rail de contexto de la conversación),
 * `modules/dashboard` (labels de etapa de ciclo de vida), `modules/scheduling`
 * (hidratación de nombres de contacto y selector de contacto).
 */

export {
  TIMELINE_SOURCES,
  TIMELINE_SOURCE_LABELS,
  contactDisplayName,
  type ContactDTO,
  type ContactListItemDTO,
  type ContactProfileDTO,
  type ContactTagDTO,
  type ContactChannelIdentity,
  type TimelineEntryDTO,
  type TimelineSource,
} from "./domain/contact";

/**
 * Lectura de contactos para otros slices (scheduling hidrata los nombres de
 * `contact_id` de las citas; el DTO del backend no los embebe).
 */
export { getContact, listContacts } from "./infrastructure/services/contacts-service.adapter";

export {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_BADGE_CLASSES,
  CONTACT_SOURCE_LABELS,
  CONTACT_DOCUMENT_TYPE_LABELS,
  type ContactLifecycleStage,
  type ContactSource,
  type ContactDocumentType,
} from "./domain/enums";

/** Fan-out de contacto + profile + tags con degradación por permisos (§3.3.5). */
export { useContactContext, type ContactContext } from "./infrastructure/hooks/use-contact-context";

/** Bloque presentacional de solo lectura; no depende del contexto del slice. */
export { ContactFieldList } from "./ui/components/contact-detail/ContactFieldList";

/** Historial 360 sin chrome de card: trae sus propios datos por `contactId`. */
export { ContactTimelineFeed } from "./ui/components/contact-detail/ContactTimelineFeed";

/**
 * Selector del responsable comercial del contacto (compacto, con búsqueda).
 * Muta un recurso de CRM, de ahí que viva en este slice.
 */
export { ContactOwnerSelect } from "./ui/components/contact-detail/ContactOwnerSelect";
