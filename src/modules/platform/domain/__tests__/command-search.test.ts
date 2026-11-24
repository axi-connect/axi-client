import { normalize, searchConsole } from "../command-search";
import type { TenantListItem } from "../tenant";

function tenant(id: string, name: string, nit: string, status: TenantListItem["status"] = "active", city: string | null = null) {
  return {
    id,
    name,
    nit,
    status,
    status_reason: null,
    trial_ends_at: null,
    city,
    country_code: "CO",
    users_count: 1,
    created_at: "2026-11-01T00:00:00Z",
  } satisfies TenantListItem;
}

const TENANTS = [
  tenant("t1", "Norte Studio", "901.482.337-5", "trial", "Medellín"),
  tenant("t2", "Nortesur Logística", "900.111.222-3", "active", "Bogotá"),
  tenant("t3", "Café Montaña SAS", "900.771.204-1"),
];

describe("buscador global (Ctrl K)", () => {
  it("sin texto ofrece las vistas del menú", () => {
    const result = searchConsole("", TENANTS);
    expect(result.tenants).toEqual([]);
    expect(result.views.map((hit) => hit.label)).toContain("Empresas");
    expect(result.views.map((hit) => hit.label)).toContain("Proveedores");
  });

  it("encuentra empresas por nombre sin tildes ni mayúsculas, con su estado y ciudad", () => {
    const result = searchConsole("NORTE", TENANTS);
    expect(result.tenants.map((hit) => hit.label)).toEqual(["Norte Studio", "Nortesur Logística"]);
    expect(result.tenants[0]).toMatchObject({ hint: "En prueba · Medellín", href: "/platform/tenants/t1" });
    expect(searchConsole("cafe montana", TENANTS).tenants.map((hit) => hit.label)).toEqual(["Café Montaña SAS"]);
  });

  it("encuentra por NIT con o sin puntos", () => {
    expect(searchConsole("900771204", TENANTS).tenants.map((hit) => hit.id)).toEqual(["tenant:t3"]);
    expect(searchConsole("901.482", TENANTS).tenants.map((hit) => hit.id)).toEqual(["tenant:t1"]);
  });

  it("encuentra vistas y pestañas por su nombre", () => {
    const labels = searchConsole("tarifas", TENANTS).views.map((hit) => hit.label);
    expect(labels).toContain("Tarifas");
    expect(searchConsole("auditoria", []).views.map((hit) => hit.href)).toContain("/platform/audit");
  });

  it("«norte audit» ofrece la Auditoría de cada empresa que se llama así", () => {
    const views = searchConsole("norte audit", TENANTS).views;
    expect(views.map((hit) => hit.label)).toEqual(["Auditoría de Norte Studio", "Auditoría de Nortesur Logística"]);
    expect(views[0]).toMatchObject({ hint: "Empresa › Auditoría", href: "/platform/tenants/t1/audit" });
  });

  it("si queda UNA sola empresa, se ofrecen sus secciones (sin repetir su portada)", () => {
    const result = searchConsole("norte studio", TENANTS);
    expect(result.tenants).toHaveLength(1);
    const labels = result.views.map((hit) => hit.label);
    expect(labels).toContain("Usuarios de Norte Studio");
    expect(labels).not.toContain("Resumen de Norte Studio");
  });

  it("nada coincide → listas vacías", () => {
    expect(searchConsole("zzzz", TENANTS)).toEqual({ tenants: [], views: [] });
  });

  it("normalize quita tildes y mayúsculas", () => {
    expect(normalize("  Auditoría ")).toBe("auditoria");
  });
});
