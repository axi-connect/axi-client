import {
  countActive,
  serializeFilters,
  type FilterOption,
  type FilterSchema,
  type FilterValues,
} from "@/shared/components/features/filter-panel";

import {
  ADMISSION_DATA_FIELDS,
  REQUIRABLE_LABELS,
  REQUIRABLE_ORDER,
  SCORE_CEILINGS,
  SCORE_STEPS,
} from "../../domain/criteria";
import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  LEGAL_BASIS_LABELS,
  QUALITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "../../domain/lead";
import type { ListLeadsParams } from "../../infrastructure/services/prospecting-service.adapter";
import { SOURCE_DOTS } from "./leads.config";

/**
 * Los filtros de la bandeja, declarados como DATOS.
 *
 * **Las opciones se generan recorriendo los diccionarios de etiquetas, y ahí
 * muere el bug que motivó todo esto.** Los tres desplegables anteriores tenían
 * sus `<SelectItem>` escritos a mano dentro del JSX: el de orígenes listaba tres
 * de los seis y le faltaban `google_places`, `openstreetmap` y `serp` —o sea
 * TODOS los que produce una búsqueda, que son la mayoría de la bandeja—, y al de
 * estados le faltaban tres más. Nadie lo vio porque una opción que no existe no
 * da error: simplemente no se puede pedir.
 *
 * Generándolas del `Record<Enum, string>`, que el compilador ya vigila contra el
 * enum del contrato, añadir un origen en el backend rompe la compilación aquí
 * hasta que se le dé etiqueta. Y hay un test que cuenta las opciones.
 *
 * **`GET /prospecting/sources` NO sirve para esto**, aunque lo parezca: devuelve
 * solo las tres fuentes BUSCABLES y se deja fuera `ctwa`, `meta_lead_ads` y
 * `manual`.
 */

/** Las claves del borrador. Son las del backend, no unas propias. */
export const LEAD_FILTER_KEYS = {
  require: "require",
  requireMode: "require_mode",
  minData: "min_data",
  minScore: "min_score",
  maxScore: "max_score",
  qualityStatus: "quality_status",
  source: "source",
  status: "status",
  legalBasis: "legal_basis",
  allows: "allows",
  city: "city",
  created: "created",
} as const;

/**
 * Los estados que se PUEDEN pedir.
 *
 * `enriching` queda fuera y no es un olvido: es un lead que la puerta de
 * admisión todavía no ha juzgado, nace invisible y el backend lo excluye de la
 * bandeja. Ofrecerlo sería un filtro que siempre devuelve vacío.
 */
const HIDDEN_STATUSES = new Set<LeadStatus>(["enriching"]);

const option = (value: string, label: string, dot?: string): FilterOption => ({
  value,
  label,
  ...(dot === undefined ? {} : { dotClassName: dot }),
});

export const LEAD_FILTERS: FilterSchema = {
  sections: [
    { id: "data", title: "Datos que debe tener" },
    { id: "quality", title: "Calidad" },
    { id: "origin", title: "Origen y estado" },
    { id: "where", title: "Dónde y cuándo" },
  ],
  filters: [
    {
      kind: "flags",
      key: LEAD_FILTER_KEYS.require,
      section: "data",
      label: "Datos exigidos",
      description: "Los mismos que puede exigir una búsqueda, con las mismas palabras.",
      // El conmutador cuelga de la SECCIÓN de datos, no de cada opción.
      modeKey: LEAD_FILTER_KEYS.requireMode,
      modeLabels: { all: "Todos", any: "Al menos uno" },
      options: REQUIRABLE_ORDER.map((field) => option(field, REQUIRABLE_LABELS[field])),
    },
    {
      kind: "count",
      key: LEAD_FILTER_KEYS.minData,
      section: "data",
      label: "Cuántos datos conocemos",
      max: ADMISSION_DATA_FIELDS,
    },
    {
      kind: "steps",
      key: LEAD_FILTER_KEYS.minScore,
      section: "quality",
      label: "Índice de calidad, desde",
      description: "Pasos y no un deslizador: nadie distingue un 43 de un 47.",
      options: SCORE_STEPS.map((step) => ({ value: step.value, label: step.label })),
    },
    {
      kind: "steps",
      key: LEAD_FILTER_KEYS.maxScore,
      section: "quality",
      label: "Hasta",
      options: SCORE_CEILINGS.map((step) => ({ value: step.value, label: step.label })),
    },
    {
      kind: "multi",
      key: LEAD_FILTER_KEYS.qualityStatus,
      section: "quality",
      label: "Calidad del dato",
      options: Object.entries(QUALITY_LABELS).map(([value, label]) => option(value, label)),
      // El aviso aparece SOLO al pedirlo, no escondido en un tooltip.
      caution: (value) =>
        Array.isArray(value) && value.includes("risky")
          ? "«Con riesgo» son correos que rebotan o dominios que aceptan todo. Se pueden ver, pero escribirles quema tu reputación de envío."
          : null,
    },
    {
      kind: "multi",
      key: LEAD_FILTER_KEYS.source,
      section: "origin",
      label: "Origen",
      description: "Los seis: los de búsqueda son la mayoría de tu bandeja.",
      options: (Object.keys(SOURCE_LABELS) as LeadSource[]).map((source) =>
        option(source, SOURCE_LABELS[source], SOURCE_DOTS[source]),
      ),
    },
    {
      kind: "multi",
      key: LEAD_FILTER_KEYS.status,
      section: "origin",
      label: "Estado",
      options: (Object.keys(STATUS_LABELS) as LeadStatus[])
        .filter((status) => !HIDDEN_STATUSES.has(status))
        .map((status) => option(status, STATUS_LABELS[status])),
    },
    {
      kind: "multi",
      key: LEAD_FILTER_KEYS.legalBasis,
      section: "origin",
      label: "De dónde salió el permiso",
      options: Object.entries(LEGAL_BASIS_LABELS).map(([value, label]) => option(value, label)),
    },
    {
      kind: "single",
      key: LEAD_FILTER_KEYS.allows,
      section: "origin",
      label: "Puedo escribirle por",
      description: "Es permiso, no dato: un lead de mapa nace sin permiso de WhatsApp.",
      layout: "select",
      options: CHANNEL_ORDER.map((channel) => option(channel, CHANNEL_LABELS[channel])),
    },
    {
      kind: "text",
      key: LEAD_FILTER_KEYS.city,
      section: "where",
      label: "Ciudad",
      placeholder: "Bogotá",
    },
    {
      kind: "date",
      key: LEAD_FILTER_KEYS.created,
      section: "where",
      label: "Descubierto",
      mode: "range",
      // El backend los llama `created_after`/`created_before`, que son los
      // nombres que el CRM ya usaba. `paramName` los produce.
      paramName: "created",
    },
  ],
};

/**
 * Del borrador a los parámetros del listado.
 *
 * `serializeFilters` ya hace el trabajo —CSV para los multivalor, nada para un
 * interruptor en falso, `_after`/`_before` para las fechas—; esto solo estrecha
 * el tipo, porque `ListLeadsParams` es lo que la petición acepta.
 */
export function serializeLeadFilters(values: FilterValues): ListLeadsParams {
  return serializeFilters(LEAD_FILTERS, values) as ListLeadsParams;
}

/** Cuántos filtros hay puestos, para el contador del botón. */
export function countLeadFilters(values: FilterValues): number {
  return countActive(LEAD_FILTERS, values);
}
