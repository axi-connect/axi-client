import type { TenantListItem } from "../../../../domain/tenant";
import { countriesIn, DEFAULT_TENANTS_FILTER, filterTenants } from "../tenants-filter";

const tenant = (over: Partial<TenantListItem>): TenantListItem => ({
  id: "t-x",
  name: "Empresa",
  nit: "900000000",
  status: "active",
  city: null,
  country_code: "CO",
  users_count: 1,
  created_at: "2026-07-01T00:00:00Z",
  ...over,
});

const ITEMS: TenantListItem[] = [
  tenant({ id: "t-1", name: "Acme Corp", nit: "900123456", users_count: 12, created_at: "2026-06-12T00:00:00Z" }),
  tenant({ id: "t-2", name: "Beta Foods", nit: "901987654", status: "trial", created_at: "2026-07-10T00:00:00Z" }),
  tenant({ id: "t-3", name: "Gamma Retail", nit: "830456789", status: "suspended", country_code: "MX", users_count: 8, created_at: "2026-05-01T00:00:00Z" }),
];

describe("filterTenants", () => {
  it("default: sin filtros, ordena por created_at desc", () => {
    const result = filterTenants(ITEMS, DEFAULT_TENANTS_FILTER);
    expect(result.map((t) => t.id)).toEqual(["t-2", "t-1", "t-3"]);
  });

  it("busca por nombre sin distinguir mayúsculas", () => {
    const result = filterTenants(ITEMS, {
      ...DEFAULT_TENANTS_FILTER,
      search: { field: "name", value: "  acme " },
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Acme Corp");
  });

  it("busca por NIT parcial", () => {
    const result = filterTenants(ITEMS, {
      ...DEFAULT_TENANTS_FILTER,
      search: { field: "nit", value: "83045" },
    });
    expect(result.map((t) => t.id)).toEqual(["t-3"]);
  });

  it("combina facets de estado y país", () => {
    expect(filterTenants(ITEMS, { ...DEFAULT_TENANTS_FILTER, status: "suspended" })).toHaveLength(1);
    expect(filterTenants(ITEMS, { ...DEFAULT_TENANTS_FILTER, country: "CO" })).toHaveLength(2);
    expect(
      filterTenants(ITEMS, { ...DEFAULT_TENANTS_FILTER, status: "trial", country: "MX" }),
    ).toHaveLength(0);
  });

  it("ordena por columna numérica asc/desc", () => {
    const asc = filterTenants(ITEMS, { ...DEFAULT_TENANTS_FILTER, sort: { by: "users_count", dir: "asc" } });
    expect(asc.map((t) => t.users_count)).toEqual([1, 8, 12]);
    const desc = filterTenants(ITEMS, { ...DEFAULT_TENANTS_FILTER, sort: { by: "users_count", dir: "desc" } });
    expect(desc.map((t) => t.users_count)).toEqual([12, 8, 1]);
  });
});

describe("countriesIn", () => {
  it("extrae países únicos ordenados", () => {
    expect(countriesIn(ITEMS)).toEqual(["CO", "MX"]);
  });
});
