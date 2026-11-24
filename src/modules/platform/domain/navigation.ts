/**
 * Navegación estática del panel de plataforma. No hay RBAC granular
 * (PlatformGuard binario): las secciones se muestran siempre.
 * El icono va como nombre lucide (string) — dominio puro, sin React;
 * la UI lo resuelve con su propio mapa (`PlatformSidebar`).
 *
 * Rediseño premium F1 (aprobado por Cristian el 2026-11-24): seis grupos
 * —Inicio · Clientes · Dinero · Operación · IA · Control—, «Empresas» en vez
 * de «Tenants» e «Inicio» en vez de «Dashboard».
 *
 * Dos reglas del dueño que no se pelean:
 * - Los GRUPOS van en el orden en que se declaran aquí: es intención.
 * - DENTRO de cada grupo los ítems se ordenan de menor a mayor longitud del
 *   texto (`sortByLabelLength`), la misma regla del menú del tenant. Un ítem
 *   nuevo se coloca solo y el test de invariante lo vigila.
 */
export type PlatformNavItem = {
  label: string;
  path: string;
  icon: string;
};

export type PlatformNavSection = {
  /** `null` = sin título (Inicio, solo arriba). */
  title: string | null;
  items: readonly PlatformNavItem[];
};

/** Orden estable por longitud del texto: el más corto primero; empate = orden de declaración. */
export function sortByLabelLength<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.label.length - b.label.length);
}

export const PLATFORM_HOME = "/platform";

const SECTIONS: readonly PlatformNavSection[] = [
  { title: null, items: [{ label: "Inicio", path: PLATFORM_HOME, icon: "layout-dashboard" }] },
  {
    // A quién atendemos: las empresas y su puesta en marcha.
    title: "Clientes",
    items: [
      { label: "Empresas", path: "/platform/tenants", icon: "building-2" },
      { label: "Puesta en marcha", path: "/platform/intake", icon: "message-circle-heart" },
    ],
  },
  {
    // Lo que cobramos (Planes, Facturación) y lo que nos cuesta la IA (Pricing).
    title: "Dinero",
    items: [
      { label: "Planes", path: "/platform/plans", icon: "layers" },
      { label: "Pricing IA", path: "/platform/pricing", icon: "circle-dollar-sign" },
      { label: "Facturación", path: "/platform/billing", icon: "receipt" },
    ],
  },
  {
    // La maquinaria: telefonía, fuentes de datos de la captación y el disco.
    title: "Operación",
    items: [
      { label: "Llamadas", path: "/platform/calls", icon: "phone" },
      { label: "Proveedores", path: "/platform/prospecting", icon: "plug" },
      { label: "Almacenamiento", path: "/platform/storage", icon: "hard-drive" },
    ],
  },
  {
    // La capacidad IA: cómo se evalúa, sus voces y qué proveedor decide.
    title: "IA",
    items: [
      { label: "Calidad", path: "/platform/quality", icon: "flask-conical" },
      { label: "Voces IA", path: "/platform/voices", icon: "audio-lines" },
      { label: "Decisiones", path: "/platform/ai", icon: "split" },
    ],
  },
  {
    // Lo que se vigila.
    title: "Control",
    items: [
      { label: "Analytics", path: "/platform/analytics", icon: "activity" },
      { label: "Auditoría", path: "/platform/audit", icon: "scroll-text" },
    ],
  },
];

export const PLATFORM_NAV_SECTIONS: readonly PlatformNavSection[] = SECTIONS.map((section) => ({
  ...section,
  items: sortByLabelLength(section.items),
}));

/** La lista plana, en el orden en que se muestra (para migas y buscadores). */
export const PLATFORM_NAV: PlatformNavItem[] = PLATFORM_NAV_SECTIONS.flatMap((section) => [...section.items]);

/** ¿Este ítem del menú es la ruta activa? Inicio solo en exacto; el resto también por prefijo. */
export function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === PLATFORM_HOME) return pathname === PLATFORM_HOME;
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

/** El ítem del menú al que pertenece una ruta (el más largo que la contiene). */
export function navItemFor(pathname: string): PlatformNavItem | null {
  const matches = PLATFORM_NAV.filter((item) => isNavItemActive(item.path, pathname));
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? null;
}

/** El antetítulo de una página: el nombre de su grupo («Clientes», «Operación»…); en Inicio, «Inicio». */
export function navGroupFor(pathname: string): string | null {
  const item = navItemFor(pathname);
  if (!item) return null;
  if (item.path === PLATFORM_HOME) return "Inicio";
  return PLATFORM_NAV_SECTIONS.find((section) => section.items.includes(item))?.title ?? null;
}

// ─── Migas de pan ───────────────────────────────────────────────────────────

/** Secciones de la ficha de una empresa (`/platform/tenants/{id}/…`). */
export const TENANT_SECTION_LABELS: Record<string, string> = {
  users: "Usuarios",
  plan: "Plan y límites",
  storage: "Almacenamiento",
  billing: "Facturación",
  features: "Funciones",
  voice: "Voz",
  database: "Base de datos",
  audit: "Auditoría",
  entrega: "Preparar entrega",
};

/** Pestañas de Facturación (`/platform/billing/…`). Cartera es la portada. */
export const BILLING_SECTION_LABELS: Record<string, string> = {
  prices: "Tarifas",
  tiers: "Tramos",
  promotions: "Promociones",
  parameters: "Parámetros",
  public: "Vista pública",
  margin: "Margen",
};

/** Secciones de Calidad (`/platform/quality/…`). */
export const QUALITY_SECTION_LABELS: Record<string, string> = {
  simulator: "Simulacro",
  runs: "Ejecuciones",
  scenarios: "Escenarios",
  suites: "Suites",
  datasets: "Datasets",
  capabilities: "Capacidades",
  debugger: "Depurador",
};

/** El nombre de cada detalle (segmento dinámico) según la colección de la que cuelga. */
const DETAIL_LABELS: Record<string, string> = {
  runs: "Ejecución",
  cases: "Caso",
  datasets: "Mesa de etiquetado",
  simulator: "Sesión",
};

/** «new» depende de la colección. */
const NEW_LABELS: Record<string, string> = {
  tenants: "Nueva empresa",
  runs: "Nueva ejecución",
};

/** Segmentos que no tienen página propia: se saltan (su detalle sí la tiene). */
const NO_PAGE = new Set(["cases"]);

export type Crumb = {
  label: string;
  /** null = el último o un tramo sin página propia (no se enlaza). */
  href: string | null;
  /** Una empresa: la UI pone su nombre desde la caché de la lista. */
  tenantId?: string;
};

/**
 * Migas legibles de una ruta de la consola, SIN «Plataforma» delante (el
 * menú ya dice dónde estás). Todos los segmentos tienen texto: nunca sale uno
 * crudo («features», «entrega», un UUID). Un segmento desconocido —una ruta
 * nueva que alguien olvidó registrar— cae a «Detalle», no al código.
 */
export function breadcrumbFor(pathname: string): Crumb[] {
  const parts = pathname.replace(/^\/platform\/?/, "").split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  const top = parts[0];
  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index]!;
    const parent = parts[index - 1] ?? "";
    const href = "/platform/" + parts.slice(0, index + 1).join("/");
    if (NO_PAGE.has(segment)) continue;
    let label: string;
    let tenantId: string | undefined;
    if (index === 0) {
      label = PLATFORM_NAV.find((item) => item.path === href)?.label ?? "Detalle";
    } else if (segment === "new") {
      label = NEW_LABELS[parent] ?? "Nuevo";
    } else if (top === "tenants" && index === 1) {
      label = "Empresa";
      tenantId = segment;
    } else if (top === "tenants" && index === 2) {
      label = TENANT_SECTION_LABELS[segment] ?? "Detalle";
    } else if (top === "billing" && index === 1) {
      label = BILLING_SECTION_LABELS[segment] ?? "Detalle";
    } else if (top === "quality" && index === 1) {
      label = QUALITY_SECTION_LABELS[segment] ?? "Detalle";
    } else {
      label = DETAIL_LABELS[parent] ?? "Detalle";
    }
    crumbs.push({ label, href, ...(tenantId ? { tenantId } : {}) });
  }
  const last = crumbs[crumbs.length - 1];
  if (last) last.href = null;
  return crumbs;
}
