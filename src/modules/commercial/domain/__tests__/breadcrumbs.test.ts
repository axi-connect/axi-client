import { buildCrumbs } from "@/shared/components/layout/private-header";
import { COMMERCIAL_BREADCRUMBS } from "../breadcrumbs";

const crumbs = (path: string) => buildCrumbs(path, [COMMERCIAL_BREADCRUMBS]);

describe("migas de /comercial (V6)", () => {
  it("«Comercial» con mayúscula y enlazada", () => {
    expect(crumbs("/comercial")).toEqual([{ href: "/comercial", label: "Comercial", linked: true }]);
    expect(crumbs("/comercial/meta").map((c) => c.label)).toEqual(["Comercial", "Meta"]);
  });

  it("un resultado: la intermedia sin enlace (no tiene página) y la última con el nombre del resultado", () => {
    expect(crumbs("/comercial/resultados/sales")).toEqual([
      { href: "/comercial", label: "Comercial", linked: true },
      { href: "/comercial/resultados", label: "Resultados", linked: false },
      { href: "/comercial/resultados/sales", label: "Ventas cerradas", linked: true },
    ]);
    expect(crumbs("/comercial/resultados/avg_ticket").at(-1)?.label).toBe("Ticket promedio");
    expect(crumbs("/comercial/resultados/raro").at(-1)?.label).toBe("Resultado");
  });

  it("una acción: «Acción», nunca el UUID", () => {
    const list = crumbs("/comercial/acciones/01a0d120-6354-72c8-a04a-2e7a0c9ad881");
    expect(list[1]).toMatchObject({ label: "Acciones", linked: false });
    expect(list[2].label).toBe("Acción");
  });

  it("sin configuración, el header sigue como antes", () => {
    expect(buildCrumbs("/settings/users")).toEqual([
      { href: "/settings", label: "Configuración", linked: true },
      { href: "/settings/users", label: "Usuarios", linked: true },
    ]);
  });
});
