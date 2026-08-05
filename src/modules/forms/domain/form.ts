import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice forms — formularios de captura dinámicos (F10).
 *
 * El tenant define, por flujo, los datos que su agente de IA debe conseguir
 * antes de cerrar. El enforcement es server-side: `form_guard.ts` bloquea
 * `create_order` y `book_appointment` cuando falta un requerido o hay un valor
 * inválido. Este slice solo configura la definición.
 *
 * La clave del recurso es el FLOW, no un id: hay a lo sumo un formulario por
 * flujo (unique `company_id, flow` en DB), y el verbo de escritura es un PUT
 * de reemplazo total.
 */

export type FormDefinitionDTO = Schemas["FormDefinitionDto"];
export type FormsListDTO = Schemas["FormsListDto"];
export type FormFieldDTO = FormDefinitionDTO["fields"][number];
export type FormFlow = FormDefinitionDTO["flow"];
export type FormFieldType = FormFieldDTO["type"];

/**
 * Topes y reglas del backend (`forms/application/ports/form_fields.schema.ts`).
 * Se espejan, no se adivinan: si allí cambian, aquí también.
 */
export const MAX_FIELDS_PER_FORM = 8;
export const MAX_OPTIONS_PER_FIELD = 12;
/** `code` en snake_case empezando por letra. Más estricto que el de catalog. */
export const FIELD_CODE_REGEX = /^[a-z][a-z0-9_]*$/;
export const FIELD_LIMITS = { code: 40, label: 60, aiPrompt: 160, option: 60 } as const;

/**
 * Orden de presentación de los flujos. `satisfies` para que añadir un flow en
 * el backend rompa el build aquí en lugar de fallar en runtime.
 */
export const FORM_FLOWS = [
  "contact_registration",
  "order_intake",
  "appointment_booking",
] as const satisfies readonly FormFlow[];

export const FORM_FIELD_TYPES = [
  "text",
  "number",
  "select",
  "date",
  "boolean",
  "phone",
  "email",
] as const satisfies readonly FormFieldType[];

/** Nombre corto del flujo, para pestañas y títulos. */
export const FLOW_LABELS: Record<FormFlow, string> = {
  contact_registration: "Datos del cliente",
  order_intake: "Datos del pedido",
  appointment_booking: "Datos de la cita",
};

/**
 * Espejo LITERAL de `FLOW_LABELS` de
 * `axi-server/src/modules/ai_agents/application/prompt_composer.service.ts`.
 * Se usa solo para reproducir la sección "Datos requeridos" del prompt; si el
 * backend lo cambia, la previsualización queda desalineada (el copy dice
 * "aproximado" a propósito, no promete fidelidad literal).
 */
export const FLOW_AI_LABELS: Record<FormFlow, string> = {
  contact_registration: "registrar al cliente",
  order_intake: "crear un pedido",
  appointment_booking: "agendar una cita",
};

export const FLOW_DESCRIPTIONS: Record<FormFlow, string> = {
  contact_registration: "Antes de registrar al cliente, tu agente pedirá estos datos.",
  order_intake: "Antes de crear un pedido, tu agente pedirá estos datos.",
  appointment_booking: "Antes de agendar una cita, tu agente pedirá estos datos.",
};

/**
 * La asimetría real del backend, hecha copy. `create_order.tool.ts` concatena
 * `contact_registration.fields + order_intake.fields`; `book_appointment.tool.ts`
 * usa SOLO `appointment_booking`. Es contraintuitivo en las dos direcciones, así
 * que se dice en los tres flujos.
 */
export const FLOW_NOTES: Record<FormFlow, string> = {
  contact_registration: "Estos datos también se piden antes de crear un pedido.",
  order_intake: "Además de estos, tu agente pedirá los datos del cliente.",
  appointment_booking:
    "La cita no hereda los datos del cliente. Si necesitas su nombre o teléfono para agendar, añádelos aquí también.",
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto libre",
  number: "Número",
  select: "Lista de opciones",
  date: "Fecha",
  boolean: "Sí o no",
  phone: "Teléfono",
  email: "Correo electrónico",
};

/**
 * Microcopy derivado del validador real de lo capturado
 * (`forms/application/ports/form_data_validator.ts`), no de lo que suena bien:
 * `number` acepta strings numéricas, `date` exige YYYY-MM-DD o ISO, `email`
 * solo comprueba que haya una arroba, `phone` exige indicativo (E.164).
 */
export const FIELD_TYPE_HINTS: Record<FormFieldType, string> = {
  text: "Cualquier texto. No se valida el contenido.",
  number: "Solo números. «tres» no vale; «3» sí.",
  select: "La IA ofrece las opciones que definas y solo acepta una de ellas.",
  date: "Fecha concreta. La IA convierte «mañana» a una fecha real.",
  boolean: "Solo sí o no.",
  phone: "Debe incluir indicativo: +57 320 123 4567. Sin él no lo acepta.",
  email: "Debe contener una arroba. No verificamos que exista.",
};

/**
 * Un flujo que el tenant NO tiene configurado: borrador local que nunca fue al
 * backend. `is_active: true` no es cosmético — es exactamente lo que hará el
 * PUT (`is_active ?? true`), así que el switch no miente antes del primer
 * guardado.
 */
export type FormDraft = {
  flow: FormFlow;
  fields: readonly [];
  is_active: true;
  persisted: false;
};

export type PersistedForm = FormDefinitionDTO & { persisted: true };

/** Unión discriminada por `persisted`: el contrato que gobierna toda la UI. */
export type FlowForm = PersistedForm | FormDraft;

/**
 * `GET /forms` devuelve solo las filas EXISTENTES (0..3): un flujo sin
 * configurar simplemente no aparece. Como el enum de flows es cerrado y
 * conocido en compilación, los faltantes se sintetizan aquí.
 *
 * Por eso NO se consume `GET /forms/{flow}`: para un flujo inexistente sería un
 * 404 garantizado (un error como control de flujo) y triplicaría las requests.
 */
export function synthesizeForms(list: FormsListDTO): Record<FormFlow, FlowForm> {
  const byFlow = new Map<FormFlow, FormDefinitionDTO>(list.data.map((form) => [form.flow, form]));

  return FORM_FLOWS.reduce(
    (acc, flow) => {
      const found = byFlow.get(flow);
      acc[flow] = found
        ? { ...found, persisted: true }
        : { flow, fields: [], is_active: true, persisted: false };
      return acc;
    },
    {} as Record<FormFlow, FlowForm>,
  );
}

/**
 * Campo tal como lo edita la UI.
 *
 * `position` se EXCLUYE a propósito: es un derivado del índice del array, no un
 * dato del usuario. Eso elimina de raíz los duplicados y huecos de posición.
 */
export type EditableFormField = Omit<FormFieldDTO, "position"> & {
  /** true si el `code` ya existía en el backend ⇒ INMUTABLE (es la clave del dato guardado). */
  persisted: boolean;
  /** Clave estable de render: `FormField` no trae id, así que se genera al hidratar/crear. */
  key: string;
};

/**
 * Codes que `save_contact_data.tool.ts` escribe en una COLUMNA del Contact; el
 * resto aterriza en `contact.custom_fields`.
 *
 * Importa para la UX: si el tenant llama a su campo `address`, el dato queda en
 * la ficha del CRM y `form_guard.ts` lo resuelve de ahí en conversaciones
 * futuras (la IA no lo vuelve a preguntar). Si lo llama `direccion_entrega`, va
 * a `custom_fields` y nunca se auto-satisface desde la ficha.
 */
export const CONTACT_COLUMN_CODES: ReadonlySet<string> = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "address",
  "city",
  "birthdate",
  "document_type",
  "document_number",
]);

export function fieldStorageHint(code: string): "contact_column" | "custom_field" {
  return CONTACT_COLUMN_CODES.has(code) ? "contact_column" : "custom_field";
}

/** Entrada del catálogo de datos recomendados que se ofrece al añadir un campo. */
export type RecommendedField = {
  code: string;
  label: string;
  type: FormFieldType;
  ai_prompt?: string;
};

/**
 * Catálogo de datos recomendados: los codes que enganchan con la ficha del CRM,
 * precargados con label, tipo y una indicación de partida para la IA.
 *
 * `document_type` queda FUERA a propósito: la columna del Contact es un enum
 * `cc|ce|ti|pp|nit` y un `select` exige coincidencia exacta con sus `options`,
 * así que la IA le ofrecería «cc | ce | ti | pp | nit» al cliente por WhatsApp.
 * Se recomienda `document_number` como texto.
 */
export const RECOMMENDED_FIELDS: readonly RecommendedField[] = [
  { code: "full_name", label: "Nombre completo", type: "text" },
  {
    code: "phone",
    label: "Teléfono",
    type: "phone",
    ai_prompt: "Confirma el número con indicativo, ej. +57 320 123 4567",
  },
  { code: "email", label: "Correo electrónico", type: "email" },
  {
    code: "address",
    label: "Dirección",
    type: "text",
    ai_prompt: "Pide calle, número, barrio y un punto de referencia",
  },
  { code: "city", label: "Ciudad", type: "text" },
  { code: "birthdate", label: "Fecha de nacimiento", type: "date", ai_prompt: "Pide el día exacto, no «mañana»" },
  {
    code: "document_number",
    label: "Cédula o NIT",
    type: "text",
    ai_prompt: "Pide el número de cédula o el NIT para la factura",
  },
  { code: "first_name", label: "Nombre", type: "text" },
  { code: "last_name", label: "Apellido", type: "text" },
];

/**
 * Reproduce la línea EXACTA que el backend inyecta por campo en la sección
 * "## Datos requeridos" del prompt del turno
 * (`prompt_composer.service.ts#requiredData`), en su estado FALTA — que es el
 * único observable en tiempo de configuración.
 *
 * Se replica la concatenación del composer literalmente, incluidos sus casos
 * raros: el paréntesis solo abre si hay hint u opciones, y el separador entre
 * ambos es `; `.
 */
export function promptLine(field: Pick<EditableFormField, "label" | "code" | "type" | "required" | "options" | "ai_prompt">): string {
  const prompt = field.ai_prompt?.trim();
  const options = field.type === "select" ? (field.options ?? []).filter((opt) => opt.trim() !== "") : [];

  const hint = prompt === undefined || prompt === "" ? "" : ` (${prompt}`;
  const optionsPart =
    options.length === 0 ? "" : `${hint === "" ? " (" : "; "}opciones: ${options.join(" | ")}`;
  const hints = `${hint}${optionsPart}${hint !== "" || optionsPart !== "" ? ")" : ""}`;
  const optional = field.required ? "" : " [opcional]";

  return `- ${field.label} (code ${field.code})${optional}: FALTA${hints}`;
}

/**
 * Los campos que el agente exige antes de cerrar el flujo, en el orden en que
 * los pide. `order_intake` es el único que HEREDA: `create_order.tool.ts`
 * concatena `contact_registration.fields` ANTES de los del pedido.
 */
export function effectiveFields<T>(
  flow: FormFlow,
  fieldsByFlow: Record<FormFlow, readonly T[]>,
): readonly T[] {
  return flow === "order_intake"
    ? [...fieldsByFlow.contact_registration, ...fieldsByFlow.order_intake]
    : fieldsByFlow[flow];
}
