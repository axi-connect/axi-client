/**
 * Dominio del visor de auditoría. TypeScript PURO.
 * El endpoint no pagina: solo `limit` (≤200) — el catálogo cerrado
 * `AUDIT_LIMITS` lo garantiza por diseño. `changes` es Json opaco →
 * `diffChanges()` lo parsea de forma DEFENSIVA (forma desconocida → null y
 * la UI cae a JSON crudo, nunca rompe la fila).
 */
import type { Schemas } from "@/core/api/types";

export type AuditLog = Schemas["AuditLogListDto"]["data"][number];
export type AuditActorType = AuditLog["actor_type"];

/** Opciones del filtro "últimos N" (≤200 por contrato del backend). */
export const AUDIT_LIMITS = [50, 100, 200] as const;
export const DEFAULT_AUDIT_LIMIT = 100;

/** Acciones conocidas para el combobox agrupado (spec §3.5). Las ~70 de
    dominio (`dominio.verbo`) no se enumeran: entrada libre en la UI. */
export const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: "Plataforma",
    actions: [
      "platform.tenant_created",
      "platform.tenant_updated",
      "platform.tenant_limits_replaced",
      "platform.pricing_created",
      "platform.pricing_updated",
      "platform.plan_created",
      "platform.plan_updated",
      "platform.tenant_plan_assigned",
      "platform.tenant_database_updated",
      "platform.tenant_database_validated",
      "platform.tenant_database_provision_requested",
      "platform.tenant_database_disabled",
      "platform.tenant_data_migration_started",
    ],
  },
  {
    label: "Autenticación",
    actions: [
      "auth.login",
      "auth.login_failed",
      "auth.logout",
      "auth.platform_login",
      "auth.platform_login_failed",
      "auth.token_reuse_detected",
    ],
  },
  {
    label: "Tenancy",
    actions: ["tenancy.bypass_used", "tenancy.impersonation_used"],
  },
];

/** Eventos de riesgo: la fila se marca con borde rojo sutil (spec §5.7). */
export const RISK_ACTIONS = new Set([
  "auth.token_reuse_detected",
  "tenancy.bypass_used",
  "tenancy.impersonation_used",
  "auth.platform_login_failed",
]);

/** Tono visual por tipo de actor (violeta = plataforma, azul = sistema). */
export const ACTOR_TONES: Record<AuditActorType, "violet" | "neutral" | "info"> = {
  platform_admin: "violet",
  user: "neutral",
  system: "info",
};

// ─── Diff del campo `changes` (Json opaco) ──────────────────────────────────

export type DiffRow = {
  field: string;
  before: string;
  after: string;
};

function printable(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Convierte `changes` en filas campo → antes → después. Soporta las formas
 * habituales del backend; devuelve `null` si no reconoce la estructura.
 *  1. `{ campo: [antes, después] }`
 *  2. `{ campo: { from, to } }`
 *  3. `{ before: {...}, after: {...} }`
 */
export function diffChanges(changes: unknown): DiffRow[] | null {
  if (!isRecord(changes)) return null;

  // Forma 3: objetos before/after completos, alineados por campo.
  if (isRecord(changes.before) || isRecord(changes.after)) {
    const before = isRecord(changes.before) ? changes.before : {};
    const after = isRecord(changes.after) ? changes.after : {};
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    if (fields.length === 0) return null;
    return fields.map((field) => ({
      field,
      before: printable(before[field]),
      after: printable(after[field]),
    }));
  }

  const rows: DiffRow[] = [];
  for (const [field, value] of Object.entries(changes)) {
    if (Array.isArray(value) && value.length === 2) {
      rows.push({ field, before: printable(value[0]), after: printable(value[1]) });
      continue;
    }
    if (isRecord(value) && ("from" in value || "to" in value)) {
      rows.push({ field, before: printable(value.from), after: printable(value.to) });
      continue;
    }
    // Cualquier entrada con otra forma invalida el diff completo (mejor JSON crudo).
    return null;
  }

  return rows.length > 0 ? rows : null;
}
