import { PLATFORM_NAV, PLATFORM_NAV_SECTIONS, sortByLabelLength } from "../navigation";

/**
 * Las dos reglas del dueño (2026-09-21): secciones en orden de declaración;
 * dentro de cada una, de menor a mayor longitud (la regla del menú del tenant).
 */
describe("navegación de platform por secciones", () => {
  it("las secciones aprobadas, en su orden, y Dashboard solo arriba sin título", () => {
    expect(PLATFORM_NAV_SECTIONS.map((section) => section.title)).toEqual([null, "Operación", "Dinero", "IA", "Control", "Configuración"]);
    expect(PLATFORM_NAV_SECTIONS[0]?.items.map((item) => item.label)).toEqual(["Dashboard"]);
  });

  it("dentro de cada sección los ítems van de menor a mayor longitud (invariante para TODAS)", () => {
    for (const section of PLATFORM_NAV_SECTIONS) {
      const lengths = section.items.map((item) => item.label.length);
      expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    }
    expect(PLATFORM_NAV_SECTIONS[1]?.items.map((item) => item.label)).toEqual(["Tenants", "Llamadas", "Puesta en marcha"]);
    expect(PLATFORM_NAV_SECTIONS[2]?.items.map((item) => item.label)).toEqual(["Planes", "Pricing IA", "Facturación"]);
  });

  it("las secciones cubren las 13 rutas de la consola sin repetir ninguna", () => {
    const paths = PLATFORM_NAV.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.sort()).toEqual(
      [
        "/platform",
        "/platform/analytics",
        "/platform/audit",
        "/platform/billing",
        "/platform/calls",
        "/platform/intake",
        "/platform/plans",
        "/platform/pricing",
        "/platform/prospecting",
        "/platform/quality",
        "/platform/tenants",
        "/platform/voices",
      ].sort(),
    );
  });

  it("sortByLabelLength es estable: el empate conserva el orden de declaración", () => {
    const sorted = sortByLabelLength([{ label: "bbb" }, { label: "a" }, { label: "ccc" }, { label: "dd" }]);
    expect(sorted.map((item) => item.label)).toEqual(["a", "dd", "bbb", "ccc"]);
  });
});
