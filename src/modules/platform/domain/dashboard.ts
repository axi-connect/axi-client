/**
 * Cifras del Inicio de la consola. No hay endpoints de agregados: todo se
 * deriva en el cliente de la lista de empresas (spec §5.1). TypeScript puro.
 */
import type { TenantListItem } from "./tenant";

export const TRIAL_SOON_DAYS = 7;
const DAY_MS = 86_400_000;

export type TenantStats = {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  users: number;
};

export function tenantStats(tenants: readonly TenantListItem[], total?: number): TenantStats {
  return {
    total: total ?? tenants.length,
    active: tenants.filter((t) => t.status === "active").length,
    trial: tenants.filter((t) => t.status === "trial").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
    users: tenants.reduce((sum, t) => sum + t.users_count, 0),
  };
}

export type TrialEnding = { tenant: TenantListItem; daysLeft: number };

/**
 * Pruebas que vencen en los próximos `days` días (de `trial_ends_at`), la más
 * cercana primero. Una prueba ya vencida no está aquí: el servidor la pasa a
 * suspendida por `trial_expired`.
 */
export function trialsEndingSoon(
  tenants: readonly TenantListItem[],
  now = Date.now(),
  days = TRIAL_SOON_DAYS,
): TrialEnding[] {
  return tenants
    .filter((t) => t.status === "trial" && t.trial_ends_at !== null)
    .map((tenant) => ({ tenant, ends: Date.parse(tenant.trial_ends_at!) }))
    .filter(({ ends }) => Number.isFinite(ends) && ends >= now && ends - now <= days * DAY_MS)
    .sort((a, b) => a.ends - b.ends)
    .map(({ tenant, ends }) => ({ tenant, daysLeft: Math.max(0, Math.floor((ends - now) / DAY_MS)) }));
}

/** «vence hoy», «vence mañana», «vence en 4 días». */
export function trialEndsPhrase(daysLeft: number): string {
  if (daysLeft <= 0) return "vence hoy";
  if (daysLeft === 1) return "vence mañana";
  return `vence en ${String(daysLeft)} días`;
}

/** Las empresas creadas más recientemente. */
export function recentTenants(tenants: readonly TenantListItem[], count = 5): TenantListItem[] {
  return [...tenants].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, count);
}

/** La fecha más reciente de una lista de ISO (el orden del servidor no se da por hecho). */
export function latestIso(values: readonly string[]): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const value of values) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms) && ms > bestMs) {
      best = value;
      bestMs = ms;
    }
  }
  return best;
}

/** «Café Montaña, Moda Lúa y Óptica Visión Clara» (con «y N más» si pasan de `max`). */
export function joinNames(names: readonly string[], max = 3): string {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} y ${String(rest)} más`;
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} y ${shown[shown.length - 1]!}`;
}
