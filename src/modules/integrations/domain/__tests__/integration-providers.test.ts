import {
  buildConnectPayload,
  buildRotatePayload,
  connectCtaLabel,
  connectTitle,
  FALLBACK_PROVIDER,
  INTEGRATION_PROVIDERS,
  integrationProvider,
  visibleProviders,
  type AccessTokenConnectConfig,
} from "@/modules/integrations/domain/integration-providers";

/**
 * El registry es la fuente de la galería Y del wizard: se prueba por
 * PROPIEDADES, no contra una lista literal — añadir un proveedor no debe
 * romper este test, solo violar una invariante debe romperlo.
 */
describe("integration-providers", () => {
  const providers = Object.values(INTEGRATION_PROVIDERS);

  it("todo kind conocido tiene descriptor completo", () => {
    for (const [key, provider] of Object.entries(INTEGRATION_PROVIDERS)) {
      expect(provider.kind).toBe(key);
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.tagline.length).toBeGreaterThan(0);
      expect(provider.icon_id.length).toBeGreaterThan(0);
      expect(provider.brand_class.startsWith("brand-")).toBe(true);
      expect(provider.noun.singular.length).toBeGreaterThan(0);
      expect(["f", "m"]).toContain(provider.noun.gender);
    }
  });

  it("la config de conexión es coherente con su estrategia", () => {
    for (const provider of providers) {
      if (provider.connect.strategy === "access_token") {
        expect(provider.connect.external_account_field.id.length).toBeGreaterThan(0);
        expect(provider.connect.credential_fields.length).toBeGreaterThan(0);
        // Los ids de credenciales DEBEN ser los nombres del DTO: es lo que
        // permite que buildConnectPayload arme el payload sin switch
        const expected =
          provider.connect.credentials_mode === "access_token"
            ? ["access_token", "api_secret"]
            : ["client_id", "client_secret"];
        expect(provider.connect.credential_fields.map((field) => field.id)).toEqual(expected);
      } else {
        expect(provider.connect.strategy).toBe("oauth");
      }
    }
  });

  it("la galería DERIVA del registry: sin internal y con el recomendado primero", () => {
    const visible = visibleProviders();
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some((provider) => provider.availability === "internal")).toBe(false);
    expect(visible[0].recommended).toBe(true);
    // Los conectables van antes que la hoja de ruta
    const lastAvailable = visible.map((p) => p.availability).lastIndexOf("available");
    const firstSoon = visible.map((p) => p.availability).indexOf("coming_soon");
    if (lastAvailable !== -1 && firstSoon !== -1) {
      expect(lastAvailable).toBeLessThan(firstSoon);
    }
  });

  it("el webhook genérico es costura técnica: jamás se ofrece en la galería", () => {
    expect(visibleProviders().some((provider) => provider.kind === "generic_webhook")).toBe(false);
  });

  it("un kind desconocido cae al fallback neutro e internal, nunca a undefined", () => {
    const provider = integrationProvider("proveedor_que_no_existe");
    expect(provider).toBe(FALLBACK_PROVIDER);
    expect(provider.availability).toBe("internal");
    expect(provider.capabilities).toEqual([]);
    expect(integrationProvider("shopify")).toBe(INTEGRATION_PROVIDERS.shopify);
  });

  it("los requisitos de Shopify avisan del token de un solo uso como crítico", () => {
    const critical = INTEGRATION_PROVIDERS.shopify.prerequisites.filter(
      (item) => item.critical === true,
    );
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.some((item) => item.detail.includes("UNA sola vez"))).toBe(true);
  });

  it("los copys se generan del noun: nada de «tienda» fijo en las vistas", () => {
    expect(connectTitle(INTEGRATION_PROVIDERS.shopify)).toBe("Conecta tu tienda de Shopify");
    expect(connectCtaLabel(INTEGRATION_PROVIDERS.shopify)).toBe("Conectar tienda");
    expect(connectTitle(INTEGRATION_PROVIDERS.salesforce)).toBe(
      "Conecta tu cuenta de Salesforce",
    );
  });
});

describe("buildConnectPayload / buildRotatePayload", () => {
  it("arma el DTO de Shopify con los nombres EXACTOS del contrato, con trim", () => {
    const config = INTEGRATION_PROVIDERS.shopify.connect;
    const payload = buildConnectPayload(config, "shopify", {
      shop_domain: "  mi-tienda.myshopify.com ",
      access_token: " shpat_abc ",
      api_secret: " shpss_xyz ",
    });

    expect(payload).toEqual({
      provider: "shopify",
      external_account: "mi-tienda.myshopify.com",
      credentials: {
        mode: "access_token",
        access_token: "shpat_abc",
        api_secret: "shpss_xyz",
      },
    });
  });

  it("el modo client_credentials arma la otra variante de la unión", () => {
    const config: AccessTokenConnectConfig = {
      strategy: "access_token",
      credentials_mode: "client_credentials",
      external_account_field: {
        id: "account",
        label: "Cuenta",
        hint: "",
        placeholder: "",
      },
      credential_fields: [
        { id: "client_id", label: "Client ID", hint: "", placeholder: "" },
        { id: "client_secret", label: "Client secret", hint: "", placeholder: "", secret: true },
      ],
    };

    expect(buildRotatePayload(config, { client_id: " id ", client_secret: " secreto " })).toEqual({
      mode: "client_credentials",
      client_id: "id",
      client_secret: "secreto",
    });
  });

  it("la rotación reusa los mismos campos del descriptor que el alta", () => {
    const config = INTEGRATION_PROVIDERS.shopify.connect;
    expect(buildRotatePayload(config, { access_token: "shpat_n", api_secret: "shpss_n" })).toEqual(
      {
        mode: "access_token",
        access_token: "shpat_n",
        api_secret: "shpss_n",
      },
    );
  });
});
