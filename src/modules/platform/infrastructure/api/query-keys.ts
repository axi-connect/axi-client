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

  // Curaduría del catálogo de voces (§10.5): una sola lista, sin filtros —
  // el catálogo es corto por diseño.
  voices: {
    all: ["platform", "voices"] as const,
    list: () => [...platformKeys.voices.all, "list"] as const,
  },

  // Facturación de la licencia (billing_frontend_plan.md F2). La cartera pagina
  // en server: los filtros (page incluido) viajan en la key. La ficha del tenant
  // cuelga de su id para que invalidarla no toque la cartera.
  billing: {
    all: ["platform", "billing"] as const,
    invoices: (filters?: Record<string, unknown>) =>
      [...platformKeys.billing.all, "invoices", filters ?? {}] as const,
    prices: (planId?: string) =>
      [...platformKeys.billing.all, "prices", planId ?? "all"] as const,
    tenant: (id: string) => [...platformKeys.billing.all, "tenant", id] as const,
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

  // Módulo Calidad (quality_frontend_implementation_plan.md). Las listas
  // paginan en server: los filtros (page incluido) viajan en la key.
  quality: {
    all: ["platform", "quality"] as const,
    scenarios: {
      all: ["platform", "quality", "scenarios"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...platformKeys.quality.scenarios.all, "list", filters ?? {}] as const,
      detail: (id: string) => [...platformKeys.quality.scenarios.all, id] as const,
    },
    suites: {
      all: ["platform", "quality", "suites"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...platformKeys.quality.suites.all, "list", filters ?? {}] as const,
      detail: (id: string) => [...platformKeys.quality.suites.all, id] as const,
    },
    runs: {
      all: ["platform", "quality", "runs"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...platformKeys.quality.runs.all, "list", filters ?? {}] as const,
      detail: (id: string) => [...platformKeys.quality.runs.all, id] as const,
      case: (runId: string, caseId: string) =>
        [...platformKeys.quality.runs.all, runId, "cases", caseId] as const,
    },
    debug: {
      all: ["platform", "quality", "debug"] as const,
      contacts: (companyId: string, search: string) =>
        [...platformKeys.quality.debug.all, companyId, "contacts", search] as const,
      conversations: (companyId: string, contactId: string) =>
        [...platformKeys.quality.debug.all, companyId, "contacts", contactId, "conversations"] as const,
    },
  },

  // Proveedores externos de la captación de leads (prospecting F3). La lista
  // trae saldo y salud, así que se refresca al volver a la pestaña.
  prospecting: {
    all: ["platform", "prospecting"] as const,
    catalog: () => [...platformKeys.prospecting.all, "catalog"] as const,
    providers: () => [...platformKeys.prospecting.all, "providers"] as const,
  },

  calls: {
    all: ["platform", "calls"] as const,
    accounts: () => [...platformKeys.calls.all, "accounts"] as const,
    numbers: () => [...platformKeys.calls.all, "numbers"] as const,
    owned: (accountId: string) => [...platformKeys.calls.all, "owned", accountId] as const,
    ownedCallerIds: (accountId: string) =>
      [...platformKeys.calls.all, "caller-ids", accountId] as const,
    tenantAgents: (companyId: string) =>
      [...platformKeys.calls.all, "tenants", companyId, "agents"] as const,
  },
} as const;
