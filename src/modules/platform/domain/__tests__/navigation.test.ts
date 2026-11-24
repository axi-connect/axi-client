import {
  breadcrumbFor,
  isNavItemActive,
  navGroupFor,
  PLATFORM_NAV,
  PLATFORM_NAV_SECTIONS,
  sortByLabelLength,
} from "../navigation";

/**
 * Rediseño F1 (aprobado 2026-11-24): seis grupos en su orden; dentro de cada
 * uno, de menor a mayor longitud (la regla del menú del tenant).
 */
describe("navegación de platform en seis grupos", () => {
  it("los grupos aprobados, en su orden, e Inicio solo arriba sin título", () => {
    expect(PLATFORM_NAV_SECTIONS.map((section) => section.title)).toEqual([
      null,
      "Clientes",
      "Dinero",
      "Operación",
      "IA",
      "Control",
    ]);
    expect(PLATFORM_NAV_SECTIONS[0]?.items.map((item) => item.label)).toEqual(["Inicio"]);
  });

  it("«Empresas» e «Inicio», nunca «Tenants» ni «Dashboard»", () => {
    const labels = PLATFORM_NAV.map((item) => item.label);
    expect(labels).toContain("Empresas");
    expect(labels).not.toContain("Tenants");
    expect(labels).not.toContain("Dashboard");
  });

  it("dentro de cada grupo los ítems van de menor a mayor longitud (invariante para TODOS)", () => {
    for (const section of PLATFORM_NAV_SECTIONS) {
      const lengths = section.items.map((item) => item.label.length);
      expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    }
    const byTitle = (title: string) =>
      PLATFORM_NAV_SECTIONS.find((section) => section.title === title)?.items.map((item) => item.label);
    expect(byTitle("Clientes")).toEqual(["Empresas", "Puesta en marcha"]);
    expect(byTitle("Dinero")).toEqual(["Planes", "Pricing IA", "Facturación"]);
    expect(byTitle("Operación")).toEqual(["Llamadas", "Proveedores", "Almacenamiento"]);
    expect(byTitle("IA")).toEqual(["Calidad", "Voces IA", "Decisiones"]);
    expect(byTitle("Control")).toEqual(["Analytics", "Auditoría"]);
  });

  it("los grupos cubren las 14 rutas de la consola sin repetir ninguna (nada se pierde)", () => {
    const paths = PLATFORM_NAV.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.sort()).toEqual(
      [
        "/platform",
        "/platform/ai",
        "/platform/analytics",
        "/platform/audit",
        "/platform/billing",
        "/platform/calls",
        "/platform/intake",
        "/platform/plans",
        "/platform/pricing",
        "/platform/prospecting",
        "/platform/quality",
        "/platform/storage",
        "/platform/tenants",
        "/platform/voices",
      ].sort(),
    );
  });

  it("sortByLabelLength es estable: el empate conserva el orden de declaración", () => {
    const sorted = sortByLabelLength([{ label: "bbb" }, { label: "a" }, { label: "ccc" }, { label: "dd" }]);
    expect(sorted.map((item) => item.label)).toEqual(["a", "dd", "bbb", "ccc"]);
  });

  it("Inicio solo se activa en exacto; el resto también por prefijo", () => {
    expect(isNavItemActive("/platform", "/platform")).toBe(true);
    expect(isNavItemActive("/platform", "/platform/tenants")).toBe(false);
    expect(isNavItemActive("/platform/tenants", "/platform/tenants/abc/users")).toBe(true);
    expect(isNavItemActive("/platform/ai", "/platform/aix")).toBe(false);
  });

  it("el antetítulo de cada página es su grupo", () => {
    expect(navGroupFor("/platform")).toBe("Inicio");
    expect(navGroupFor("/platform/tenants")).toBe("Clientes");
    expect(navGroupFor("/platform/prospecting")).toBe("Operación");
    expect(navGroupFor("/platform/billing/prices")).toBe("Dinero");
    expect(navGroupFor("/platform/desconocida")).toBeNull();
  });
});

describe("breadcrumbFor: ninguna miga cruda", () => {
  const ID = "01a2f3c4-0000-4000-8000-000000000001";
  const labels = (path: string) => breadcrumbFor(path).map((crumb) => crumb.label);

  it("arregla «features» y «entrega», que salían crudos", () => {
    expect(labels(`/platform/tenants/${ID}/features`)).toEqual(["Empresas", "Empresa", "Funciones"]);
    expect(labels(`/platform/tenants/${ID}/entrega`)).toEqual(["Empresas", "Empresa", "Preparar entrega"]);
  });

  it("la empresa lleva su id para poner el nombre, y el último tramo no enlaza", () => {
    const crumbs = breadcrumbFor(`/platform/tenants/${ID}/plan`);
    expect(crumbs[1]).toEqual({ label: "Empresa", href: `/platform/tenants/${ID}`, tenantId: ID });
    expect(crumbs[2]).toEqual({ label: "Plan y límites", href: null });
  });

  it("las secciones de Facturación y Calidad tienen nombre", () => {
    expect(labels("/platform/billing/prices")).toEqual(["Facturación", "Tarifas"]);
    expect(labels("/platform/billing/public")).toEqual(["Facturación", "Vista pública"]);
    expect(labels("/platform/quality/runs/new")).toEqual(["Calidad", "Ejecuciones", "Nueva ejecución"]);
    expect(labels(`/platform/quality/datasets/${ID}`)).toEqual(["Calidad", "Datasets", "Mesa de etiquetado"]);
  });

  it("«cases» no tiene página: se salta, y el caso cuelga de su ejecución", () => {
    const crumbs = breadcrumbFor(`/platform/quality/runs/${ID}/cases/${ID}`);
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Calidad", "Ejecuciones", "Ejecución", "Caso"]);
    expect(crumbs[2]?.href).toBe(`/platform/quality/runs/${ID}`);
  });

  it("«new» de empresas es «Nueva empresa»; un nivel solo da una miga", () => {
    expect(labels("/platform/tenants/new")).toEqual(["Empresas", "Nueva empresa"]);
    expect(labels("/platform/calls")).toEqual(["Llamadas"]);
    expect(labels("/platform")).toEqual([]);
  });

  it("un segmento que nadie registró cae a «Detalle», nunca al código", () => {
    expect(labels("/platform/billing/algo-nuevo")).toEqual(["Facturación", "Detalle"]);
    expect(labels(`/platform/tenants/${ID}/algo-nuevo`)).toEqual(["Empresas", "Empresa", "Detalle"]);
  });
});
