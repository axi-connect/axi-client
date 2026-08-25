import { detailTabsFor } from "@/modules/integrations/domain/detail-tabs";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import { INTEGRATION_PROVIDERS } from "@/modules/integrations/domain/integration-providers";

/**
 * F9: las pestañas del detalle se DERIVAN de las capacidades de la conexión.
 * Estado e Historial son el marco fijo; lo demás aparece solo si la capacidad
 * existe, y un string desconocido degrada con gracia en vez de romper.
 */
function dtoWith(capabilities: string[]): IntegrationDTO {
  return {
    id: "0f0e0d0c-0b0a-0908-0706-050403020100",
    provider: "shopify",
    external_account: "mi-tienda.myshopify.com",
    account_label: null,
    status: "connected",
    capabilities,
    credential_mode: "access_token",
    granted_scopes: [],
    credentials_configured: true,
    token_last4: "1234",
    api_version: "2025-07",
    last_error: null,
    last_synced_at: null,
    connected_at: null,
    counts: { locations_counting: 0, collections_selected: 0 },
  };
}

describe("detailTabsFor", () => {
  const shopify = INTEGRATION_PROVIDERS.shopify;

  it("una conexión Shopify completa pinta las cinco pestañas en orden canónico", () => {
    expect(detailTabsFor(shopify, dtoWith(["catalog", "inventory", "orders"]))).toEqual([
      "estado",
      "ubicaciones",
      "categorias",
      "pedidos",
      "historial",
    ]);
  });

  it("una conexión solo de pagos queda en el marco fijo: estado + historial", () => {
    expect(detailTabsFor(shopify, dtoWith(["payments"]))).toEqual(["estado", "historial"]);
  });

  it("las capacidades que este build no conoce se IGNORAN en vez de romper", () => {
    expect(detailTabsFor(shopify, dtoWith(["orders", "warp_drive"]))).toEqual([
      "estado",
      "pedidos",
      "historial",
    ]);
  });

  it("sin capacidades declaradas cae a lo que promete el descriptor", () => {
    expect(detailTabsFor(shopify, dtoWith([]))).toEqual([
      "estado",
      "ubicaciones",
      "categorias",
      "pedidos",
      "historial",
    ]);
  });

  it("contacts abre la pestaña de contactos (proveedores CRM)", () => {
    expect(detailTabsFor(INTEGRATION_PROVIDERS.hubspot, dtoWith(["contacts", "messages"]))).toEqual(
      ["estado", "contactos", "historial"],
    );
  });
});
