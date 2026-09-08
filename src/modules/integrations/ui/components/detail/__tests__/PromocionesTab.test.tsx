import { render, screen } from "@testing-library/react";

import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";

const mockList = jest.fn();
jest.mock("@/modules/marketing/infrastructure/services/promotions-service.adapter", () => ({
  listPromotions: (...args: unknown[]) => mockList(...args),
}));
jest.mock(
  "@/modules/integrations/infrastructure/services/integrations-service.adapter",
  () => ({
    refreshIntegrationDiscounts: jest.fn(),
  }),
);

/* eslint-disable @typescript-eslint/no-require-imports -- los mocks de arriba
   exigen require() tras jest.mock (import estático se izaría antes del mock) */
const { PromocionesTab } = require("../PromocionesTab") as typeof import("../PromocionesTab");
/* eslint-enable @typescript-eslint/no-require-imports */

const INTEGRATION = {
  id: "int-1",
  provider: "shopify",
  mirrors: {
    shipping_synced_at: null,
    shipping_last_error: null,
    discounts_synced_at: "2026-09-07T15:00:00.000Z",
    discounts_last_error: null,
  },
} as unknown as IntegrationDTO;

function promo(over: Partial<PromotionDTO>): PromotionDTO {
  return {
    id: "p",
    name: "Promo",
    kind: "external_rule",
    percent: null,
    amount_cents: null,
    gift_variant_id: null,
    gift_variant: null,
    shipping_value_cents: null,
    min_order_cents: null,
    shared_code: null,
    external_codes: [],
    external_summary: null,
    governed_by_connection_id: "int-1",
    validity_hours: null,
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: null,
    max_redemptions_total: null,
    max_redemptions_per_contact: 1,
    redemptions_count: 0,
    coupons_issued: 0,
    redemptions_recorded: 0,
    enabled: true,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...over,
  } as PromotionDTO;
}

describe("PromocionesTab", () => {
  it("muestra solo las promociones espejadas de la conexión: resumen del proveedor, código y vigencia", async () => {
    mockList.mockResolvedValue([
      promo({
        id: "p1",
        name: "Lleva 2, 20 % off",
        external_summary: "20 % de descuento al comprar 2 o más productos",
      }),
      promo({
        id: "p2",
        name: "Bienvenida",
        kind: "fixed_discount",
        amount_cents: 1_500_000,
        external_codes: ["SAVAGE15"],
        ends_at: "2026-09-30T00:00:00.000Z",
      }),
      promo({ id: "local", name: "Creada en axi", governed_by_connection_id: null }),
    ]);
    render(<PromocionesTab integration={INTEGRATION} onChanged={() => Promise.resolve()} />);
    await screen.findByText("Lleva 2, 20 % off");

    expect(screen.queryByText("Creada en axi")).not.toBeInTheDocument();
    expect(screen.getByText("20 % de descuento al comprar 2 o más productos")).toBeInTheDocument();
    expect(screen.getByText("Automática")).toBeInTheDocument();
    expect(screen.getByText("Con código")).toBeInTheDocument();
    expect(screen.getByText("SAVAGE15")).toBeInTheDocument();
    expect(screen.getByText("Sin fecha de fin")).toBeInTheDocument();
    expect(screen.getByText(/Hasta el/)).toBeInTheDocument();
    expect(screen.getAllByText("Activa")).toHaveLength(2);
  });
});
