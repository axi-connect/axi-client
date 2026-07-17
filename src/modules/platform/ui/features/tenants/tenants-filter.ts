/**
 * Filtro/orden client-side de la lista de tenants (el endpoint no pagina ni
 * filtra). Helper PURO: el `DataTable` compartido solo pagina en modo
 * cliente — buscar, facetar y ordenar es responsabilidad del contenedor,
 * y aquí vive para poder testearlo sin render.
 */
import type { TenantListItem, TenantStatus } from "../../../domain/tenant";
import { sortRows } from "../../lib/sort-rows";

export type TenantsSearchField = "name" | "nit";

export type TenantsFilterState = {
  search: { field: TenantsSearchField; value: string };
  status: TenantStatus | "all";
  country: string | "all";
  sort: { by: keyof TenantListItem & string; dir: "asc" | "desc" };
};

export const DEFAULT_TENANTS_FILTER: TenantsFilterState = {
  search: { field: "name", value: "" },
  status: "all",
  country: "all",
  sort: { by: "created_at", dir: "desc" },
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function filterTenants(items: TenantListItem[], state: TenantsFilterState): TenantListItem[] {
  const query = normalize(state.search.value);

  const filtered = items.filter((tenant) => {
    if (state.status !== "all" && tenant.status !== state.status) return false;
    if (state.country !== "all" && tenant.country_code !== state.country) return false;
    if (query && !normalize(tenant[state.search.field]).includes(query)) return false;
    return true;
  });

  return sortRows(filtered, state.sort.by, state.sort.dir);
}

/** Países presentes en la data (para el facet, sin catálogo hardcodeado). */
export function countriesIn(items: TenantListItem[]): string[] {
  return [...new Set(items.map((t) => t.country_code))].sort((a, b) => a.localeCompare(b));
}
