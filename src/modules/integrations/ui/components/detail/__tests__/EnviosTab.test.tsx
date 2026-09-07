import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { IntegrationDTO } from "@/modules/integrations/domain/integration";

const mockZones = jest.fn();
const mockRefresh = jest.fn();
jest.mock("@/modules/shipping/infrastructure/services/shipping-service.adapter", () => ({
  listShippingZones: (...args: unknown[]) => mockZones(...args),
}));
jest.mock(
  "@/modules/integrations/infrastructure/services/integrations-service.adapter",
  () => ({
    refreshIntegrationShipping: (...args: unknown[]) => mockRefresh(...args),
  }),
);

/* eslint-disable @typescript-eslint/no-require-imports -- los mocks de arriba
   exigen require() tras jest.mock (import estático se izaría antes del mock) */
const { EnviosTab } = require("../EnviosTab") as typeof import("../EnviosTab");
/* eslint-enable @typescript-eslint/no-require-imports */

const INTEGRATION = {
  id: "int-1",
  provider: "shopify",
  status: "connected",
  external_account: "tribal-store-4813.myshopify.com",
  account_label: "Savage",
  capabilities: ["catalog", "inventory", "orders", "shipping"],
  mirrors: {
    shipping_synced_at: "2026-09-07T15:00:00.000Z",
    shipping_last_error: null,
    discounts_synced_at: null,
    discounts_last_error: null,
  },
  missing_optional_scopes: [],
  taxes_included: true,
} as unknown as IntegrationDTO;

const rate = (over: Record<string, unknown>) => ({
  id: "r",
  name: "Envío estándar",
  kind: "flat",
  price_cents: 1_200_000,
  min_order_cents: null,
  max_order_cents: null,
  position: 0,
  is_active: true,
  governed_by_connection_id: "int-1",
  ...over,
});

const ZONES = [
  {
    id: "z1",
    name: "Colombia · principales",
    country_code: "CO",
    province_codes: ["CO-DC", "CO-ANT"],
    provinces: [
      { code: "CO-DC", name: "Bogotá D.C." },
      { code: "CO-ANT", name: "Antioquia" },
    ],
    position: 0,
    is_active: true,
    governed_by_connection_id: "int-1",
    rates: [
      rate({ id: "r1", max_order_cents: 19_999_900 }),
      rate({ id: "r2", price_cents: 0, min_order_cents: 20_000_000 }),
      rate({ id: "r3", name: "Servientrega", kind: "live", price_cents: null }),
    ],
    created_at: "2026-09-07T00:00:00.000Z",
    updated_at: "2026-09-07T00:00:00.000Z",
  },
  {
    id: "z-local",
    name: "Tarifa local vieja",
    country_code: "CO",
    province_codes: [],
    provinces: [],
    position: 1,
    is_active: true,
    governed_by_connection_id: null,
    rates: [rate({ id: "r9", name: "Local", governed_by_connection_id: null })],
    created_at: "2026-09-07T00:00:00.000Z",
    updated_at: "2026-09-07T00:00:00.000Z",
  },
];

/**
 * Espejo de solo lectura: lo que la IA usa para estimar el flete. Debe mostrar
 * SOLO las zonas de esta conexión (una tarifa local vieja no se mezcla), leer
 * «Gratis» y «Se calcula al cerrar» en vez de cifras falsas, y el botón de
 * actualizar debe pegarle al proveedor y releer.
 */
describe("EnviosTab", () => {
  beforeEach(() => {
    mockZones.mockReset();
    mockRefresh.mockReset();
    mockZones.mockResolvedValue(ZONES);
  });

  it("lista solo las zonas gobernadas por la conexión, con condición, precio y tipo legibles", async () => {
    render(<EnviosTab integration={INTEGRATION} onChanged={() => Promise.resolve()} />);
    await screen.findByText("Colombia · principales");

    expect(screen.queryByText("Tarifa local vieja")).not.toBeInTheDocument();
    expect(screen.getByText("Antioquia")).toBeInTheDocument();
    expect(screen.getByText(/Pedidos hasta \$\s?199\.999/)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos desde \$\s?200\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.getByText("Se calcula al cerrar")).toBeInTheDocument();
    expect(screen.getByText("Transportadora")).toBeInTheDocument();
    expect(screen.getAllByText("Tarifa fija")).toHaveLength(2);
  });

  it("«Actualizar desde Shopify» refresca el espejo, relee y avisa al detalle", async () => {
    mockRefresh.mockResolvedValue({
      zones: 3,
      rates: 7,
      removed_zones: 0,
      removed_rates: 1,
      skipped_currency: 0,
      synced_at: "2026-09-07T16:00:00.000Z",
    });
    const onChanged = jest.fn().mockResolvedValue(undefined);
    render(<EnviosTab integration={INTEGRATION} onChanged={onChanged} />);
    await screen.findByText("Colombia · principales");

    fireEvent.click(screen.getByRole("button", { name: /Actualizar desde Shopify/ }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(mockRefresh).toHaveBeenCalledWith("int-1");
    expect(mockZones).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/3 zonas y 7 tarifas/)).toBeInTheDocument();
  });

  it("el último error del espejo se muestra como aviso sin ocultar las filas", async () => {
    render(
      <EnviosTab
        integration={
          {
            ...INTEGRATION,
            mirrors: { ...INTEGRATION.mirrors, shipping_last_error: "429 del proveedor" },
          } as IntegrationDTO
        }
        onChanged={() => Promise.resolve()}
      />,
    );
    await screen.findByText("Colombia · principales");
    expect(screen.getByText(/429 del proveedor/)).toBeInTheDocument();
  });
});
