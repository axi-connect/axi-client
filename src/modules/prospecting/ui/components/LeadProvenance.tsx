"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { formatShortDate } from "@/core/lib/format";
import {
  ATTRIBUTE_LABELS,
  PROVIDER_LABELS,
  type LeadDetailDTO,
} from "../../domain/lead";

/** Un dato del lead con su procedencia declarada. */
interface Field {
  label: string;
  value: string | null;
  /** De dónde salió: es la columna que ningún raspador del mercado conserva. */
  source: string;
  /** Cuándo se trajo. El backend lo guarda y hasta ahora se tiraba. */
  fetchedAt?: string;
  mono?: boolean;
}

interface AttributeEntry {
  value?: unknown;
  source?: unknown;
  fetched_at?: unknown;
}

/** El mapa `{campo: {value, source, fetched_at}}`, ya leído. */
type Attributes = Record<string, AttributeEntry>;

/**
 * Los datos del lead, cada uno con de dónde salió.
 *
 * La columna de la derecha es la razón de ser de esta pantalla. Un raspador
 * entrega una lista y ahí termina; poder responder «¿de dónde sacaste que tiene
 * 12 empleados?» es lo que hace defendible el dato ante una reclamación de
 * habeas data, y lo que permite decidir a cuál creerle cuando dos fuentes se
 * contradicen.
 *
 * Hasta F4b esa columna **se inventaba**: la razón social decía siempre «RUES»
 * aunque nadie hubiera preguntado a RUES, y el resto de campos heredaba la
 * fuente del lead en vez de la del dato. Ahora sale de `attributes`, donde el
 * backend guarda el proveedor real de cada campo, y solo cae a la fuente del
 * lead cuando el dato entró con él.
 */
export function LeadProvenance({ lead }: { lead: LeadDetailDTO }) {
  const attributes = readAttributeMap(lead.attributes);

  /** La fuente del DATO si se conoce; si no, la del lead que lo trajo. */
  const from = (key: string): Pick<Field, "source" | "fetchedAt"> => {
    const entry = attributes[key];
    const source = typeof entry?.source === "string" ? entry.source : null;
    const fetchedAt =
      typeof entry?.fetched_at === "string" ? entry.fetched_at : undefined;
    return { source: source ?? lead.source, fetchedAt };
  };

  const base: Field[] = [
    { label: "Nombre", value: lead.display_name, ...from("display_name") },
    { label: "Razón social", value: lead.legal_name, ...from("legal_name") },
    { label: "NIT", value: lead.tax_id, mono: true, ...from("tax_id") },
    { label: "Correo", value: lead.email, mono: true, ...from("email") },
    { label: "Teléfono", value: lead.phone, mono: true, ...from("phone") },
    { label: "Sitio web", value: lead.website, mono: true, ...from("website") },
    { label: "Dirección", value: lead.address, ...from("address") },
    { label: "Ciudad", value: lead.city, ...from("city") },
    { label: "Categoría", value: lead.category, ...from("category") },
  ].filter((field) => field.value !== null);

  // Lo que el enriquecimiento trajo y no tiene columna propia: las redes, las
  // coordenadas, lo que traiga un proveedor nuevo mañana.
  const shown = new Set([
    "display_name",
    "legal_name",
    "tax_id",
    "email",
    "phone",
    "website",
    "address",
    "city",
    "category",
  ]);
  const extra = readExtras(attributes, shown);
  const fields = [...base, ...extra];

  if (fields.length === 0) {
    return (
      <div>
        <Heading />
        <p className="text-muted-foreground text-sm">
          Este lead todavía no tiene datos.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Heading />
      <dl className="divide-border-soft divide-y">
        {fields.map((field) => (
          <div
            key={field.label}
            className="grid grid-cols-[108px_1fr_auto] items-baseline gap-3 py-2"
          >
            <dt className="text-muted-foreground text-xs">{field.label}</dt>
            <dd
              className={`text-sm font-medium break-words ${field.mono ? "font-mono text-xs" : ""}`}
            >
              {field.value}
            </dd>
            <SourceBadge field={field} />
          </div>
        ))}
      </dl>
    </div>
  );
}

function Heading() {
  return (
    <p className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-wider uppercase">
      Datos y de dónde salió cada uno
    </p>
  );
}

/** La píldora de origen. Con fecha, lleva tooltip: cuándo importa tanto como quién. */
function SourceBadge({ field }: { field: Field }) {
  const label = PROVIDER_LABELS[field.source] ?? field.source;
  const badge = (
    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]">
      {label}
    </span>
  );
  if (field.fetchedAt === undefined) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>Traído el {formatShortDate(field.fetchedAt)}</TooltipContent>
    </Tooltip>
  );
}

/**
 * `attributes` es un mapa `{campo: {value, source, confidence, fetched_at}}`.
 * Se lee defensivamente: un proveedor que devuelva otra forma no puede romper
 * la pantalla del lead.
 */
function readAttributeMap(raw: unknown): Attributes {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Attributes = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entry === "object" && entry !== null) out[key] = entry as AttributeEntry;
  }
  return out;
}

/** Lo de `attributes` que no tiene ya su propia fila arriba. */
function readExtras(attributes: Attributes, shown: ReadonlySet<string>): Field[] {
  return Object.entries(attributes).flatMap(([key, entry]) => {
    if (shown.has(key)) return [];
    if (entry.value === null || entry.value === undefined) return [];
    return [
      {
        // Sin traducción cae a la clave cruda: fea, pero honesta. Inventarse un
        // nombre para un campo que no conocemos sería peor.
        label: ATTRIBUTE_LABELS[key] ?? key,
        value: String(entry.value),
        source: typeof entry.source === "string" ? entry.source : "desconocido",
        fetchedAt:
          typeof entry.fetched_at === "string" ? entry.fetched_at : undefined,
      },
    ];
  });
}
