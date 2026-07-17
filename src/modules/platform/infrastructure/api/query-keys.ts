/**
 * Árbol de query keys del panel de plataforma. Toda query/invalidación usa
 * estas factories (nunca arrays ad-hoc) para que `invalidateQueries` por
 * recurso sea confiable. Se puebla fase a fase (FE2+ añade params).
 */
export const platformKeys = {
  all: ["platform"] as const,

  tenants: {
    all: ["platform", "tenants"] as const,
    list: () => [...platformKeys.tenants.all, "list"] as const,
    detail: (id: string) => [...platformKeys.tenants.all, id] as const,
    users: (id: string) => [...platformKeys.tenants.all, id, "users"] as const,
    plan: (id: string) => [...platformKeys.tenants.all, id, "plan"] as const,
    limits: (id: string) => [...platformKeys.tenants.all, id, "limits"] as const,
    database: (id: string) => [...platformKeys.tenants.all, id, "database"] as const,
    migrations: (id: string) => [...platformKeys.tenants.all, id, "migrations"] as const,
  },

  plans: {
    all: ["platform", "plans"] as const,
    list: () => [...platformKeys.plans.all, "list"] as const,
  },

  pricing: {
    all: ["platform", "pricing"] as const,
    list: () => [...platformKeys.pricing.all, "list"] as const,
  },

  audit: {
    all: ["platform", "audit"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...platformKeys.audit.all, "list", filters ?? {}] as const,
  },

  analytics: {
    all: ["platform", "analytics"] as const,
    agentsHealth: (days: number) => [...platformKeys.analytics.all, "agents-health", days] as const,
    alerts: (status: string) => [...platformKeys.analytics.all, "alerts", status] as const,
  },
} as const;
