import { buildCrumbs } from "@/shared/components/layout/private-header";
import { META_TEMPLATES_BREADCRUMBS } from "@/modules/marketing/domain/breadcrumbs";

describe("migas de las plantillas de Meta (auditoría F3, R3)", () => {
  const labels = (path: string) => buildCrumbs(path, [META_TEMPLATES_BREADCRUMBS]).map((crumb) => crumb.label);

  it("editar dice «Plantilla», no el id", () => {
    expect(labels("/settings/meta-templates/t-promo1/edit")).toEqual([
      "Configuración",
      "Plantillas de Meta",
      "Plantilla",
      "Editar",
    ]);
    expect(labels("/settings/meta-templates/0199a3f2-0000-7000-8000-000000000001/edit")).toContain("Plantilla");
  });

  it("crear dice «Nueva»", () => {
    expect(labels("/settings/meta-templates/new")).toEqual(["Configuración", "Plantillas de Meta", "Nueva"]);
  });
});
