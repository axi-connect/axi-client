"use client";

import { RelativeDate } from "@/shared/components/ui/relative-date";
import { BentoTile } from "@/shared/components/features/bento";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import { MapPreview } from "@/shared/components/features/location";
import {
  SocialIcon,
  type SocialIconName,
} from "@/shared/components/layout/site/SocialIcon";
import { nicheByCode } from "@/modules/onboarding/public";

import {
  SOCIAL_LABELS,
  leadDisplayName,
  readSocials,
  type LeadDetailDTO,
} from "../../domain/lead";
import { SIGNAL_KIND_LABELS, SIGNAL_LEVEL_LABELS, type LeadSignalDTO } from "../../domain/person";

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
export function LeadIdentityCard({
  lead,
  signals = [],
}: {
  lead: LeadDetailDTO;
  /** P2: las señales VIVAS del negocio (hechos, hipótesis, confirmadas). */
  signals?: readonly LeadSignalDTO[];
}) {
  const socials = readSocials(lead.socials);
  const hasPoint = lead.latitude !== null && lead.longitude !== null;
  const niche = nicheByCode(attributeValue(lead.attributes, "niche_code"));
  const ciiu = attributeValue(lead.attributes, "ciiu");
  const employees = attributeValue(lead.attributes, "employee_count_estimate");
  const registry = attributeValue(lead.attributes, "registry_status");
  const renewed = attributeValue(lead.attributes, "registry_renewed_year");

  const items: FieldItem[] = [
    // P2: lo que dice el registro mercantil y lo que estima Apollo.
    { label: "Razón social", value: lead.legal_name, copyable: lead.legal_name ?? undefined },
    {
      label: "Nicho",
      value:
        niche === null && ciiu === null
          ? null
          : [niche?.name, ciiu === null ? null : `CIIU ${ciiu}`].filter(Boolean).join(" · "),
    },
    {
      label: "Matrícula",
      value: registry === null ? null : [capitalize(registry), renewed === null ? null : `renovada en ${renewed}`].filter(Boolean).join(" · "),
    },
    {
      label: "Tamaño",
      value:
        employees === null ? null : (
          <span>
            ~{Number(employees).toLocaleString("es-CO")} empleados{" "}
            <span className="text-muted-foreground text-xs">· estimado</span>
          </span>
        ),
    },
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
  const empty =
    items.every((item) => item.value === null) && socials.length === 0 && !hasPoint && signals.length === 0;
  if (empty) return null;

  return (
    <BentoTile
      label="Identidad y contacto"
      aside={
        lead.last_enriched_at !== null ? (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            Datos completados <RelativeDate iso={lead.last_enriched_at} />
          </span>
        ) : undefined
      }
      className="@container gap-4"
    >
      {/* Ancha, los datos y el mapa lado a lado; estrecha, el mapa baja. */}
      <div className={hasPoint ? "grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] @2xl:items-start" : undefined}>
        <FieldList items={items} />
        {hasPoint && (
          <MapPreview
            label={lead.address ?? leadDisplayName(lead)}
            lat={lead.latitude as number}
            lng={lead.longitude as number}
          />
        )}
      </div>

      {/* P2 · señales: un hecho con su fuente y su fecha; una hipótesis, marcada como tal. */}
      {signals.length > 0 && (
        <div className="border-border flex flex-col gap-2 border-t pt-4">
          <span className="text-muted-foreground text-xs">Señales</span>
          <ul className="flex flex-col gap-2">
            {signals.map((signal) => (
              <li key={signal.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="font-semibold">{SIGNAL_KIND_LABELS[signal.kind] ?? signal.kind}</span>
                <span className="text-pretty">{signal.summary}</span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  · {SIGNAL_LEVEL_LABELS[signal.level]} · {signal.source}
                  {signal.source_url !== null && (
                    <>
                      {" · "}
                      <a
                        href={signal.source_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline underline-offset-2"
                      >
                        ver
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {socials.length > 0 && (
        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 text-xs">Perfiles</span>
            {socials.map((social) => (
              <a
                key={social.network}
                className="bg-muted hover:bg-accent inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors"
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
            ))}
          </div>

          {/* La invariante del módulo, dicha justo donde alguien podría
              desobedecerla: el número está publicado, y aun así el canal puede
              estar prohibido. Tener el dato no es tener permiso. */}
          {socials.some((social) => social.network === "whatsapp") &&
            !lead.allowed_channels.includes("whatsapp") && (
              <p className="flex gap-2.5 text-sm text-pretty">
                <span aria-hidden className="bg-warning mt-[0.45em] size-2 shrink-0 rounded-full" />
                <span>
                  Su WhatsApp está publicado, pero este lead no permite WhatsApp: nunca pidió que lo
                  contactaras. Puedes llamarlo o escribirle un correo.
                </span>
              </p>
            )}
        </div>
      )}
    </BentoTile>
  );
}

function mono(value: string | null) {
  return value === null ? null : <span className="font-mono text-xs">{value}</span>;
}

/** El valor de un campo de `attributes` ({value, source, …}) o de uno plano. */
function attributeValue(attributes: unknown, key: string): string | null {
  if (typeof attributes !== "object" || attributes === null) return null;
  const raw = (attributes as Record<string, unknown>)[key];
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && typeof (raw as { value?: unknown }).value === "string") {
    return (raw as { value: string }).value;
  }
  return null;
}

function capitalize(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
