import {
  INTEGRATION_PROVIDERS,
  visibleProviders,
} from "@/modules/integrations/domain/integration-providers";

/**
 * El registry es la fuente de la galería: un proveedor del contrato sin
 * descriptor rompería la vista al pintarlo (mismo test que el de canales).
 */
describe("integration-providers", () => {
  it("todo proveedor del contrato tiene descriptor completo", () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.tagline.length).toBeGreaterThan(0);
      expect(provider.icon_id.length).toBeGreaterThan(0);
      expect(provider.brand_class.startsWith("brand-")).toBe(true);
    }
  });

  it("la galería muestra Shopify conectable y Mercado Pago como hoja de ruta", () => {
    const visible = visibleProviders();
    expect(visible.map((provider) => provider.kind)).toEqual(["shopify", "mercado_pago"]);
    expect(visible[0].availability).toBe("available");
    expect(visible[1].availability).toBe("coming_soon");
  });

  it("el webhook genérico es costura técnica: jamás se ofrece en la galería", () => {
    expect(visibleProviders().some((provider) => provider.kind === "generic_webhook")).toBe(false);
  });

  it("los requisitos de Shopify avisan del token de un solo uso como crítico", () => {
    const critical = INTEGRATION_PROVIDERS.shopify.prerequisites.filter(
      (item) => item.critical === true,
    );
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.some((item) => item.detail.includes("UNA sola vez"))).toBe(true);
  });
});
