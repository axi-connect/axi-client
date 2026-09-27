"use client";

import { FaFacebookMessenger, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { cn } from "@/core/lib/utils";
import { formatShortDate } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import type {
  ContactChannelIdentity,
  ContactDTO,
  ContactProfileDTO,
  ContactTagDTO,
} from "@/modules/crm/domain/contact";
import {
  CONTACT_DOCUMENT_TYPE_LABELS,
  CONTACT_SOURCE_LABELS,
} from "@/modules/crm/domain/enums";

/**
 * Bloque de SOLO LECTURA con la identidad de un contacto: datos de contacto,
 * identidades de canal, etiquetas y responsable comercial.
 *
 * Presentacional puro (no hace fetch) para poder montarse tanto en el rail de
 * contexto del inbox como en una card del 360. Cubre `address`, `document_*`,
 * `birthdate`, `source` y `created_at`. Los `custom_fields` NO se pintan aquí:
 * desde F1 los muestra `ContactDataPanel` («Datos del cliente») con su origen,
 * estado de verificación y acciones — volcarlos también aquí los duplicaría.
 */

const CHANNEL_META: Record<
  ContactChannelIdentity["channel_kind"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  whatsapp_cloud: { label: "WhatsApp", icon: FaWhatsapp },
  whatsapp_web: { label: "WhatsApp", icon: FaWhatsapp },
  instagram_dm: { label: "Instagram", icon: FaInstagram },
  facebook_messenger: { label: "Messenger", icon: FaFacebookMessenger },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h4>
  );
}

/** Documento legible: "CC 1.020.456.789". Requiere ambos campos. */
function documentValue(contact: ContactDTO): string | null {
  if (contact.document_number === null || contact.document_number === "") return null;
  const prefix =
    contact.document_type !== null ? `${CONTACT_DOCUMENT_TYPE_LABELS[contact.document_type]} ` : "";
  return `${prefix}${contact.document_number}`;
}

export function ContactFieldList({
  contact,
  profile,
  tags,
  ownerName,
  className,
}: {
  contact: ContactDTO;
  profile: ContactProfileDTO | null;
  tags: ContactTagDTO[];
  ownerName: string | null;
  className?: string;
}) {
  const items: FieldItem[] = [
    { label: "Teléfono", value: contact.phone, copyable: contact.phone ?? undefined },
    { label: "Email", value: contact.email, copyable: contact.email ?? undefined },
    { label: "Documento", value: documentValue(contact) },
    // Texto libre que escribe la IA: puede ser "recoge en local" y suele traer
    // el barrio y la ciudad embutidos. Nunca se trata como dato estructurado.
    { label: "Dirección", value: contact.address, block: true },
    { label: "Ciudad", value: contact.city },
    {
      label: "Cumpleaños",
      value: contact.birthdate !== null ? formatShortDate(contact.birthdate) : null,
    },
    { label: "Origen", value: CONTACT_SOURCE_LABELS[contact.source] },
    { label: "Creado", value: relativeTime(contact.created_at) },
  ];

  const channels = contact.channel_identities;

  return (
    <div className={cn("space-y-5", className)}>
      <FieldList items={items} />

      {channels.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>Canales</SectionLabel>
          <ul className="space-y-1.5">
            {channels.map((identity) => {
              const meta = CHANNEL_META[identity.channel_kind];
              const Icon = meta.icon;
              return (
                <li key={identity.id} className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 truncate">{identity.display_name ?? meta.label}</span>
                  {identity.last_seen_at !== null && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {relativeTime(identity.last_seen_at)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>Etiquetas</SectionLabel>
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li key={tag.id} className="min-w-0 max-w-full">
                {/* El color lo define el tenant: es dato, así que va en línea, pero
                    solo en el PUNTO. Como color del texto no pasaba AA en claro
                    (un amarillo sobre blanco) — inbox F4. */}
                <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-muted-foreground"
                    style={tag.color !== null ? { backgroundColor: tag.color } : undefined}
                  />
                  <span className="truncate" title={tag.name}>
                    {tag.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Solo se muestra si se pudo resolver el nombre: un uuid crudo no informa */}
      {profile !== null && ownerName !== null && (
        <section className="space-y-2">
          <SectionLabel>Responsable</SectionLabel>
          <p className="text-sm">{ownerName}</p>
        </section>
      )}
    </div>
  );
}
