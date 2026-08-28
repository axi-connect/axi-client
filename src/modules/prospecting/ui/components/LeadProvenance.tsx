"use client";

import type { LeadDetailDTO } from "../../domain/lead";

/** Un dato del lead con su procedencia declarada. */
interface Field {
  label: string;
  value: string | null;
  /** De dónde salió: es la columna que ningún raspador del mercado conserva. */
  source: string;
  mono?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ads: "Formulario",
  ctwa: "Anuncio",
  manual: "Cargado a mano",
  rues: "RUES",
  google_places: "Google Maps",
  apollo: "Apollo",
  web: "Sitio web",
};

interface AttributeEntry {
  value?: unknown;
  source?: unknown;
}

/**
 * Los datos del lead, cada uno con de dónde salió.
 *
 * La columna de la derecha es la razón de ser de esta pantalla. Un raspador
 * entrega una lista y ahí termina; poder responder «¿de dónde sacaste que tiene
 * 12 empleados?» es lo que hace defendible el dato ante una reclamación de
 * habeas data, y lo que permite decidir a cuál creerle cuando dos fuentes se
 * contradicen.
 */
export function LeadProvenance({ lead }: { lead: LeadDetailDTO }) {
  const base: Field[] = [
    { label: "Nombre", value: lead.display_name, source: lead.source },
    { label: "Razón social", value: lead.legal_name, source: "rues" },
    { label: "Correo", value: lead.email, source: lead.source, mono: true },
    { label: "Teléfono", value: lead.phone, source: lead.source, mono: true },
    {
      label: "Sitio web",
      value: lead.website,
      source: lead.source,
      mono: true,
    },
    { label: "Ciudad", value: lead.city, source: lead.source },
    { label: "Categoría", value: lead.category, source: lead.source },
  ].filter((field) => field.value !== null);

  const extra = readAttributes(lead.attributes);

  return (
    <div>
      <p className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-wider uppercase">
        Datos y de dónde salió cada uno
      </p>
      <dl className="divide-border-soft divide-y">
        {[...base, ...extra].map((field) => (
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
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]">
              {SOURCE_LABELS[field.source] ?? field.source}
            </span>
          </div>
        ))}
      </dl>
      {base.length === 0 && extra.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Este lead todavía no tiene datos.
        </p>
      )}
    </div>
  );
}

/**
 * `attributes` es un mapa `{campo: {value, source, confidence, fetched_at}}`.
 * Se lee defensivamente: un proveedor que devuelva otra forma no puede romper
 * la pantalla del lead.
 */
function readAttributes(raw: unknown): Field[] {
  if (typeof raw !== "object" || raw === null) return [];
  return Object.entries(raw as Record<string, unknown>).flatMap(
    ([label, entry]) => {
      if (typeof entry !== "object" || entry === null) return [];
      const { value, source } = entry as AttributeEntry;
      if (value === null || value === undefined) return [];
      return [
        {
          label,
          value: String(value),
          source: typeof source === "string" ? source : "desconocido",
        },
      ];
    },
  );
}
