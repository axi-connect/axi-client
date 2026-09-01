import type { Schemas } from "@/core/api/types";
import { ADMISSION_DATA_FIELDS, REQUIRABLE_LABELS } from "./criteria";
import type {
  StatusEntry,
  StatusMap,
} from "@/shared/components/features/status-badge/types";

export type SearchDTO = Schemas["SearchDto"];
export type SearchStatus = SearchDTO["status"];
export type SearchSource = SearchDTO["source"];
export type SourceCatalogItemDTO = Schemas["SourcesCatalogDto"]["items"][number];

/**
 * El semáforo de una búsqueda.
 *
 * `partial` es `warning` y no `success` a propósito: significa que lo que se
 * compró no se puede usar tal cual —la mayoría de los leads llegaron sin
 * teléfono ni correo— y pintarlo en verde le diría al dueño que ya tiene algo
 * cuando lo que tiene es una lista de nombres.
 */
export const SEARCH_STATUS_MAP: StatusMap = {
  queued: { label: "En cola", tone: "info", transient: true },
  running: { label: "Buscando", tone: "info", transient: true },
  completed: { label: "Terminada", tone: "success" },
  partial: { label: "Parcial", tone: "warning" },
  failed: { label: "Falló", tone: "destructive" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const SEARCH_SOURCE_LABELS: Record<SearchSource, string> = {
  google_places: "Google Maps",
  openstreetmap: "OpenStreetMap",
  serp: "Buscador web",
};

/** Mientras esté en vuelo hay que seguirla: por WS y, de respaldo, por polling. */
export function isInFlight(search: SearchDTO): boolean {
  return search.status === "queued" || search.status === "running";
}

/**
 * Qué fracción lleva hecha, para la barra.
 *
 * Contra el TOPE que puso el tenant, no contra el estimado del proveedor: el
 * tope es lo que él decidió gastar y es la única cifra que no se mueve a mitad
 * de la búsqueda. Una barra que retrocede porque el estimado subió es peor que
 * no tener barra.
 */
export function progressOf(search: SearchDTO): number {
  if (!isInFlight(search)) return 1;
  if (search.params.limit <= 0) return 0;
  // CON filtros el tope cuenta admitidos, así que la barra tiene que medir eso:
  // con la cuenta de encontrados, una búsqueda filtrada llegaría al 100 %
  // teniendo tres leads en la bandeja.
  const done = hasAdmission(search.params.admission) ? search.new_count : search.found_count;
  return Math.min(1, done / search.params.limit);
}

/**
 * La frase que resume una búsqueda terminada, en el idioma del dueño.
 *
 * Se escribe aquí y no en la vista porque es una REGLA: qué contar y en qué
 * orden. La vista pinta.
 */
export function summaryOf(search: SearchDTO): string {
  const gated = hasAdmission(search.params.admission);
  const parts = [
    gated
      ? // Con filtros, el número que importa es cuántos de los que pediste
        // llevas: «18 nuevos» no dice si va bien o va corta.
        `${search.new_count.toLocaleString("es-CO")} de ${search.params.limit.toLocaleString("es-CO")} admitidos`
      : `${search.new_count.toLocaleString("es-CO")} nuevos`,
  ];
  if (search.filtered_count > 0) {
    parts.push(`${search.filtered_count.toLocaleString("es-CO")} fuera del filtro`);
  }
  if (search.duplicate_count > 0) {
    parts.push(`${search.duplicate_count.toLocaleString("es-CO")} que ya tenías`);
  }
  if (search.rejected_count > 0) {
    parts.push(`${search.rejected_count.toLocaleString("es-CO")} fuera de tu cliente ideal`);
  }
  return parts.join(" · ");
}

/** Lo que costó, dicho como se cobra. Cero unidades es «gratis», no «0». */
export function costOf(search: SearchDTO): string {
  return search.units_spent === 0
    ? "gratis"
    : `${search.units_spent.toLocaleString("es-CO")} unidades`;
}

/**
 * Ojo con los dos contadores de rechazo, que NO son lo mismo:
 * `rejected_count` lo vetó el cliente ideal del tenant (una palabra excluida) y
 * el lead se guardó; `filtered_count` no pasó los criterios de ESTA búsqueda y
 * el lead no existe. Se dicen con palabras distintas a propósito.
 */

/** Los parámetros de una búsqueda, para re-lanzarla tal cual. */
export function paramsOf(search: SearchDTO) {
  return {
    source: search.source,
    label: search.label ?? undefined,
    text: search.params.text ?? undefined,
    category: search.params.category ?? undefined,
    city: search.params.city ?? undefined,
    zone: search.params.zone ?? undefined,
    country: search.params.country,
    // EL CENTRO. Faltaba, y no era cosmético: sin él «Repetir» relanzaba la
    // búsqueda sin zona — en OpenStreetMap eso significa sin área, o sea el país
    // entero, y en Google Maps sin nada que la acote.
    center: search.params.center ?? undefined,
    radius_m: search.params.radius_m ?? undefined,
    limit: search.params.limit,
    // Sin esto, «Repetir» perdería los filtros en silencio y traería el triple
    // de leads que la búsqueda original.
    admission: search.params.admission,
  };
}

/**
 * El aviso de una búsqueda: UNO, y su tono sale del mismo mapa que la insignia.
 *
 * Existe por un defecto que el dueño vio en pantalla: el mismo texto —«Se detuvo
 * por el fallo del 31/08: nadie pidió la página siguiente»— repetido dos veces y
 * con dos formatos, uno ámbar y otro rojo. La tarjeta tenía dos bloques
 * independientes: uno pintaba `error` si el estado era `partial` y el otro lo
 * pintaba otra vez si `error` no era nulo, así que una parcial CON motivo caía en
 * los dos. Y no era un caso raro: los dos barridos del backend cierran las
 * búsquedas abandonadas justo así, `partial` con `error`.
 *
 * El tono se lee de `SEARCH_STATUS_MAP`, que es el mismo `Record` que pinta la
 * insignia. Por construcción ya no puede pasar que la insignia diga «Parcial» en
 * ámbar y el motivo se pinte en rojo, que era la mitad de lo que se veía mal.
 */
export function searchNotice(
  search: SearchDTO,
): { text: string; tone: StatusEntry["tone"] } | null {
  if (search.error !== null && search.error.length > 0) {
    // El texto lo escribe el backend porque solo él sabe si paró por el techo de
    // gasto, por agotarse la zona o por el tope de páginas.
    return { text: search.error, tone: SEARCH_STATUS_MAP[search.status].tone };
  }
  if (search.status === "partial") {
    // El aviso honesto cuando nadie dejó motivo: sin esto el dueño cree que ya
    // tiene una lista con la que llamar a alguien.
    return {
      text: "La mayoría de estos negocios llegaron sin teléfono ni correo. Necesitan enriquecimiento para servir de algo.",
      tone: "warning",
    };
  }
  return null;
}

/** Lo que se le pregunta a la fuente, en una línea. */
export function queryOf(search: SearchDTO): string {
  const parts = [
    SEARCH_SOURCE_LABELS[search.source],
    search.params.category,
    search.params.text,
    // LA ZONA, y si no la hay la ciudad. Es lo que el dueño eligió en el mapa;
    // la ciudad es el municipio que se deduce de ella, y repetirla aquí haría
    // que la línea dijera «Bogotá» donde el dueño escribió «Zona G».
    search.params.zone ?? search.params.city,
  ].filter(Boolean);
  return parts.join(" · ");
}

export type DiscoveryCategoryDTO =
  Schemas["SourcesCatalogDto"]["categories"][number];
export type GeocodedPlaceDTO = Schemas["GeocodeResultsDto"]["items"][number];

/**
 * Radios que ofrece el formulario, en metros.
 *
 * Discretos y no un deslizador libre: el radio es la mitad de cuánto vas a
 * gastar, y una lista corta se compara de un vistazo con lo que el mapa enseña.
 */
export const SEARCH_RADII = [
  { value: 1_000, label: "1 km · unas cuadras" },
  { value: 3_000, label: "3 km · el barrio" },
  { value: 8_000, label: "8 km · la zona" },
  { value: 20_000, label: "20 km · la ciudad" },
] as const;

// ============================================================================
// Criterios de admisión
// ============================================================================

export type AdmissionDTO = SearchDTO["params"]["admission"];

/** Techos de gasto. Aparecen solo cuando el tope cuenta admitidos. */
export const RECORD_CEILINGS = [50, 100, 250, 500, 1_000] as const;

export const EMPTY_ADMISSION: AdmissionDTO = {
  min_score: null,
  min_data: null,
  require: [],
  verified_only: false,
  max_records: null,
};

/**
 * ¿Esta búsqueda exige algo?
 *
 * El techo de gasto NO cuenta: no rechaza a nadie, solo para de buscar. Si
 * contara, poner un techo cambiaría el significado del tope sin que el usuario
 * haya pedido ningún filtro.
 */
export function hasAdmission(admission: AdmissionDTO | undefined): boolean {
  if (admission === undefined) return false;
  return (
    admission.min_score != null ||
    admission.min_data != null ||
    (admission.require?.length ?? 0) > 0 ||
    admission.verified_only === true
  );
}

/**
 * Los criterios activos, como los chips del trigger plegado.
 *
 * Existe para que **el pliegue no esconda el estado**: un filtro activo detrás
 * de una sección cerrada es la forma más rápida de que alguien no entienda por
 * qué su búsqueda trajo cuatro leads.
 */
export function admissionChips(admission: AdmissionDTO | undefined): string[] {
  if (admission === undefined) return [];
  const chips: string[] = [];
  if (admission.min_score != null) chips.push(`calidad ≥ ${String(admission.min_score)}`);
  if (admission.min_data != null) {
    chips.push(`${String(admission.min_data)} de ${String(ADMISSION_DATA_FIELDS)} datos`);
  }
  for (const field of admission.require ?? []) chips.push(REQUIRABLE_LABELS[field]);
  if (admission.verified_only === true) chips.push("solo verificados");
  return chips;
}

/**
 * Lo que va a pasar, en una frase.
 *
 * Se escribe aquí y no en la vista porque es una REGLA de qué se dice y en qué
 * orden. Un filtro que el usuario no puede leer en llano es un filtro que va a
 * usar mal.
 */
export function admissionSentence(
  admission: AdmissionDTO,
  limit: number,
  categoryLabel: string,
): string {
  const demands: string[] = [];
  if (admission.min_score != null) {
    demands.push(`calidad ${String(admission.min_score)} o más`);
  }
  if (admission.min_data != null) {
    demands.push(
      `al menos ${String(admission.min_data)} de ${String(ADMISSION_DATA_FIELDS)} datos`,
    );
  }
  const required = admission.require ?? [];
  if (required.length > 0) {
    const names = required.map((field) => REQUIRABLE_LABELS[field]).join(", ");
    // «y entre ellos» y no «y además»: cuentan DENTRO de la cantidad de arriba.
    demands.push(admission.min_data != null ? `y entre ellos ${names}` : `${names}`);
  }
  if (admission.verified_only === true) demands.push("verificados");

  const what =
    demands.length === 0
      ? `Guardaré todos los ${categoryLabel.toLowerCase()} que encuentre.`
      : `Guardaré solo los ${categoryLabel.toLowerCase()} con ${joinDemands(demands)}.`;

  if (demands.length === 0) return what;

  const ceiling =
    admission.max_records == null
      ? ""
      : `, sin pasar de ${admission.max_records.toLocaleString("es-CO")} registros`;
  return `${what} Buscaré hasta encontrar ${limit.toLocaleString("es-CO")} así${ceiling}.`;
}

function joinDemands(demands: string[]): string {
  if (demands.length === 1) return demands[0];
  // El «y entre ellos …» ya trae su propia conjunción: no se le pone otra.
  const last = demands[demands.length - 1];
  const head = demands.slice(0, -1).join(", ");
  return last.startsWith("y ") ? `${head} ${last}` : `${head} y ${last}`;
}
