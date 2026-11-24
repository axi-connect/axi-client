/**
 * El buscador global de la consola (Ctrl K). Sin endpoint nuevo: busca en la
 * lista de empresas que ya está en caché y en las vistas del menú. TypeScript
 * puro (la UI solo pinta los grupos que devuelve).
 */
import {
  BILLING_SECTION_LABELS,
  PLATFORM_NAV,
  PLATFORM_NAV_SECTIONS,
  QUALITY_SECTION_LABELS,
  TENANT_SECTION_LABELS,
} from "./navigation";
import { TENANT_STATUS_LABELS } from "./labels";
import type { TenantListItem } from "./tenant";

export type CommandHit = {
  id: string;
  label: string;
  /** El contexto a la derecha: «En prueba · Medellín», «Empresa › Auditoría». */
  hint: string;
  href: string;
  icon: string;
};

export type CommandResults = { tenants: CommandHit[]; views: CommandHit[] };

/** Minúsculas y sin tildes: «auditoria» encuentra «Auditoría». */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function tokens(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

type ViewEntry = { label: string; hint: string; href: string; icon: string };

/** Todas las vistas que se pueden abrir: el menú y las pestañas de Facturación y Calidad. */
export const CONSOLE_VIEWS: readonly ViewEntry[] = [
  ...PLATFORM_NAV.map((item) => ({
    label: item.label,
    hint: PLATFORM_NAV_SECTIONS.find((s) => s.items.includes(item))?.title ?? "Inicio",
    href: item.path,
    icon: item.icon,
  })),
  { label: "Nueva empresa", hint: "Clientes › Empresas", href: "/platform/tenants/new", icon: "plus" },
  ...Object.entries(BILLING_SECTION_LABELS).map(([segment, label]) => ({
    label,
    hint: "Dinero › Facturación",
    href: `/platform/billing/${segment}`,
    icon: "receipt",
  })),
  { label: "Cartera", hint: "Dinero › Facturación", href: "/platform/billing", icon: "receipt" },
  ...Object.entries(QUALITY_SECTION_LABELS).map(([segment, label]) => ({
    label,
    hint: "IA › Calidad",
    href: `/platform/quality/${segment}`,
    icon: "flask-conical",
  })),
];

const TENANT_SECTIONS: readonly { segment: string; label: string }[] = [
  { segment: "", label: "Resumen" },
  ...Object.entries(TENANT_SECTION_LABELS).map(([segment, label]) => ({ segment, label })),
];

function matchesAll(haystack: string, words: readonly string[]): boolean {
  return words.every((word) => haystack.includes(word));
}

function tenantHaystack(tenant: TenantListItem): string {
  return normalize(`${tenant.name} ${tenant.nit} ${tenant.nit.replace(/\D/g, "")}`);
}

function tenantHint(tenant: TenantListItem): string {
  const status = TENANT_STATUS_LABELS[tenant.status] ?? tenant.status;
  return tenant.city ? `${status} · ${tenant.city}` : status;
}

/**
 * - Empresas: las que contienen TODAS las palabras en su nombre o NIT.
 * - Vistas: las que contienen todas las palabras en su nombre o su grupo.
 * - Secciones de una empresa («Auditoría de Norte Studio»): cuando unas
 *   palabras nombran a la empresa y las demás a la sección («norte audit»), o
 *   cuando la búsqueda deja UNA sola empresa (se ofrecen todas sus secciones).
 */
export function searchConsole(
  query: string,
  tenants: readonly TenantListItem[],
  limits: { tenants: number; views: number } = { tenants: 6, views: 8 },
): CommandResults {
  const words = tokens(query);
  if (words.length === 0) {
    return {
      tenants: [],
      views: CONSOLE_VIEWS.slice(0, PLATFORM_NAV.length).map((view) => ({ id: `view:${view.label}:${view.href}`, ...view })),
    };
  }

  const tenantHits = tenants.filter((tenant) => matchesAll(tenantHaystack(tenant), words));
  const viewHits = CONSOLE_VIEWS.filter((view) => matchesAll(normalize(`${view.label} ${view.hint}`), words));

  const sectionHits: CommandHit[] = [];
  const pushSections = (tenant: TenantListItem, rest: readonly string[]) => {
    for (const section of TENANT_SECTIONS) {
      if (rest.length > 0 && !matchesAll(normalize(section.label), rest)) continue;
      sectionHits.push({
        id: `tenant:${tenant.id}:${section.segment}`,
        label: section.segment === "" ? `Resumen de ${tenant.name}` : `${section.label} de ${tenant.name}`,
        hint: `Empresa › ${section.label}`,
        href: `/platform/tenants/${tenant.id}${section.segment ? `/${section.segment}` : ""}`,
        icon: "building-2",
      });
    }
  };

  if (tenantHits.length === 1) {
    pushSections(tenantHits[0]!, []);
  } else if (words.length > 1) {
    // Partir la búsqueda: las primeras palabras por la empresa, el resto por la sección.
    for (let cut = words.length - 1; cut >= 1 && sectionHits.length === 0; cut -= 1) {
      const head = words.slice(0, cut);
      const rest = words.slice(cut);
      for (const tenant of tenants) {
        if (matchesAll(tenantHaystack(tenant), head)) pushSections(tenant, rest);
      }
    }
  }

  return {
    tenants: tenantHits.slice(0, limits.tenants).map((tenant) => ({
      id: `tenant:${tenant.id}`,
      label: tenant.name,
      hint: tenantHint(tenant),
      href: `/platform/tenants/${tenant.id}`,
      icon: "building-2",
    })),
    views: [
      ...viewHits.map((view) => ({ id: `view:${view.label}:${view.href}`, ...view })),
      // Sin la portada de la empresa repetida: ya sale arriba como empresa.
      ...sectionHits.filter((hit) => !(tenantHits.length === 1 && hit.href === `/platform/tenants/${tenantHits[0]!.id}`)),
    ].slice(0, limits.views),
  };
}
