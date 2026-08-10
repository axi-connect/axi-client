import type { Schemas } from "@/core/api/types";
import type { TriggerType } from "./enums";

/** Contratos de las reglas de recuperación (`/marketing/automations`). */

export type AutomationDTO = Schemas["AutomationDto"];
export type CreateAutomationDTO = Schemas["CreateAutomationDto"];
export type UpdateAutomationDTO = Schemas["UpdateAutomationDto"];
export type AutomationMetricsDTO = Schemas["AutomationMetricsDto"];

/**
 * DSL de condiciones, espejo EXACTO del zod del backend
 * (`automation_conditions.ts`). El DTO lo declara como `object` sin tipar, así
 * que el tipo vive aquí y el parseo es defensivo.
 */
export type AutomationConditions = {
  has_active_cart?: boolean;
  min_score?: number;
  max_score?: number;
  lifecycle_stage_in?: Array<"prospect" | "lead" | "customer" | "other">;
  min_cart_total_cents?: number;
  intent_type?: "sales" | "support" | "technical" | "onboarding" | "follow_up";
  /** Solo `cart_abandoned`: incluir también pedidos pendientes de pago. */
  include_pending?: boolean;
};

const LIFECYCLE_STAGES = ["prospect", "lead", "customer", "other"] as const;
const INTENT_TYPES = ["sales", "support", "technical", "onboarding", "follow_up"] as const;

function isStringIn<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function asInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  return value >= min && value <= max ? value : undefined;
}

/**
 * Lee el `conditions` opaco del DTO. Igual que el backend, un valor corrupto
 * DEGRADA a `{}` (que matchea todo) en vez de lanzar: la lista de reglas no
 * puede romperse porque una fila traiga basura.
 */
export function parseConditions(raw: unknown): AutomationConditions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: AutomationConditions = {};

  if (typeof r.has_active_cart === "boolean") out.has_active_cart = r.has_active_cart;
  if (typeof r.include_pending === "boolean") out.include_pending = r.include_pending;

  const minScore = asInt(r.min_score, 0, 100);
  if (minScore !== undefined) out.min_score = minScore;
  const maxScore = asInt(r.max_score, 0, 100);
  if (maxScore !== undefined) out.max_score = maxScore;

  const cart = asInt(r.min_cart_total_cents, 0, Number.MAX_SAFE_INTEGER);
  if (cart !== undefined) out.min_cart_total_cents = cart;

  if (Array.isArray(r.lifecycle_stage_in)) {
    const stages = r.lifecycle_stage_in.filter((s): s is (typeof LIFECYCLE_STAGES)[number] =>
      isStringIn(s, LIFECYCLE_STAGES),
    );
    if (stages.length > 0) out.lifecycle_stage_in = stages;
  }

  if (isStringIn(r.intent_type, INTENT_TYPES)) out.intent_type = r.intent_type;

  return out;
}

/** Quita las claves vacías: el backend valida con `.strict()` y una clave
 *  extraña o un array vacío devuelven 422. */
export function compactConditions(conditions: AutomationConditions): AutomationConditions {
  const out: AutomationConditions = {};
  if (conditions.has_active_cart !== undefined) out.has_active_cart = conditions.has_active_cart;
  if (conditions.include_pending !== undefined) out.include_pending = conditions.include_pending;
  if (conditions.min_score !== undefined) out.min_score = conditions.min_score;
  if (conditions.max_score !== undefined) out.max_score = conditions.max_score;
  if (conditions.min_cart_total_cents !== undefined) {
    out.min_cart_total_cents = conditions.min_cart_total_cents;
  }
  if (conditions.lifecycle_stage_in?.length) {
    out.lifecycle_stage_in = conditions.lifecycle_stage_in;
  }
  if (conditions.intent_type !== undefined) out.intent_type = conditions.intent_type;
  return out;
}

/**
 * `deal_stalled` dispara días después del último mensaje del cliente, así que
 * cae fuera de la ventana de 24 h de WhatsApp Cloud: sin plantilla de Meta el
 * backend rechaza el encendido (422 `marketing/automation_hsm_required`).
 * La UI lo avisa ANTES de que el usuario pulse, no después.
 */
export function requiresHsm(trigger: TriggerType): boolean {
  return trigger === "deal_stalled";
}

export function canEnableAutomation(automation: AutomationDTO): boolean {
  if (!requiresHsm(automation.trigger_type)) return true;
  return Boolean(automation.hsm_template_name);
}

/** Conversión de una regla (0–1). `sent` 0 ⇒ 0, no una división por cero. */
export function automationConversionRate(metrics: AutomationMetricsDTO): number {
  if (metrics.sent <= 0) return 0;
  return metrics.converted / metrics.sent;
}
