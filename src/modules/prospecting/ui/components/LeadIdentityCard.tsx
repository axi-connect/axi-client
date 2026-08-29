"use client";

import { ShieldAlert } from "lucide-react";

import { RelativeDate } from "@/shared/components/ui/relative-date";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import { MapPreview } from "@/shared/components/features/location";
import {
  SocialIcon,
  type SocialIconName,
} from "@/shared/components/layout/site/SocialIcon";
import {
  SOCIAL_LABELS,
  leadDisplayName,
  readSocials,
  type LeadDetailDTO,
} from "../../domain/lead";

/** El color de marca de cada red. Son de terceros: no cambian con el tema. */
const BRAND_CLASS: Record<string, string> = {
  instagram: "text-logo-instagram",
  facebook: "text-logo-messenger",
  linkedin: "text-logo-messenger",
  tiktok: "text-foreground",
  whatsapp: "text-logo-whatsapp",
};

/**
 * Qué sabemos de este negocio.
 *
 * Responde una pregunta —«cuáles son los datos»— y deja la otra —«de dónde
 * salieron»— a `LeadProvenance`, que va debajo. Fundirlas daría una lista de
 * quince filas donde no se encuentra nada, que es justo lo que pasaba cuando
 * la única tabla de la ficha era la de procedencia.
 *
 * `FieldList` aporta el botón de copiar y esconde solo las filas vacías, así
 * que un lead a medio completar no enseña seis huecos.
 */
export function LeadIdentityCard({ lead }: { lead: LeadDetailDTO }) {
  const socials = readSocials(lead.socials);
  const hasPoint = lead.latitude !== null && lead.longitude !== null;

  const items: FieldItem[] = [
    { label: "Dirección", value: lead.address, copyable: lead.address ?? undefined },
    { label: "NIT", value: mono(lead.tax_id), copyable: lead.tax_id ?? undefined },
    { label: "Correo", value: mono(lead.email), copyable: lead.email ?? undefined },
    { label: "Teléfono", value: mono(lead.phone), copyable: lead.phone ?? undefined },
    {
      label: "Sitio web",
      value:
        lead.website === null ? null : (
          <a
            className="text-info hover:underline"
            href={lead.website}
            rel="noopener noreferrer nofollow"
            target="_blank"
          >
            {lead.domain ?? lead.website}
          </a>
        ),
      copyable: lead.website ?? undefined,
    },
  ];

  // Un lead sin ningún dato y sin punto en el mapa no merece una tarjeta vacía:
  // lo que necesita es el botón de buscar datos, que está en la cabecera.
  const empty = items.every((item) => item.value === null) && socials.length === 0 && !hasPoint;
  if (empty) return null;

  return (
    <section className="border-border shadow-float bg-background rounded-lg border p-5">
      <h2 className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-[0.085em] uppercase">
        Identidad y contacto
      </h2>

      <FieldList items={items} />

      {socials.length > 0 && (
        <div className="border-border-soft mt-3 border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs">Perfiles</p>
          <ul className="flex flex-wrap gap-2">
            {socials.map((social) => (
              <li key={social.network}>
                <a
                  className="border-border hover:bg-secondary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  href={social.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  <SocialIcon
                    className={`size-3.5 ${BRAND_CLASS[social.network] ?? ""}`}
                    name={social.network as SocialIconName}
                  />
                  {SOCIAL_LABELS[social.network]}
                </a>
              </li>
            ))}
          </ul>

          {/* La invariante del módulo, dicha justo donde alguien podría
              desobedecerla: el número está publicado, y aun así el canal puede
              estar prohibido. Tener el dato no es tener permiso. */}
          {socials.some((social) => social.network === "whatsapp") &&
            !lead.allowed_channels.includes("whatsapp") && (
              <p className="border-warning/25 bg-warning/10 text-warning mt-3 flex items-start gap-2 rounded-md border p-2 text-[11.5px]">
                <ShieldAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                <span>
                  Su WhatsApp está publicado, pero este lead no permite WhatsApp: nunca pidió que lo
                  contactaras. Puedes llamarlo o escribirle un correo.
                </span>
              </p>
            )}
        </div>
      )}

      {hasPoint && (
        <div className="mt-4">
          <MapPreview
            label={lead.address ?? leadDisplayName(lead)}
            lat={lead.latitude as number}
            lng={lead.longitude as number}
          />
        </div>
      )}

      {lead.last_enriched_at !== null && (
        <p className="border-border-soft text-muted-foreground mt-3 border-t pt-3 text-[11.5px]">
          Datos completados <RelativeDate iso={lead.last_enriched_at} />
        </p>
      )}
    </section>
  );
}

function mono(value: string | null) {
  return value === null ? null : <span className="font-mono text-xs">{value}</span>;
}
