import type { Schemas } from "@/core/api/types";
import type {
  FormDefinitionDTO,
  FormFieldDTO,
  FormFlow,
} from "@/modules/forms/public";

/**
 * «Datos del cliente» (CRM F1): lo que el agente de IA, el equipo, una
 * importación o un formulario web han recopilado de un contacto, campo a
 * campo, con su origen, su estado de verificación y lo que queda por revisar.
 *
 * El backend proyecta `contact.custom_fields` + las columnas del Contact sobre
 * la definición de los formularios de captura (`/forms`) y devuelve UNA lista
 * plana: los campos definidos (con o sin valor) y los huérfanos (valor sin
 * campo que lo defina, `defined: false`). La UI solo agrupa y pinta.
 *
 * Todo deriva del contrato generado (`GET /crm/contacts/{id}/data`): si el
 * backend cambia el wire, rompe aquí en compilación y no en la ficha.
 */

export type ContactDataDTO = Schemas["ContactDataDto"];
export type ContactDataField = ContactDataDTO["fields"][number];
export type FieldScalar = NonNullable<ContactDataField["value"]>;
export type ContactFieldState = ContactDataField["state"];
export type ContactFieldSource = NonNullable<ContactDataField["source"]>;
/** Mismo enum cerrado que `FormFlow`. */
export type ContactDataFlow = NonNullable<ContactDataField["flow"]>;
export type ContactFieldType = NonNullable<ContactDataField["type"]>;
/** Valor que el agente quiso escribir sobre un campo protegido. */
export type ContactFieldProposal = NonNullable<ContactDataField["proposal"]>;
export type ContactDataConversation = NonNullable<ContactDataDTO["conversation"]>;
/**
 * `order_draft` es el carrito de la conversación (`draft_id`), NO un pedido:
 * no tiene ruta propia. `last_order` sí (`/orders/{order_id}`).
 */
export type ContactDataSession = ContactDataDTO["session"];

/**
 * Body del `PATCH /crm/contacts/:id/data/:code`: valor XOR acción. El DTO
 * generado declara ambos opcionales; la unión impide mandar los dos o ninguno.
 */
export type ContactFieldReviewBody =
  | { value: FieldScalar | null }
  | { action: NonNullable<Schemas["ReviewContactFieldDto"]["action"]> };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const FIELD_SOURCE_LABELS: Record<ContactFieldSource, string> = {
  ai_agent: "Agente IA",
  user: "Operador",
  import: "Importación",
  public_form: "Formulario web",
  integration: "Integración",
  merge: "Fusión",
  system: "Sistema",
};

/** Nombre corto del grupo (cabecera de sección del panel). */
export const FLOW_GROUP_LABELS: Record<ContactDataFlow, string> = {
  contact_registration: "Registro",
  order_intake: "Pedido",
  appointment_booking: "Cita",
};

/** Orden de los grupos, el mismo que las pestañas de `/settings/forms`. */
export const FLOW_GROUP_ORDER: readonly ContactDataFlow[] = [
  "contact_registration",
  "order_intake",
  "appointment_booking",
];

// ---------------------------------------------------------------------------
// Predicados y resumen
// ---------------------------------------------------------------------------

/** Verificado por el equipo (confirmado o corregido a mano). */
export function isVerified(field: Pick<ContactDataField, "state">): boolean {
  return field.state === "confirmed" || field.state === "corrected";
}

/**
 * Hay algo que un humano debería mirar: un valor inválido, una propuesta del
 * agente sobre un campo protegido, o un obligatorio que el agente ya pidió sin
 * conseguirlo.
 */
export function needsReview(
  field: Pick<ContactDataField, "state" | "proposal" | "required" | "value" | "attempts">,
): boolean {
  if (field.state === "invalid") return true;
  if (field.proposal !== null) return true;
  return field.required && field.value === null && field.attempts > 0;
}

export interface ContactDataSummary {
  /** Campos con valor. */
  filled: number;
  /** Campos definidos por los formularios + huérfanos con valor. */
  total: number;
  /** Campos con algo por revisar. */
  review: number;
}

export function summarize(fields: readonly ContactDataField[]): ContactDataSummary {
  let filled = 0;
  let total = 0;
  let review = 0;
  for (const field of fields) {
    const hasValue = field.value !== null;
    if (field.defined || hasValue) total += 1;
    if (hasValue) filled += 1;
    if (needsReview(field)) review += 1;
  }
  return { filled, total, review };
}

export interface ContactDataGroupModel {
  flow: ContactDataFlow;
  label: string;
  fields: ContactDataField[];
}

/**
 * Agrupa por flujo en el orden de `/settings/forms`. Los huérfanos (`flow`
 * null) viven en `contact.custom_fields`, es decir, en el registro del cliente:
 * van al grupo «Registro», como en el mockup. Los grupos vacíos no se emiten.
 */
export function groupByFlow(fields: readonly ContactDataField[]): ContactDataGroupModel[] {
  const buckets = new Map<ContactDataFlow, ContactDataField[]>(
    FLOW_GROUP_ORDER.map((flow) => [flow, []]),
  );
  for (const field of fields) {
    buckets.get(field.flow ?? "contact_registration")?.push(field);
  }
  return FLOW_GROUP_ORDER.filter((flow) => (buckets.get(flow) ?? []).length > 0).map((flow) => ({
    flow,
    label: FLOW_GROUP_LABELS[flow],
    fields: buckets.get(flow) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/** `direccion_entrega` → «Direccion entrega». Para huérfanos sin `label`. */
export function humanizeCode(code: string): string {
  const spaced = code.replace(/[_-]+/g, " ").trim();
  return spaced === "" ? code : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Etiqueta visible del campo: la del formulario o, si es huérfano, el `code` humanizado. */
export function fieldLabel(field: Pick<ContactDataField, "label" | "code">): string {
  return field.label.trim() !== "" ? field.label : humanizeCode(field.code);
}

function parseIsoDate(value: string): Date | null {
  // `YYYY-MM-DD` se interpreta como fecha local: en UTC el día cambiaría en
  // Bogotá (UTC-5) y «18 sep» se pintaría como «17 sep».
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Valor listo para pintar según el `type` del campo. `select`/`text`/`phone`/
 * `email` van tal cual; `boolean` → Sí/No; `number` en es-CO; `date` → «18 sep 2026».
 */
export function formatFieldValue(
  field: Pick<ContactDataField, "type" | "value">,
  value: FieldScalar | null = field.value,
): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return value.toLocaleString("es-CO");
  if (field.type === "boolean") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes"].includes(normalized)) return "Sí";
    if (["false", "0", "no"].includes(normalized)) return "No";
    return value;
  }
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && value.trim() !== "" ? parsed.toLocaleString("es-CO") : value;
  }
  if (field.type === "date") {
    const date = parseIsoDate(value);
    return date === null
      ? value
      : date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  }
  return value;
}

/**
 * Cuándo se capturó, en la forma corta de la línea secundaria:
 * «hoy 10:12» · «ayer» · «12 sep» · «12 sep 2025» (si es de otro año).
 */
export function capturedAtLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, now)) {
    const time = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `hoy ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "ayer";
  // Por partes: `es-CO` intercala «de» («12 de sept») y algunos ICU abrevian con punto.
  const parts = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value.replace(".", "") ?? "";
  const short = `${part("day")} ${part("month")}`;
  return date.getFullYear() === now.getFullYear() ? short : `${short} ${date.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Completitud para la tabla de contactos
// ---------------------------------------------------------------------------

export interface DataCompleteness {
  filled: number;
  total: number;
}

export type CompletenessTone = "complete" | "partial" | "none";

/**
 * `n / total` de la columna «Datos», calculado en cliente sobre lo que ya trae
 * `GET /contacts` (columnas + `custom_fields`) y los formularios ACTIVOS del
 * tenant. Solo cuenta los campos DEFINIDOS: los huérfanos no se pueden separar
 * de las claves técnicas sin el endpoint de detalle, así que aquí no entran.
 *
 * `null` = el tenant no tiene formularios activos con campos (la celda pinta «—»).
 */
export type CompletenessFormInput = Pick<FormDefinitionDTO, "is_active"> & {
  fields: readonly Pick<FormFieldDTO, "code">[];
};

export function dataCompleteness(
  customFields: Record<string, unknown> | null | undefined,
  contactColumns: Record<string, unknown>,
  forms: readonly CompletenessFormInput[],
): DataCompleteness | null {
  const codes = new Set<string>();
  for (const form of forms) {
    if (!form.is_active) continue;
    for (const field of form.fields) codes.add(field.code);
  }
  if (codes.size === 0) return null;

  let filled = 0;
  for (const code of codes) {
    const value = Object.prototype.hasOwnProperty.call(contactColumns, code)
      ? contactColumns[code]
      : customFields?.[code];
    if (hasScalarValue(value)) filled += 1;
  }
  return { filled, total: codes.size };
}

function hasScalarValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return typeof value === "number" || typeof value === "boolean";
}

export function completenessTone(completeness: DataCompleteness | null): CompletenessTone {
  if (completeness === null) return "none";
  return completeness.filled >= completeness.total ? "complete" : "partial";
}

/** Flujo del editor al que enviar un huérfano para definirlo. */
export function defineFieldHref(flow: ContactDataFlow | null): string {
  const target: FormFlow = flow ?? "contact_registration";
  return `/settings/forms?flow=${target}`;
}
