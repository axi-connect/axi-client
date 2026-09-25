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
    features: (id: string) => [...platformKeys.tenants.all, id, "features"] as const,
    /** Agentes IA del tenant (herramientas de calidad: wizard y simulacro). */
    agents: (id: string, status?: string) =>
      [...platformKeys.tenants.all, id, "agents", status ?? "all"] as const,
    voice: (id: string) => [...platformKeys.tenants.all, id, "voice"] as const,
    migrations: (id: string) => [...platformKeys.tenants.all, id, "migrations"] as const,
    /** Registro de sesiones de soporte del tenant (entrega F3). */
    supportSessions: (id: string) => [...platformKeys.tenants.all, id, "support-sessions"] as const,
  },

  // «Preparar entrega» (entrega_bienvenida_plan.md, F4). Cuelga del tenant:
  // invalidar la entrega no toca la lista. Las vistas previas llevan el
  // borrador en la key: cada borrador distinto es una consulta distinta.
  delivery: {
    all: (tenantId: string) => ["platform", "delivery", tenantId] as const,
    context: (tenantId: string) => [...platformKeys.delivery.all(tenantId), "context"] as const,
    latest: (tenantId: string) => [...platformKeys.delivery.all(tenantId), "latest"] as const,
    trialProgress: (tenantId: string) => [...platformKeys.delivery.all(tenantId), "trial-progress"] as const,
    preview: (tenantId: string, draft: unknown) =>
      [...platformKeys.delivery.all(tenantId), "preview", draft] as const,
    offerQuote: (tenantId: string, selection: unknown) =>
      [...platformKeys.delivery.all(tenantId), "offer-quote", selection] as const,
    offerCatalog: () => ["platform", "offer-catalog"] as const,
  },

  plans: {
    all: ["platform", "plans"] as const,
    list: () => [...platformKeys.plans.all, "list"] as const,
  },

  // Puesta en marcha conversacional. Los guiones y las entrevistas se
  // invalidan por separado: editar un guion no cambia ninguna entrevista en
  // curso (cada una congela su copia), y aplicar una no toca el catálogo.
  intake: {
    all: ["platform", "intake"] as const,
    blueprints: () => [...platformKeys.intake.all, "blueprints"] as const,
    blueprint: (id: string) => [...platformKeys.intake.all, "blueprints", id] as const,
    sessions: (filters: { status?: string; company_id?: string }) =>
      [...platformKeys.intake.all, "sessions", filters] as const,
    session: (id: string) => [...platformKeys.intake.all, "sessions", id] as const,
    applyPlan: (id: string) => [...platformKeys.intake.all, "sessions", id, "apply"] as const,
    ladder: (companyId: string) => [...platformKeys.intake.all, "ladder", companyId] as const,
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
    // Catálogo de dos ejes (Tanda A2): tramos, promociones, parámetros y la
    // previsualización pública a una fecha.
    tiers: () => [...platformKeys.billing.all, "tiers"] as const,
    promotions: () => [...platformKeys.billing.all, "promotions"] as const,
    parameters: () => [...platformKeys.billing.all, "parameters"] as const,
    preview: (at?: string) => [...platformKeys.billing.all, "preview", at ?? "now"] as const,
    // Consola de margen (Tanda C): muestra real, celdas evaluadas y parámetros declarados.
    marginSample: (windowDays: number, companyId?: string, planCode?: string) =>
      [...platformKeys.billing.all, "margin", "sample", windowDays, companyId ?? "all", planCode ?? "all"] as const,
    marginCells: (windowDays: number) => [...platformKeys.billing.all, "margin", "cells", windowDays] as const,
    gatewayFees: () => [...platformKeys.billing.all, "gateway-fees"] as const,
    capabilityCosts: () => [...platformKeys.billing.all, "capability-costs"] as const,
    acquisitionCosts: () => [...platformKeys.billing.all, "acquisition-costs"] as const,
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
    // Simulacro interactivo (upgrade F1): sesiones = runs kind interactive
    // con su propio read-side. El detalle se pollea; la traza se refresca al
    // crecer el transcript.
    // Datasets etiquetados + probes (upgrade F4)
    datasets: {
      all: ["platform", "quality", "datasets"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...platformKeys.quality.datasets.all, "list", filters ?? {}] as const,
      detail: (id: string) => [...platformKeys.quality.datasets.all, id] as const,
      items: (id: string, filters?: Record<string, unknown>) =>
        [...platformKeys.quality.datasets.all, id, "items", filters ?? {}] as const,
    },
    capabilities: (companyId: string) => ["platform", "quality", "capabilities", companyId] as const,
    probeResults: (runId: string, filters?: Record<string, unknown>) =>
      [...platformKeys.quality.runs.all, runId, "probe-results", filters ?? {}] as const,
    tenantLookup: {
      catalog: (companyId: string, q: string) =>
        ["platform", "quality", "tenants", companyId, "catalog", q] as const,
      intentions: (companyId: string) => ["platform", "quality", "tenants", companyId, "intentions"] as const,
    },
    sessions: {
      all: ["platform", "quality", "sessions"] as const,
      list: (filters?: Record<string, unknown>) =>
        [...platformKeys.quality.sessions.all, "list", filters ?? {}] as const,
      detail: (id: string) => [...platformKeys.quality.sessions.all, id] as const,
      trace: (id: string) => [...platformKeys.quality.sessions.all, id, "trace"] as const,
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
