import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

export type LeadDTO = Schemas["LeadsListDto"]["data"][number];
export type LeadDetailDTO = Schemas["LeadDetailDto"];
export type LeadEventDTO = LeadDetailDTO["events"][number];
export type EnrichmentRunDTO = NonNullable<LeadDetailDTO["last_run"]>;
export type RunStepDTO = EnrichmentRunDTO["steps"][number];
export type RunStepState = RunStepDTO["state"];

/**
 * Qué hizo cada fuente, en español y sin eufemismos.
 *
 * `no_data` NO es un fallo: preguntamos y esa fuente no sabía nada, que es un
 * desenlace legítimo y frecuente. Llamarlo «error» empujaría a reintentar algo
 * que va a volver a no saber.
 */
export const RUN_STEP_LABELS: Record<RunStepState, string> = {
  pending: "En espera",
  running: "Consultando…",
  found: "Encontró datos",
  no_data: "Nada que aportar",
  failed: "No respondió",
  no_account: "Sin cuenta configurada",
  // Los dos «no se preguntó». Existen porque el backend saltaba estas fuentes
  // en silencio y sus pasos se quedaban en «En espera» para siempre: una
  // pasada ya cerrada seguía diciendo que Google Maps estaba trabajando, y el
  // titular la descontaba de la cuenta de fuentes consultadas.
  skipped_paid: "No se consultó",
  skipped_fresh: "Ya la habíamos consultado",
};

/**
 * Qué se le iba a preguntar, cuando no hay ninguna fuente que lo atienda.
 *
 * Un paso sin proveedor ya no finge tener uno: el backend mandaba la capacidad
 * en el campo `provider` y el visor imprimía literalmente «enrich_person», un
 * identificador en inglés, en la lista de fuentes del lead. La redacción es la
 * del dueño del negocio, no la del catálogo del operador: aquí se lee «qué me
 * falta», no «qué capacidad no tengo contratada».
 */
export const RUN_CAPABILITY_LABELS: Record<string, string> = {
  verify_email: "Verificación de correo",
  verify_phone: "Verificación de teléfono",
  identity_lookup: "Registro mercantil",
  enrich_person: "Datos de personas",
  enrich_company: "Datos de empresas",
  extract_site: "Su sitio web",
  geocode: "Ubicación en el mapa",
};

/** El estado de la pasada entera. `partial` importa: algo llegó y algo falló. */
export const RUN_STATUS_LABELS: Record<EnrichmentRunDTO["status"], string> = {
  queued: "En cola",
  running: "Buscando datos",
  completed: "Terminada",
  partial: "Terminada con fallos",
  failed: "No se pudo completar",
};

/** ¿Esta pasada sigue viva? Decide si hay que seguir escuchando. */
export function isRunInFlight(run: EnrichmentRunDTO | null): boolean {
  return run !== null && (run.status === "queued" || run.status === "running");
}
export type ProspectingStatsDTO = Schemas["ProspectingStatsDto"];
export type PromoteResultDTO = Schemas["PromoteResultDto"];
export type IcpDTO = Schemas["IcpDto"];
export type IcpDefinitionDTO = IcpDTO["definition"];
export type AxisWeightsDTO = IcpDTO["weights"];
export type QualitySummaryDTO = Schemas["QualitySummaryDto"];

export type LeadStatus = LeadDTO["status"];
export type LeadSource = LeadDTO["source"];
export type QualityStatus = LeadDTO["quality_status"];
export type LegalBasis = LeadDTO["legal_basis"];
export type OutreachChannel = LeadDTO["allowed_channels"][number];

/**
 * De dónde salió el lead, en el idioma del dueño del negocio. «Meta Lead Ads»
 * no significa nada para quien vende dotación de restaurantes.
 */
export const SOURCE_LABELS: Record<LeadSource, string> = {
  ctwa: "Click-to-WhatsApp",
  meta_lead_ads: "Formulario de anuncio",
  manual: "Cargado a mano",
  google_places: "Google Maps",
  openstreetmap: "OpenStreetMap",
  serp: "Buscador web",
};

/**
 * `rejected` y `discarded` decían los dos «Descartado», que es un estado con
 * ruido: quien mira la bandeja no podía saber si lo tiró una persona o si su
 * propio cliente ideal lo vetó — y la respuesta cambia qué hacer (revisar el
 * ICP frente a no hacer nada). Desde F4 el descubrimiento escribe `rejected`,
 * así que la distinción por fin significa algo.
 */
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  enriching: "Buscando datos",
  qualified: "Calificado",
  rejected: "Fuera de tu cliente ideal",
  promoted: "En el CRM",
  discarded: "Descartado",
  suppressed: "No contactar",
};

export const QUALITY_LABELS: Record<QualityStatus, string> = {
  unverified: "Sin verificar",
  verified: "Verificado",
  risky: "Con riesgo",
  invalid: "Inválido",
  suppressed: "No contactar",
};

/**
 * Con qué derecho tenemos el dato. Se muestra al usuario porque es lo que
 * explica por qué un lead no permite WhatsApp: sin esta etiqueta, el icono
 * tachado parece un error del sistema en vez de una decisión.
 */
/**
 * De dónde salió UN DATO, que no es lo mismo que de dónde salió el lead.
 *
 * `LeadSource` dice cómo entró el lead a la cuarentena; esto dice qué proveedor
 * trajo cada campo, y son ejes distintos: un lead de OpenStreetMap puede tener
 * el NIT de RUES y el correo de su propia web.
 *
 * Vivía duplicado y a medias dentro de `LeadProvenance` —le faltaban dos
 * fuentes reales y tenía dos que no existen—, así que sube aquí, que es donde
 * el resto del módulo mira. Sin traducción cae al identificador crudo, que es
 * feo pero honesto: mejor «firecrawl» que inventarse un nombre.
 */
export const PROVIDER_LABELS: Record<string, string> = {
  // Cómo entró el lead
  ctwa: "Anuncio de WhatsApp",
  meta_lead_ads: "Formulario de anuncio",
  manual: "Cargado a mano",
  openstreetmap: "OpenStreetMap",
  google_places: "Google Maps",
  serp: "Buscador web",
  // Quién completó el dato
  nominatim: "OpenStreetMap",
  overpass: "OpenStreetMap",
  rues: "RUES",
  site_extractor: "Su sitio web",
  firecrawl: "Su sitio web",
  serper: "Buscador web",
  millionverifier: "Verificador de correo",
  twilio_lookup: "Verificador de teléfono",
  apollo: "Apollo",
};

/**
 * Las claves crudas de `attributes`, en español.
 *
 * El backend guarda `{campo: {value, source, confidence, fetched_at}}` con la
 * clave técnica, así que sin esto la ficha enseña literalmente
 * «social_instagram» como etiqueta de una fila.
 */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  address: "Dirección",
  city: "Ciudad",
  country: "País",
  domain: "Dominio",
  email: "Correo",
  phone: "Teléfono",
  website: "Sitio web",
  legal_name: "Razón social",
  tax_id: "NIT",
  category: "Categoría",
  latitude: "Latitud",
  longitude: "Longitud",
  social_instagram: "Instagram",
  social_facebook: "Facebook",
  social_linkedin: "LinkedIn",
  social_tiktok: "TikTok",
  social_whatsapp: "WhatsApp",
};

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  consent_form: "Llenó un formulario",
  consent_ad: "Escribió desde un anuncio",
  public_business_data: "Dato público de empresa",
  referral: "Referido",
  unknown: "Origen sin confirmar",
};

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Correo",
  manual: "Llamada o trabajo manual",
};

/** El orden en que se pintan los canales: siempre el mismo, permitido o no. */
export const CHANNEL_ORDER: OutreachChannel[] = ["whatsapp", "email", "manual"];

/**
 * En qué situación está un canal para ESTE lead.
 *
 * - `usable`: hay permiso y hay a quién escribir.
 * - `blocked`: la base legal no lo autoriza.
 * - `no_data`: se podría, pero no tenemos el dato.
 */
export type ChannelState = "usable" | "blocked" | "no_data";

export interface ChannelVerdict {
  state: ChannelState;
  /** Qué pasa y qué hacer. Vacío cuando el canal es usable. */
  reason: string | null;
}

/** Lo mínimo que hay que saber de un lead para juzgar sus canales. */
export interface ChannelSubject {
  allowed_channels: readonly OutreachChannel[];
  legal_basis: LegalBasis;
  email: string | null;
  phone: string | null;
}

/**
 * PERMISO Y POSESIÓN SON DOS COSAS, y esta función cruza las dos.
 *
 * `allowed_channels` sale ÚNICAMENTE de la base legal: dice con qué derecho
 * podríamos escribir, no si tenemos a dónde. Durante un tiempo la bandeja pintó
 * el correo en verde para leads sin correo porque leía solo la primera mitad —
 * la columna se llama «Puedo contactar por» y estaba respondiendo a otra
 * pregunta.
 *
 * Son TRES estados y no dos porque cada uno se arregla distinto: lo bloqueado
 * por la ley no se arregla, y lo que falta por no tener el dato se arregla
 * enriqueciendo. Fundirlos en «no se puede» borraría justo lo accionable.
 */
export function channelVerdict(
  lead: ChannelSubject,
  channel: OutreachChannel,
): ChannelVerdict {
  if (!lead.allowed_channels.includes(channel)) {
    return { state: "blocked", reason: whyChannelBlocked(lead.legal_basis, channel) };
  }

  const missing = whatIsMissing(lead, channel);
  if (missing !== null) return { state: "no_data", reason: missing };

  return { state: "usable", reason: null };
}

/** El permiso existe, pero ¿hay a dónde escribir? `manual` siempre lo hay. */
function whatIsMissing(lead: ChannelSubject, channel: OutreachChannel): string | null {
  if (channel === "email" && lead.email === null) {
    return "Tienes permiso para escribirle por correo, pero todavía no sabemos cuál es. Enriquece el lead para conseguirlo.";
  }
  if (channel === "whatsapp" && lead.phone === null) {
    return "Tienes permiso para escribirle por WhatsApp, pero no tenemos su teléfono. Enriquece el lead para conseguirlo.";
  }
  // `manual` no necesita un dato: es una persona de tu equipo decidiendo qué
  // hacer con lo que haya.
  return null;
}

/** Por qué la base legal no autoriza este canal. */
function whyChannelBlocked(legalBasis: LegalBasis, channel: OutreachChannel): string {
  if (channel === "whatsapp") {
    return "WhatsApp solo se puede usar con quien dio permiso: escribir primero a un dato público hace que Meta suspenda tu número.";
  }
  if (legalBasis === "unknown") {
    return "No sabemos de dónde salió este dato, así que solo se puede trabajar a mano.";
  }
  return "Este canal no está permitido con el permiso que tenemos sobre el dato.";
}

/** Solo desde estos estados tiene sentido ofrecer «Promover». */
export function canPromote(lead: Pick<LeadDTO, "status">): boolean {
  return (
    lead.status === "new" ||
    lead.status === "enriching" ||
    lead.status === "qualified"
  );
}

/**
 * A quién tiene sentido buscarle datos.
 *
 * Más ancho que `canPromote`: a un lead rechazado por el cliente ideal o ya
 * descartado se le puede seguir completando la ficha —el dato sirve para
 * decidir si el veto fue justo—. Lo único inútil es pedir datos de alguien que
 * ya es un contacto del CRM, o de quien pidió que no lo contactaran.
 */
export function canEnrich(lead: Pick<LeadDTO, "status">): boolean {
  return lead.status !== "promoted" && lead.status !== "suppressed";
}

export function canDiscard(lead: Pick<LeadDTO, "status">): boolean {
  return lead.status !== "promoted" && lead.status !== "discarded";
}

/**
 * ¿Se puede BORRAR de verdad?
 *
 * Todo menos los que ya son contactos del CRM: ahí el backend responde 409
 * («ya es un contacto: bórralo desde el CRM»), porque borrar el lead dejaría al
 * contacto sin su procedencia. Se comprueba aquí para que la casilla salga
 * DESHABILITADA en vez de ofrecerse y fallar después — un control que solo falla
 * al pulsarlo es un control que miente.
 *
 * Es más ancho que `canDiscard`: descartar es una decisión reversible sobre el
 * ciclo de vida, y borrar no tiene marcha atrás, así que un descartado sí se
 * puede borrar.
 */
export function canDelete(lead: Pick<LeadDTO, "status">): boolean {
  return lead.status !== "promoted";
}

/** Nombre presentable: un lead puede no tener ninguno de los dos. */
export function leadDisplayName(
  lead: Pick<LeadDTO, "display_name" | "legal_name" | "email" | "phone">,
): string {
  return (
    lead.display_name ??
    lead.legal_name ??
    lead.email ??
    lead.phone ??
    "Sin nombre"
  );
}

/**
 * Los cuatro ejes del índice de calidad, leídos de `quality_signals`.
 *
 * F2 los calcula; hasta entonces el objeto llega vacío y esto devuelve la
 * estructura con ceros, que es lo que permite que la UI del detalle ya exista
 * sin fingir datos que nadie midió.
 */
export const QUALITY_AXES = [
  {
    key: "contactability",
    label: "Contactabilidad",
    question: "¿puedo hablarle?",
  },
  { key: "identity", label: "Identidad", question: "¿existe y es quien dice?" },
  {
    key: "fit",
    label: "Ajuste a tu cliente ideal",
    question: "¿me sirve a mí?",
  },
  { key: "provenance", label: "Procedencia", question: "¿me fío del dato?" },
] as const;

export type QualityAxisKey = (typeof QUALITY_AXES)[number]["key"];

export interface QualityAxisScore {
  key: QualityAxisKey;
  label: string;
  question: string;
  score: number;
  /** El PESO del eje, que lo pone el tenant. No es 25 para todos. */
  max: number;
  /** ¿Se pudo medir algo de este eje? */
  measured: boolean;
}

/**
 * El techo de un eje NO es fijo, y darlo por 25 era un bug con dos caras.
 *
 * Los pesos por defecto son `contactability: 25`, `identity: 20`, `fit: 35`,
 * `provenance: 20`, **y el tenant los edita**. Con 25 a pelo, `fit` se recortaba
 * de 35 a 25 —un encaje perfecto salía truncado— e `identity` y `provenance`
 * sobre-informaban sobre 25 cuando su máximo es 20.
 *
 * El backend YA escribe el máximo de cada eje en `quality_signals.evaluable`
 * (es el peso del eje), así que no hace falta nada nuevo del servidor: se lee de
 * ahí. `FALLBACK_AXIS_MAX` solo cubre las filas viejas puntuadas antes de que
 * `evaluable` existiera; en cuanto se repuntúan, sobra.
 *
 * Y de regalo, `evaluable === 0` es lo único que el frontend no podía decir
 * hasta ahora: «este eje no se pudo medir», que es exactamente lo que significa
 * la invariante F2-D1 —una señal no medida no baja la nota, sale del
 * denominador—.
 */
const FALLBACK_AXIS_MAX = 25;

export function readQualityAxes(signals: unknown): QualityAxisScore[] {
  const record =
    typeof signals === "object" && signals !== null
      ? (signals as Record<string, unknown>)
      : {};
  const axes =
    typeof record.axes === "object" && record.axes !== null
      ? (record.axes as Record<string, unknown>)
      : {};
  return QUALITY_AXES.map((axis) => {
    const max = readAxisEvaluable(signals, axis.key) || FALLBACK_AXIS_MAX;
    return {
      key: axis.key,
      label: axis.label,
      question: axis.question,
      score: clampScore(axes[axis.key], max),
      max,
      /** `false` = nadie lo pudo medir. La barra va vacía y lo dice. */
      measured: readAxisEvaluable(signals, axis.key) > 0,
    };
  });
}

/** ¿Ya hay algo medido, o el índice todavía no lo ha tocado nadie? */
export function hasQualitySignals(signals: unknown): boolean {
  return readQualityAxes(signals).some((axis) => axis.score > 0);
}

function clampScore(raw: unknown, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.min(max, Math.max(0, Math.round(raw)));
}

/**
 * Semáforo de la CALIDAD DEL DATO. Es un eje semántico —verde/ámbar/rojo— y
 * por eso no usa el coral de marca: aquí el rojo significa «no sirve», no
 * «acción». Deliberadamente separado de los canales permitidos, que no son un
 * estado sino un permiso.
 */
export const QUALITY_STATUS_MAP: StatusMap = {
  verified: { label: "Verificado", tone: "success" },
  risky: { label: "Con riesgo", tone: "warning" },
  invalid: { label: "Inválido", tone: "destructive" },
  unverified: { label: "Sin verificar", tone: "neutral" },
  suppressed: { label: "No contactar", tone: "destructive" },
};

/** Semáforo del estado del lead dentro del embudo. */
export const LEAD_STATUS_MAP: StatusMap = {
  new: { label: "Nuevo", tone: "info" },
  enriching: { label: "Buscando datos", tone: "info", transient: true },
  qualified: { label: "Calificado", tone: "success" },
  promoted: { label: "En el CRM", tone: "success" },
  rejected: { label: "Fuera de tu cliente ideal", tone: "neutral" },
  discarded: { label: "Descartado", tone: "neutral" },
  suppressed: { label: "No contactar", tone: "destructive" },
};

/**
 * Fila plana de la bandeja. `DataTable` exige primitivos, así que el desglose
 * del índice y los permisos se aplanan AQUÍ y no en las celdas — el mismo
 * criterio que `mapContactToRow` del CRM: la vista pinta, no traduce.
 */
export type LeadRow = {
  id: string;
  name: string;
  contact_line: string;
  source: LeadSource;
  quality_status: QualityStatus;
  quality_score: number;
  measured: boolean;
  axis_contactability: number;
  axis_identity: number;
  axis_fit: number;
  axis_provenance: number;
  legal_basis: LegalBasis;
  allows_whatsapp: boolean;
  allows_email: boolean;
  allows_manual: boolean;
  /**
   * Si TENEMOS el dato, que es distinto de si podemos usarlo. Se aplanan
   * aparte porque `contact_line` los funde en un string y la celda de canales
   * necesita saber cuál de los dos falta.
   */
  has_email: boolean;
  has_phone: boolean;
  /**
   * Cuántos de los cinco datos, contado por POSTGRES.
   *
   * Antes se derivaba aquí de cinco booleanos, y uno de ellos —«tiene web»—
   * miraba solo `website` e ignoraba `domain`, que es como el mismo lead
   * acababa contando distinto en la bandeja y en la puerta de admisión.
   */
  data_count: number;
  status: LeadStatus;
  city: string | null;
  created_at: string;
  /**
   * Cuándo se INTENTÓ buscarle datos por última vez, no cuándo se encontraron
   * (C-D3 del backend). Es la señal con la que la bandeja cierra el «buscando
   * datos»: una pasada que no halla nada la mueve igual, y sin ella una fila
   * se quedaba girando hasta rendirse a los 90 s.
   */
  enriched_at: string | null;
};

export function mapLeadToRow(lead: LeadDTO): LeadRow {
  const axes = readQualityAxes(lead.quality_signals);
  const by = (key: QualityAxisKey) =>
    axes.find((axis) => axis.key === key)?.score ?? 0;
  return {
    id: lead.id,
    name: leadDisplayName(lead),
    contact_line: [lead.phone, lead.email].filter(Boolean).join(" · "),
    source: lead.source,
    quality_status: lead.quality_status,
    quality_score: lead.quality_score,
    measured: hasQualitySignals(lead.quality_signals),
    axis_contactability: by("contactability"),
    axis_identity: by("identity"),
    axis_fit: by("fit"),
    axis_provenance: by("provenance"),
    legal_basis: lead.legal_basis,
    allows_whatsapp: lead.allowed_channels.includes("whatsapp"),
    allows_email: lead.allowed_channels.includes("email"),
    allows_manual: lead.allowed_channels.includes("manual"),
    // Del vocabulario del SERVIDOR y no de las columnas: `data_present` cuenta
    // «web» si hay `website` o `domain`, que es lo que hace la admisión.
    // Derivarlo aquí de `lead.website` era la divergencia.
    has_email: lead.data_present.includes("email"),
    has_phone: lead.data_present.includes("phone"),
    data_count: lead.data_count,
    status: lead.status,
    city: lead.city,
    created_at: lead.created_at,
    enriched_at: lead.last_enriched_at,
  };
}

/** Los canales permitidos reconstruidos desde la fila plana. */
export function rowChannelSubject(row: LeadRow): ChannelSubject {
  return {
    allowed_channels: rowAllowedChannels(row),
    legal_basis: row.legal_basis,
    // La fila no guarda los valores, solo si existen. Para juzgar el canal
    // basta con eso, y así el aplanado no arrastra PII que la tabla no pinta.
    email: row.has_email ? "" : null,
    phone: row.has_phone ? "" : null,
  };
}

/**
 * Las redes de un lead, listas para pintar.
 *
 * Lectura defensiva porque `socials` llega como `unknown` del backend y puede
 * ser `null`, `{}` o traer una clave con valor vacío. La allowlist es la misma
 * que aplica el servidor al escribir: lo que se renderiza como enlace no puede
 * salir de una clave que nadie decidió.
 */
export const SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "whatsapp",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export interface LeadSocial {
  network: SocialNetwork;
  url: string;
}

export function readSocials(socials: unknown): LeadSocial[] {
  if (typeof socials !== "object" || socials === null) return [];
  const raw = socials as Record<string, unknown>;
  return SOCIAL_NETWORKS.flatMap((network) => {
    const url = raw[network];
    if (typeof url !== "string" || url.trim().length === 0) return [];
    return [{ network, url: url.trim() }];
  });
}

/**
 * Cuántos de los datos clave conocemos, y cuáles.
 *
 * **Lo cuenta POSTGRES, en dos columnas generadas.** Antes se contaba aquí, y
 * la misma regla vivía en tres sitios: este fichero, `countData` del backend y
 * la expresión que juzga la admisión. Ya habían divergido en producción —el
 * backend contaba `website ?? domain` y el cliente solo `website`, así que un
 * lead con dominio y sin web era ADMITIDO por una búsqueda de «3 datos mínimo»
 * y luego la bandeja lo enseñaba como «2 de 5»—. Tres copias convergen en una
 * por ELIMINACIÓN, que es la única convergencia que se queda convergida.
 *
 * **No es calidad, y por eso vive aparte del índice.** Un lead puede tener los
 * cinco datos y seguir sin permiso de WhatsApp; y uno con dos datos verificados
 * puntúa más que uno con cinco sin verificar. Cuenta lo que se sabe, nada más.
 */
export const DATA_FIELDS = 5;

/** El conteo del servidor, tal como viaja. Ya no se calcula: se lee. */
export function dataCompleteness(lead: { data_count: number }): {
  filled: number;
  total: number;
} {
  return { filled: lead.data_count, total: DATA_FIELDS };
}

/**
 * ¿Este lead tiene ESTE dato?
 *
 * Contra `data_present`, que habla el vocabulario de la admisión. Es lo que
 * permite que la ficha y el filtro digan lo mismo: antes la ficha derivaba
 * «tiene web» de la columna `website` e ignoraba `domain`.
 */
export function hasData(lead: { data_present: string[] }, field: string): boolean {
  return lead.data_present.includes(field);
}

export function rowAllowedChannels(row: LeadRow): OutreachChannel[] {
  const allowed: OutreachChannel[] = [];
  if (row.allows_whatsapp) allowed.push("whatsapp");
  if (row.allows_email) allowed.push("email");
  if (row.allows_manual) allowed.push("manual");
  return allowed;
}

/** Una señal del índice, tal como la guarda el backend en `quality_signals`. */
export interface QualityCheck {
  key: string;
  axis: QualityAxisKey;
  outcome: "pass" | "fail" | "warn" | "unknown";
  evidence: string;
}

/**
 * Las señales con su evidencia, agrupadas por eje.
 *
 * Las `unknown` se conservan y se muestran aparte: son la respuesta a «¿por qué
 * este lead tiene 74 y no 90?» cuando el motivo no es que algo falle sino que
 * nadie lo ha medido todavía. Ocultarlas haría que el puntaje pareciera
 * arbitrario.
 */
export function readQualityChecks(signals: unknown): QualityCheck[] {
  const record =
    typeof signals === "object" && signals !== null
      ? (signals as Record<string, unknown>)
      : {};
  const raw = record.checks;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { key, axis, outcome, evidence } = entry as Record<string, unknown>;
    if (typeof key !== "string" || typeof evidence !== "string") return [];
    if (!QUALITY_AXES.some((known) => known.key === axis)) return [];
    if (
      outcome !== "pass" &&
      outcome !== "fail" &&
      outcome !== "warn" &&
      outcome !== "unknown"
    ) {
      return [];
    }
    return [{ key, axis: axis as QualityAxisKey, outcome, evidence }];
  });
}

export function checksByAxis(
  checks: QualityCheck[],
  axis: QualityAxisKey,
): QualityCheck[] {
  return checks.filter((check) => check.axis === axis);
}

/**
 * Cuántos puntos del eje se pudieron medir. Viene del backend porque es lo que
 * permite decir «21 de 25 medidos» en vez de fingir que se evaluó todo.
 */
export function readAxisEvaluable(
  signals: unknown,
  axis: QualityAxisKey,
): number {
  const record =
    typeof signals === "object" && signals !== null
      ? (signals as Record<string, unknown>)
      : {};
  const evaluable =
    typeof record.evaluable === "object" && record.evaluable !== null
      ? (record.evaluable as Record<string, unknown>)
      : {};
  const value = evaluable[axis];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : 0;
}
