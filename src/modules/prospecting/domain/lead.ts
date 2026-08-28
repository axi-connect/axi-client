import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

export type LeadDTO = Schemas["LeadsListDto"]["data"][number];
export type LeadDetailDTO = Schemas["LeadDetailDto"];
export type LeadEventDTO = LeadDetailDTO["events"][number];
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
 * Por qué NO se puede escribir por este canal. La UI necesita decirlo en el
 * tooltip: «no se puede» sin motivo se lee como un fallo.
 */
export function whyChannelBlocked(
  lead: {
    allowed_channels: readonly OutreachChannel[];
    legal_basis: LegalBasis;
  },
  channel: OutreachChannel,
): string | null {
  if (lead.allowed_channels.includes(channel)) return null;
  if (channel === "whatsapp") {
    return "WhatsApp solo se puede usar con quien dio permiso: escribir primero a un dato público hace que Meta suspenda tu número.";
  }
  if (lead.legal_basis === "unknown") {
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

export function canDiscard(lead: Pick<LeadDTO, "status">): boolean {
  return lead.status !== "promoted" && lead.status !== "discarded";
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
  max: number;
}

const AXIS_MAX = 25;

export function readQualityAxes(signals: unknown): QualityAxisScore[] {
  const record =
    typeof signals === "object" && signals !== null
      ? (signals as Record<string, unknown>)
      : {};
  const axes =
    typeof record.axes === "object" && record.axes !== null
      ? (record.axes as Record<string, unknown>)
      : {};
  return QUALITY_AXES.map((axis) => ({
    key: axis.key,
    label: axis.label,
    question: axis.question,
    score: clampScore(axes[axis.key]),
    max: AXIS_MAX,
  }));
}

/** ¿Ya hay algo medido, o el índice todavía no lo ha tocado nadie? */
export function hasQualitySignals(signals: unknown): boolean {
  return readQualityAxes(signals).some((axis) => axis.score > 0);
}

function clampScore(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.min(AXIS_MAX, Math.max(0, Math.round(raw)));
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
  status: LeadStatus;
  city: string | null;
  created_at: string;
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
    status: lead.status,
    city: lead.city,
    created_at: lead.created_at,
  };
}

/** Los canales permitidos reconstruidos desde la fila plana. */
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
