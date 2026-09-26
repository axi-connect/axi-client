import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { OrderRow } from "@/modules/orders/domain/order";

const mockReport = jest.fn<
  Promise<unknown>,
  [string, Record<string, unknown>]
>();
jest.mock(
  "@/modules/orders/infrastructure/services/order-payments-service.adapter",
  () => ({
    reportPayment: (orderId: string, dto: Record<string, unknown>) =>
      mockReport(orderId, dto),
  }),
);
jest.mock("@/modules/payments/public", () => ({
  listPaymentMethods: () => Promise.resolve({ data: [] }),
}));
const refreshOrder = jest.fn(() => Promise.resolve());
const fetchStats = jest.fn(() => Promise.resolve());
jest.mock("@/modules/orders/infrastructure/stores/orders.store", () => ({
  useOrdersStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ refreshOrder, fetchStats }),
}));
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { ReportPaymentDialog } from "@/modules/orders/ui/components/kanban/ReportPaymentDialog";

const order = (overrides: Partial<OrderRow> = {}): OrderRow =>
  ({
    id: "ord-1",
    order_number: 42,
    status: "confirmed",
    contact_id: "c1",
    contact_name: "Laura Gómez",
    conversation_id: null,
    total_cents: 1_000_000_00,
    currency: "COP",
    created_by_type: "user",
    has_payment_proof: false,
    pending_payment: false,
    items_count: 1,
    paid_cents: 0,
    balance_cents: 1_000_000_00,
    payment_state: "unpaid",
    service_date: null,
    created_at: "2026-09-16T10:00:00.000Z",
    ...overrides,
  }) as OrderRow;

describe("ReportPaymentDialog · atajos y reparto con plan (premium P4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReport.mockResolvedValue({});
  });

  it("con plan propone la cuota que toca; «Todo» pone el saldo y el reparto sigue al monto", async () => {
    const allocation = jest.fn((cents: number | null) => (
      <p>reparto {String(cents)}</p>
    ));
    render(
      <ReportPaymentDialog
        order={order({ balance_cents: 900_000_00 })}
        onOpenChange={jest.fn()}
        installment={{ label: "Cuota 2 de 3", cents: 300_000_00 }}
        allocation={allocation}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Monto")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /^Cuota 2 de 3 · \$\s300\.000$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("reparto 30000000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Todo · \$\s900\.000$/ }));
    expect(
      screen.getByRole("button", { name: /^Todo · \$\s900\.000$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("reparto 90000000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Otro monto" }));
    expect(screen.getByRole("button", { name: "Otro monto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Monto")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith(
        "ord-1",
        expect.objectContaining({ amount_cents: 900_000_00 }),
      ),
    );
  });

  it("sin plan no hay atajos ni reparto, y se propone el saldo como siempre", async () => {
    render(
      <ReportPaymentDialog
        order={order({ balance_cents: 900_000_00 })}
        onOpenChange={jest.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Monto")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("group", { name: "Cuánto pagó" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith(
        "ord-1",
        expect.objectContaining({ amount_cents: 900_000_00 }),
      ),
    );
  });
});
