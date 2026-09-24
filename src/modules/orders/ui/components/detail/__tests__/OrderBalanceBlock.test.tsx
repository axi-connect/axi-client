import { render, screen, waitFor } from "@testing-library/react";

import type { OrderDTO } from "@/modules/orders/domain/order";

const mockSettings = jest.fn();
const mockLatest = jest.fn();
jest.mock(
  "@/modules/payments/infrastructure/services/fx-service.adapter",
  () => ({
    getFxSettings: () => mockSettings(),
    getLatestFxRate: (base: string, quote: string) => mockLatest(base, quote),
  }),
);
let fxOn = true;
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => ({
    loaded: true,
    hasFeature: (code: string) => code === "fx_quotes" && fxOn,
  }),
}));

import { OrderBalanceBlock } from "@/modules/orders/ui/components/detail/OrderBalanceBlock";

const order = (overrides: Partial<OrderDTO> = {}): OrderDTO =>
  ({
    id: "o1",
    currency: "USD",
    total_cents: 240_000,
    paid_cents: 0,
    balance_cents: 240_000,
    payment_state: "unpaid",
    service_date: null,
    base: null,
    ...overrides,
  }) as OrderDTO;

const SETTINGS = {
  settlement_currency: "COP",
  spread_bps: 200,
  manual_rate: null,
  show_indicative_quotes: true,
};
const LATEST = {
  official: null,
  effective: {
    base: "USD",
    quote: "COP",
    rate: 3162.46,
    official_rate: 3100.45,
    spread_bps: 200,
    source: "superfinanciera",
    valid_from: "2026-09-24",
    stale: false,
  },
};

describe("OrderBalanceBlock · equivalente indicativo antes de confirmar (QA F3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fxOn = true;
    mockSettings.mockResolvedValue(SETTINGS);
    mockLatest.mockResolvedValue(LATEST);
  });

  it("un pedido en USD sin congelar dice a cuántos pesos equivale HOY y que es indicativo", async () => {
    render(<OrderBalanceBlock order={order()} />);
    expect(await screen.findByText(/a la tasa de hoy/)).toHaveTextContent(
      /≈\s*\$\s?7\.589\.904/,
    );
    expect(screen.getByText(/se fija en COP al confirmar/)).toBeInTheDocument();
    expect(mockLatest).toHaveBeenCalledWith("USD", "COP");
  });

  it("congelado, sin la función, con el ajuste apagado o cobrando en la misma moneda: nada que decir", async () => {
    const { unmount } = render(
      <OrderBalanceBlock
        order={order({
          base: {
            currency: "USD",
            subtotal_cents: 240_000,
            total_cents: 240_000,
            fx_rate: 3100.45,
            fx_source: null,
            fx_at: null,
            fx_spread_bps: null,
            frozen_at: "2026-09-20T10:00:00.000Z",
          },
        })}
      />,
    );
    await waitFor(() => expect(mockSettings).not.toHaveBeenCalled());
    expect(screen.queryByText(/a la tasa de hoy/)).toBeNull();
    unmount();

    fxOn = false;
    const off = render(<OrderBalanceBlock order={order()} />);
    expect(mockSettings).not.toHaveBeenCalled();
    off.unmount();

    fxOn = true;
    mockSettings.mockResolvedValue({
      ...SETTINGS,
      show_indicative_quotes: false,
    });
    const hidden = render(<OrderBalanceBlock order={order()} />);
    await waitFor(() => expect(mockSettings).toHaveBeenCalled());
    expect(screen.queryByText(/a la tasa de hoy/)).toBeNull();
    expect(mockLatest).not.toHaveBeenCalled();
    hidden.unmount();

    render(<OrderBalanceBlock order={order({ currency: "COP" })} />);
    await waitFor(() => expect(mockSettings).toHaveBeenCalledTimes(2));
    expect(mockLatest).not.toHaveBeenCalled();
  });
});
