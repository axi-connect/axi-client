/**
 * Dominio de escenarios y suites de calidad (`/platform/quality`). TypeScript
 * PURO. Los tipos derivan del schema OpenAPI generado; `success_criteria`
 * llega del backend como `Record<string, unknown>[]` A PROPÓSITO (decisión
 * B8: escenarios con `criteria_version` antigua deben poder leerse sin 500),
 * así que aquí vive la unión discriminada local + el parseo DEFENSIVO.
 *
 * Las reglas de `validateCriteriaSet` son un ESPEJO de las del backend
 * (`success_criteria.schema.ts`) para avisar antes del submit; la fuente de
 * verdad sigue siendo el servidor (el 400/422 se mapea igualmente).
 */
import type { Schemas } from "@/core/api/types";

export type Scenario = Schemas["ScenarioDto"];
export type ScenarioListItem = Schemas["ScenariosPageDto"]["data"][number];
export type CreateScenarioDTO = Schemas["CreateScenarioDto"];
export type UpdateScenarioDTO = Schemas["UpdateScenarioDto"];
export type CloneScenarioDTO = Schemas["CloneScenarioDto"];

export type SuiteListItem = Schemas["SuitesPageDto"]["data"][number];
export type SuiteDetail = Schemas["SuiteDetailDto"];
export type CreateSuiteDTO = Schemas["CreateSuiteDto"];
export type UpdateSuiteDTO = Schemas["UpdateSuiteDto"];

export type CatalogStatus = Scenario["status"]; // "active" | "archived"

// ─── Límites del contrato (DTOs zod del backend) ────────────────────────────

export const SCENARIO_CODE_REGEX = /^[a-z][a-z0-9_]*$/;
export const CODE_MIN = 2;
export const CODE_MAX = 60;
export const NAME_MIN = 2;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const PERSONA_MIN = 10;
export const PERSONA_MAX = 4000;
export const GOAL_MIN = 10;
export const GOAL_MAX = 2000;
export const MAX_TURNS_MIN = 1;
export const MAX_TURNS_MAX = 30;
export const DEFAULT_MAX_TURNS = 12;
export const MAX_TAGS = 10;
export const TAG_MAX_LENGTH = 40;
export const MIN_CRITERIA = 1;
export const MAX_CRITERIA = 20;
export const MAX_PATTERN_LENGTH = 120;
export const MAX_THRESHOLD_MS = 600_000;
export const MAX_PRODUCT_CODES = 20;
export const MAX_SUITE_SCENARIOS = 50;
export const CUSTOMER_NAME_MAX = 120;
export const MAX_ATTACHMENTS = 3;

// ─── Adjuntos del escenario (F4) ────────────────────────────────────────────

export type ScenarioAttachment = {
  dataset_item_id: string;
  label: string;
  when: "first_turn" | "sim_decides";
};

/** Parseo defensivo del Json de `attachments` (entradas ilegibles se descartan). */
export function parseScenarioAttachments(raw: unknown): ScenarioAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.dataset_item_id !== "string" || record.dataset_item_id.length === 0) return [];
    return [
      {
        dataset_item_id: record.dataset_item_id,
        label: typeof record.label === "string" ? record.label : "foto",
        when: record.when === "sim_decides" ? ("sim_decides" as const) : ("first_turn" as const),
      },
    ];
  });
}

// ─── Criterios de éxito (unión discriminada local, criteria_version 2) ──────

/** Tools del agente (espejo del puerto `AGENT_TOOL_NAMES` del backend). */
export const AGENT_TOOL_NAMES = [
  "advance_stage",
  "apply_promotion",
  "book_appointment",
  "catalog_lookup",
  "close_conversation",
  "confirm_appointment",
  "create_order",
  "get_branches",
  "get_business_policies",
  "get_order_status",
  "get_payment_methods",
  "human_handoff",
  "log_crm_activity",
  "open_deal",
  "quote_order",
  "report_payment",
  "reschedule_appointment",
  "save_contact_data",
  "schedule_availability",
  "schedule_follow_up",
  "send_product_images",
  "send_resource",
  "set_delivery",
  "validate_coupon",
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export const STAGE_KINDS = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "commitment",
  "fulfillment",
  "custom",
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];
export const STAGE_KIND_LABELS: Record<StageKind, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  meeting: "Reunión",
  proposal: "Propuesta",
  negotiation: "Negociación",
  commitment: "Compromiso",
  fulfillment: "Cumplimiento",
  custom: "Personalizada",
};

export const SENT_MEDIA_KINDS = ["image", "document", "location"] as const;
export type SentMediaKind = (typeof SENT_MEDIA_KINDS)[number];
export const SENT_MEDIA_LABELS: Record<SentMediaKind, string> = {
  image: "Fotos",
  document: "Documentos",
  location: "Ubicaciones",
};

export const FIELD_CODE_REGEX = /^[a-z][a-z0-9_]*$/;
export const MAX_RECOGNITION_RANK = 5;
export const MAX_TURNS_TO_OUTCOME = 30;
export const MAX_GREETINGS = 5;
export const MAX_LLM_CALLS = 20;
export const MAX_COST_USD = 50;
export const MAX_TOOL_CALLS_MIN = 50;
export const MAX_MEDIA_MIN = 20;

export type SuccessCriterion =
  // v1
  | { kind: "order_created"; min_items?: number; product_codes?: string[] }
  | { kind: "order_not_created" }
  | { kind: "appointment_created" }
  | { kind: "escalated" }
  | { kind: "not_escalated" }
  | { kind: "reply_contains"; pattern: string }
  | { kind: "reply_not_contains"; pattern: string }
  | { kind: "no_agent_error" }
  | { kind: "max_reply_ms"; threshold_ms: number }
  // v2 · Resultado
  | { kind: "contact_field_captured"; field: string; pattern?: string }
  | { kind: "deal_stage_kind"; kind_expected?: StageKind }
  | { kind: "media_sent"; media: SentMediaKind; min: number }
  | { kind: "payment_reported" }
  | { kind: "delivery_set"; method?: "shipping" | "pickup" }
  | { kind: "promotion_applied"; code?: string }
  | { kind: "recognition_matched"; sku: string; max_rank: number }
  | { kind: "intent_detected"; intention_code: string }
  | { kind: "turns_to_outcome"; max: number; outcome: "order" | "appointment" }
  // v2 · Herramientas
  | { kind: "tool_called"; name: AgentToolName; min: number }
  | { kind: "tool_not_called"; name: AgentToolName }
  // v2 · Estilo y seguridad
  | { kind: "no_unverified_prices" }
  | { kind: "no_bot_phrases" }
  | { kind: "max_greetings"; max: number }
  // v2 · Rendimiento y costo
  | { kind: "max_llm_calls_per_turn"; n: number }
  | { kind: "max_cost_usd"; usd: number }
  /** Forward-compat: kind desconocido o campos ilegibles — se muestra crudo, jamás rompe. */
  | { kind: "unknown"; raw: Record<string, unknown> };

export type CriterionKind = SuccessCriterion["kind"];

export const CRITERION_FAMILIES = ["Resultado", "Herramientas", "Estilo y seguridad", "Rendimiento y costo"] as const;
export type CriterionFamily = (typeof CRITERION_FAMILIES)[number];

/** Metadata por kind para el editor de criterios (agrupado por familia) y los chips de lectura. */
export const CRITERION_KINDS: {
  value: Exclude<CriterionKind, "unknown">;
  label: string;
  description: string;
  family: CriterionFamily;
}[] = [
  // ---- Resultado (estado del negocio) ----
  {
    value: "order_created",
    label: "Pedido creado",
    description: "La conversación termina con un pedido (opcional: mínimo de unidades y productos esperados)",
    family: "Resultado",
  },
  { value: "order_not_created", label: "Sin pedido", description: "La conversación NO debe crear un pedido", family: "Resultado" },
  {
    value: "appointment_created",
    label: "Cita agendada",
    description: "La conversación deja una cita agendada (requiere un tenant con servicios agendables)",
    family: "Resultado",
  },
  { value: "escalated", label: "Escala a humano", description: "El agente debe transferir a un operador", family: "Resultado" },
  { value: "not_escalated", label: "No escala", description: "El agente debe resolver sin transferir", family: "Resultado" },
  {
    value: "contact_field_captured",
    label: "Dato del contacto guardado",
    description: "El agente guardó el campo (columna del contacto o campo personalizado); opcional: formato esperado (regex)",
    family: "Resultado",
  },
  {
    value: "deal_stage_kind",
    label: "Oportunidad en el CRM",
    description: "Quedó una oportunidad ligada a la conversación (opcional: en un tipo de etapa). Requiere pipeline",
    family: "Resultado",
  },
  {
    value: "media_sent",
    label: "Medio enviado por el agente",
    description: "El agente envió fotos, documentos o ubicaciones (mínimo configurable)",
    family: "Resultado",
  },
  {
    value: "payment_reported",
    label: "Pago reportado",
    description: "El comprobante quedó asociado al pedido (report_payment) o el pedido figura como pagado",
    family: "Resultado",
  },
  {
    value: "delivery_set",
    label: "Entrega definida",
    description: "El pedido tiene forma de entrega (opcional: envío o recogida)",
    family: "Resultado",
  },
  {
    value: "promotion_applied",
    label: "Promoción aplicada",
    description: "Se aplicó una promoción o cupón por la vía oficial (opcional: código esperado)",
    family: "Resultado",
  },
  {
    value: "recognition_matched",
    label: "Foto reconocida",
    description: "Una foto del cliente se reconoció como el SKU esperado dentro del top-k",
    family: "Resultado",
  },
  {
    value: "intent_detected",
    label: "Intención detectada",
    description: "La conversación quedó clasificada con el código de intención esperado",
    family: "Resultado",
  },
  {
    value: "turns_to_outcome",
    label: "Turnos hasta el cierre",
    description: "El pedido o la cita se concretó en N mensajes del cliente o menos",
    family: "Resultado",
  },
  // ---- Herramientas ----
  {
    value: "tool_called",
    label: "Herramienta usada",
    description: "El agente llamó la herramienta (mínimo de veces configurable)",
    family: "Herramientas",
  },
  {
    value: "tool_not_called",
    label: "Herramienta NO usada",
    description: "El agente jamás llamó la herramienta",
    family: "Herramientas",
  },
  // ---- Estilo y seguridad ----
  {
    value: "reply_contains",
    label: "Respuesta contiene",
    description: "Alguna respuesta del agente hace match con el patrón (regex, insensible a mayúsculas)",
    family: "Estilo y seguridad",
  },
  {
    value: "reply_not_contains",
    label: "Respuesta no contiene",
    description: "Ninguna respuesta del agente hace match con el patrón",
    family: "Estilo y seguridad",
  },
  {
    value: "no_unverified_prices",
    label: "Sin precios sin respaldo",
    description: "Ningún turno descartó precios que no vinieran del catálogo",
    family: "Estilo y seguridad",
  },
  {
    value: "no_bot_phrases",
    label: "Sin muletillas de sistema",
    description: "Ninguna respuesta con frases de bot («he transferido», «como asistente virtual»…)",
    family: "Estilo y seguridad",
  },
  {
    value: "max_greetings",
    label: "Saludos máximos",
    description: "Saluda como mucho N veces (1 = no vuelve a saludar a mitad de conversación)",
    family: "Estilo y seguridad",
  },
  // ---- Rendimiento y costo ----
  { value: "no_agent_error", label: "Sin errores del agente", description: "Ningún turno ni envío falla", family: "Rendimiento y costo" },
  {
    value: "max_reply_ms",
    label: "Latencia máxima",
    description: "Toda respuesta llega dentro del umbral (ms, extremo a extremo)",
    family: "Rendimiento y costo",
  },
  {
    value: "max_llm_calls_per_turn",
    label: "Llamadas LLM por turno",
    description: "Ningún turno necesitó más de N llamadas al modelo",
    family: "Rendimiento y costo",
  },
  {
    value: "max_cost_usd",
    label: "Costo máximo (USD)",
    description: "La conversación completa costó como mucho N USD (gasto de plataforma)",
    family: "Rendimiento y costo",
  },
];

function asPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function asNonNegativeInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isAgentToolName(value: unknown): value is AgentToolName {
  return typeof value === "string" && (AGENT_TOOL_NAMES as readonly string[]).includes(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return items.length === value.length ? items : undefined;
}

/**
 * Parseo defensivo del `Record<string, unknown>[]` que emite el backend.
 * Campo requerido ilegible (p.ej. `pattern` no-string) → el criterio cae a
 * `unknown` con su raw, para que la UI lo muestre sin inventar semántica.
 */
export function parseSuccessCriteria(raw: unknown): SuccessCriterion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry): SuccessCriterion => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { kind: "unknown", raw: { value: entry } };
    }
    const record = entry as Record<string, unknown>;
    switch (record.kind) {
      case "order_created": {
        const criterion: SuccessCriterion = { kind: "order_created" };
        const minItems = asPositiveInt(record.min_items);
        const productCodes = asStringArray(record.product_codes);
        if (minItems !== undefined) criterion.min_items = minItems;
        if (productCodes !== undefined) criterion.product_codes = productCodes;
        return criterion;
      }
      case "order_not_created":
      case "appointment_created":
      case "escalated":
      case "not_escalated":
      case "no_agent_error":
        return { kind: record.kind };
      case "reply_contains":
      case "reply_not_contains":
        return typeof record.pattern === "string" && record.pattern.length > 0
          ? { kind: record.kind, pattern: record.pattern }
          : { kind: "unknown", raw: record };
      case "max_reply_ms": {
        const threshold = asPositiveInt(record.threshold_ms);
        return threshold !== undefined
          ? { kind: "max_reply_ms", threshold_ms: threshold }
          : { kind: "unknown", raw: record };
      }
      // ---- v2 ----
      case "contact_field_captured": {
        const field = asNonEmptyString(record.field);
        if (field === undefined) return { kind: "unknown", raw: record };
        const pattern = asNonEmptyString(record.pattern);
        return pattern === undefined ? { kind: "contact_field_captured", field } : { kind: "contact_field_captured", field, pattern };
      }
      case "deal_stage_kind": {
        const expected = record.kind_expected;
        if (expected === undefined || expected === null) return { kind: "deal_stage_kind" };
        return (STAGE_KINDS as readonly string[]).includes(expected as string)
          ? { kind: "deal_stage_kind", kind_expected: expected as StageKind }
          : { kind: "unknown", raw: record };
      }
      case "media_sent": {
        const media = record.media;
        if (!(SENT_MEDIA_KINDS as readonly string[]).includes(media as string)) return { kind: "unknown", raw: record };
        return { kind: "media_sent", media: media as SentMediaKind, min: asPositiveInt(record.min) ?? 1 };
      }
      case "payment_reported":
      case "no_unverified_prices":
      case "no_bot_phrases":
        return { kind: record.kind };
      case "delivery_set": {
        const method = record.method;
        if (method === undefined || method === null) return { kind: "delivery_set" };
        return method === "shipping" || method === "pickup" ? { kind: "delivery_set", method } : { kind: "unknown", raw: record };
      }
      case "promotion_applied": {
        const code = asNonEmptyString(record.code);
        return code === undefined ? { kind: "promotion_applied" } : { kind: "promotion_applied", code };
      }
      case "recognition_matched": {
        const sku = asNonEmptyString(record.sku);
        return sku === undefined
          ? { kind: "unknown", raw: record }
          : { kind: "recognition_matched", sku, max_rank: asPositiveInt(record.max_rank) ?? 1 };
      }
      case "intent_detected": {
        const code = asNonEmptyString(record.intention_code);
        return code === undefined ? { kind: "unknown", raw: record } : { kind: "intent_detected", intention_code: code };
      }
      case "turns_to_outcome": {
        const max = asPositiveInt(record.max);
        if (max === undefined) return { kind: "unknown", raw: record };
        return { kind: "turns_to_outcome", max, outcome: record.outcome === "appointment" ? "appointment" : "order" };
      }
      case "tool_called":
        return isAgentToolName(record.name)
          ? { kind: "tool_called", name: record.name, min: asPositiveInt(record.min) ?? 1 }
          : { kind: "unknown", raw: record };
      case "tool_not_called":
        return isAgentToolName(record.name) ? { kind: "tool_not_called", name: record.name } : { kind: "unknown", raw: record };
      case "max_greetings":
        return { kind: "max_greetings", max: asNonNegativeInt(record.max) ?? 1 };
      case "max_llm_calls_per_turn": {
        const n = asPositiveInt(record.n);
        return n === undefined ? { kind: "unknown", raw: record } : { kind: "max_llm_calls_per_turn", n };
      }
      case "max_cost_usd":
        return typeof record.usd === "number" && record.usd > 0
          ? { kind: "max_cost_usd", usd: record.usd }
          : { kind: "unknown", raw: record };
      default:
        return { kind: "unknown", raw: record };
    }
  });
}

/** Etiqueta legible en español de un criterio (chips y checks). */
export function criterionLabel(criterion: SuccessCriterion): string {
  switch (criterion.kind) {
    case "order_created": {
      const parts = ["Pedido creado"];
      if (criterion.min_items !== undefined) parts.push(`≥ ${criterion.min_items} unidades`);
      if (criterion.product_codes?.length) parts.push(`con ${criterion.product_codes.join(", ")}`);
      return parts.join(" · ");
    }
    case "order_not_created":
      return "Sin pedido";
    case "appointment_created":
      return "Cita agendada";
    case "escalated":
      return "Escala a humano";
    case "not_escalated":
      return "No escala";
    case "reply_contains":
      return `Respuesta contiene /${criterion.pattern}/i`;
    case "reply_not_contains":
      return `Respuesta no contiene /${criterion.pattern}/i`;
    case "no_agent_error":
      return "Sin errores del agente";
    case "max_reply_ms":
      return `Latencia máx. ${criterion.threshold_ms} ms`;
    // ---- v2 ----
    case "contact_field_captured":
      return criterion.pattern ? `Dato «${criterion.field}» guardado · /${criterion.pattern}/i` : `Dato «${criterion.field}» guardado`;
    case "deal_stage_kind":
      return criterion.kind_expected ? `Oportunidad en etapa ${STAGE_KIND_LABELS[criterion.kind_expected]}` : "Oportunidad en el CRM";
    case "media_sent":
      return `${SENT_MEDIA_LABELS[criterion.media]} enviadas ≥ ${criterion.min}`;
    case "payment_reported":
      return "Pago reportado";
    case "delivery_set":
      return criterion.method ? `Entrega: ${criterion.method === "shipping" ? "envío" : "recogida"}` : "Entrega definida";
    case "promotion_applied":
      return criterion.code ? `Promoción ${criterion.code} aplicada` : "Promoción aplicada";
    case "recognition_matched":
      return `Foto reconocida como ${criterion.sku} (top-${criterion.max_rank})`;
    case "intent_detected":
      return `Intención ${criterion.intention_code}`;
    case "turns_to_outcome":
      return `${criterion.outcome === "order" ? "Pedido" : "Cita"} en ≤ ${criterion.max} turnos`;
    case "tool_called":
      return criterion.min > 1 ? `Usa ${criterion.name} ≥ ${criterion.min}×` : `Usa ${criterion.name}`;
    case "tool_not_called":
      return `No usa ${criterion.name}`;
    case "no_unverified_prices":
      return "Sin precios sin respaldo";
    case "no_bot_phrases":
      return "Sin muletillas de sistema";
    case "max_greetings":
      return `Saludos ≤ ${criterion.max}`;
    case "max_llm_calls_per_turn":
      return `≤ ${criterion.n} llamadas LLM/turno`;
    case "max_cost_usd":
      return `Costo ≤ US$ ${criterion.usd}`;
    case "unknown":
      return `Criterio no reconocido (${String(criterion.raw.kind ?? "?")})`;
  }
}

/**
 * Heurística de cuantificador anidado (riesgo ReDoS), espejo del denylist del
 * backend: grupo que contiene `+`/`*` seguido de `+`/`*`, p.ej. `(a+)+`.
 * No es idéntica a la del server: falso negativo → lo atrapa el 400 mapeado.
 */
export function hasNestedQuantifier(pattern: string): boolean {
  return /\([^)]*[+*][^)]*\)[+*]/.test(pattern);
}

/** Errores de un patrón individual (vacío = válido). */
export function validatePattern(pattern: string): string[] {
  const errors: string[] = [];
  if (pattern.length < 1 || pattern.length > MAX_PATTERN_LENGTH) {
    errors.push(`El patrón debe tener entre 1 y ${MAX_PATTERN_LENGTH} caracteres`);
    return errors;
  }
  try {
    new RegExp(pattern, "i");
  } catch {
    errors.push("El patrón no es una expresión regular válida");
    return errors;
  }
  if (hasNestedQuantifier(pattern)) {
    errors.push("Patrón con cuantificador anidado (riesgo ReDoS)");
  }
  return errors;
}

/**
 * Reglas cruzadas del set de criterios que el backend RECHAZA — se muestran
 * en el form antes del submit. Devuelve la lista de mensajes (vacía = OK).
 */
export function validateCriteriaSet(criteria: SuccessCriterion[]): string[] {
  const errors: string[] = [];
  if (criteria.length < MIN_CRITERIA) errors.push("Agrega al menos un criterio de éxito");
  if (criteria.length > MAX_CRITERIA) errors.push(`Máximo ${MAX_CRITERIA} criterios`);

  const kinds = new Set(criteria.map((c) => c.kind));
  if (kinds.has("escalated") && kinds.has("not_escalated")) {
    errors.push("«Escala a humano» y «No escala» son mutuamente excluyentes");
  }
  if (kinds.has("order_created") && kinds.has("order_not_created")) {
    errors.push("«Pedido creado» y «Sin pedido» son mutuamente excluyentes");
  }
  // v2: la misma tool exigida y prohibida a la vez
  const called = new Set(criteria.flatMap((c) => (c.kind === "tool_called" ? [c.name] : [])));
  for (const criterion of criteria) {
    if (criterion.kind === "tool_not_called" && called.has(criterion.name)) {
      errors.push(`«Herramienta usada» y «Herramienta NO usada» de ${criterion.name} son mutuamente excluyentes`);
    }
  }

  for (const criterion of criteria) {
    if (criterion.kind === "reply_contains" || criterion.kind === "reply_not_contains") {
      errors.push(...validatePattern(criterion.pattern));
    }
    if (criterion.kind === "max_reply_ms") {
      if (criterion.threshold_ms <= 0 || criterion.threshold_ms > MAX_THRESHOLD_MS) {
        errors.push(`El umbral de latencia debe estar entre 1 y ${MAX_THRESHOLD_MS} ms`);
      }
    }
    if (criterion.kind === "order_created" && (criterion.product_codes?.length ?? 0) > MAX_PRODUCT_CODES) {
      errors.push(`Máximo ${MAX_PRODUCT_CODES} códigos de producto por criterio`);
    }
    // ---- v2 ----
    if (criterion.kind === "contact_field_captured") {
      if (!FIELD_CODE_REGEX.test(criterion.field)) {
        errors.push("El campo del contacto va en snake_case minúsculo (p.ej. phone, ciudad_envio)");
      }
      if (criterion.pattern !== undefined) errors.push(...validatePattern(criterion.pattern));
    }
    if (criterion.kind === "media_sent" && (criterion.min < 1 || criterion.min > MAX_MEDIA_MIN)) {
      errors.push(`El mínimo de medios enviados debe estar entre 1 y ${MAX_MEDIA_MIN}`);
    }
    if (criterion.kind === "recognition_matched") {
      if (criterion.sku.trim().length === 0) errors.push("«Foto reconocida» necesita el SKU esperado");
      if (criterion.max_rank < 1 || criterion.max_rank > MAX_RECOGNITION_RANK) {
        errors.push(`El top-k del reconocimiento debe estar entre 1 y ${MAX_RECOGNITION_RANK}`);
      }
    }
    if (criterion.kind === "intent_detected" && criterion.intention_code.trim().length === 0) {
      errors.push("«Intención detectada» necesita el código de la intención");
    }
    if (criterion.kind === "turns_to_outcome" && (criterion.max < 1 || criterion.max > MAX_TURNS_TO_OUTCOME)) {
      errors.push(`Los turnos hasta el cierre deben estar entre 1 y ${MAX_TURNS_TO_OUTCOME}`);
    }
    if (criterion.kind === "tool_called" && (criterion.min < 1 || criterion.min > MAX_TOOL_CALLS_MIN)) {
      errors.push(`El mínimo de llamadas a la herramienta debe estar entre 1 y ${MAX_TOOL_CALLS_MIN}`);
    }
    if (criterion.kind === "max_greetings" && (criterion.max < 0 || criterion.max > MAX_GREETINGS)) {
      errors.push(`Los saludos máximos deben estar entre 0 y ${MAX_GREETINGS}`);
    }
    if (criterion.kind === "max_llm_calls_per_turn" && (criterion.n < 1 || criterion.n > MAX_LLM_CALLS)) {
      errors.push(`Las llamadas LLM por turno deben estar entre 1 y ${MAX_LLM_CALLS}`);
    }
    if (criterion.kind === "max_cost_usd" && (criterion.usd <= 0 || criterion.usd > MAX_COST_USD)) {
      errors.push(`El costo máximo debe estar entre 0 y ${MAX_COST_USD} USD`);
    }
  }

  return [...new Set(errors)];
}
