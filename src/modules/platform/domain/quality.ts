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

// ─── Criterios de éxito (unión discriminada local, criteria_version 1) ──────

export type SuccessCriterion =
  | { kind: "order_created"; min_items?: number; product_codes?: string[] }
  | { kind: "order_not_created" }
  | { kind: "escalated" }
  | { kind: "not_escalated" }
  | { kind: "reply_contains"; pattern: string }
  | { kind: "reply_not_contains"; pattern: string }
  | { kind: "no_agent_error" }
  | { kind: "max_reply_ms"; threshold_ms: number }
  /** Forward-compat: kind desconocido o campos ilegibles — se muestra crudo, jamás rompe. */
  | { kind: "unknown"; raw: Record<string, unknown> };

export type CriterionKind = SuccessCriterion["kind"];

/** Metadata por kind para el editor de criterios (F2) y los chips de lectura. */
export const CRITERION_KINDS: {
  value: Exclude<CriterionKind, "unknown">;
  label: string;
  description: string;
}[] = [
  {
    value: "order_created",
    label: "Pedido creado",
    description: "La conversación termina con un pedido (opcional: mínimo de unidades y productos esperados)",
  },
  { value: "order_not_created", label: "Sin pedido", description: "La conversación NO debe crear un pedido" },
  { value: "escalated", label: "Escala a humano", description: "El agente debe transferir a un operador" },
  { value: "not_escalated", label: "No escala", description: "El agente debe resolver sin transferir" },
  {
    value: "reply_contains",
    label: "Respuesta contiene",
    description: "Alguna respuesta del agente hace match con el patrón (regex, insensible a mayúsculas)",
  },
  {
    value: "reply_not_contains",
    label: "Respuesta no contiene",
    description: "Ninguna respuesta del agente hace match con el patrón",
  },
  { value: "no_agent_error", label: "Sin errores del agente", description: "Ningún turno ni envío falla" },
  {
    value: "max_reply_ms",
    label: "Latencia máxima",
    description: "Toda respuesta llega dentro del umbral (ms, extremo a extremo)",
  },
];

function asPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
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
  }

  return [...new Set(errors)];
}
