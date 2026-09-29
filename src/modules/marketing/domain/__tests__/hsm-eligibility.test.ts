import { isUsableAs, whyUnusableAs } from "../template-catalog";
import type { HsmTemplateDTO } from "../template-catalog";

/**
 * F7: una sola tabla de elegibilidad para los seis flujos que eligen una
 * plantilla de Meta. Antes cada uno aplicaba su propia regla (o ninguna).
 */
function hsm(over: Partial<HsmTemplateDTO> = {}): HsmTemplateDTO {
  return {
    id: "t",
    name: "seguimiento",
    language: "es",
    category: "utility",
    approval_status: "approved",
    body: "Hola, te escribo por tu pedido.",
    ...over,
  } as HsmTemplateDTO;
}

describe("isUsableAs — elegibilidad única de las plantillas de Meta", () => {
  it("sin aprobar no sirve para nada, y dice cómo la tiene Meta", () => {
    const pending = hsm({ approval_status: "pending" });
    for (const purpose of ["campaign", "automation", "opening", "quick_action", "document", "collections"] as const) {
      expect(isUsableAs(pending, purpose)).toBe(false);
    }
    expect(whyUnusableAs(pending, "opening")).toBe("Meta la tiene como en revisión");
  });

  it("campaña: solo Marketing", () => {
    expect(isUsableAs(hsm({ category: "marketing" }), "campaign")).toBe(true);
    expect(isUsableAs(hsm({ category: "utility" }), "campaign")).toBe(false);
    expect(whyUnusableAs(hsm({ category: "utility" }), "campaign")).toContain("Marketing");
  });

  it("apertura, acción rápida, cobros y documentos: cualquiera menos Autenticación", () => {
    for (const purpose of ["opening", "quick_action", "document", "collections"] as const) {
      expect(isUsableAs(hsm({ category: "utility" }), purpose)).toBe(true);
      expect(isUsableAs(hsm({ category: "marketing" }), purpose)).toBe(true);
      expect(isUsableAs(hsm({ category: "authentication" }), purpose)).toBe(false);
    }
  });

  it("automatización: además, sin variables (la regla no sabe rellenarlas)", () => {
    expect(isUsableAs(hsm(), "automation")).toBe(true);
    expect(isUsableAs(hsm({ body: "Hola {{1}}, tu pedido." }), "automation")).toBe(false);
    expect(whyUnusableAs(hsm({ body: "Hola {{1}}, tu pedido." }), "automation")).toContain("variables");
    expect(isUsableAs(hsm({ category: "authentication" }), "automation")).toBe(false);
  });
});
