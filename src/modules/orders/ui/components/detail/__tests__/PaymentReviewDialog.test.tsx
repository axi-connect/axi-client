import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { OrderDTO, OrderPaymentDTO } from "@/modules/orders/domain/order";

const mockReview = jest.fn<Promise<unknown>, [string, string, Record<string, unknown>]>();
jest.mock("@/modules/orders/infrastructure/services/order-payments-service.adapter", () => ({
  reviewPayment: (orderId: string, paymentId: string, dto: Record<string, unknown>) =>
    mockReview(orderId, paymentId, dto),
}));

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));

import { PaymentReviewDialog } from "@/modules/orders/ui/components/detail/PaymentReviewDialog";

const TOTAL = 1_000_000;

const payment = (overrides: Partial<OrderPaymentDTO> = {}): OrderPaymentDTO =>
  ({
    id: "pay-1",
    status: "reported",
    method_label: "Bancolombia",
    payment_method_id: null,
    amount_cents: null,
    amount_assumed: false,
    base_amount_cents: null,
    fx_rate: null,
    currency: "COP",
    reference: "ABONO-1",
    attachment_id: null,
    mime_type: null,
    reported_by_type: "user",
    verified_at: null,
    notes: null,
    created_at: "2026-09-16T10:20:00.000Z",
    ...overrides,
  }) as OrderPaymentDTO;

const order = (overrides: Partial<OrderDTO> = {}): OrderDTO =>
  ({
    id: "ord-1",
    currency: "COP",
    total_cents: TOTAL,
    paid_cents: 0,
    balance_cents: TOTAL,
    payment_state: "unpaid",
    ...overrides,
  }) as OrderDTO;

function open(props: Partial<Parameters<typeof PaymentReviewDialog>[0]> = {}) {
  return render(
    <PaymentReviewDialog
      orderId="ord-1"
      order={order()}
      review={{ payment: payment(), action: "verify" }}
      onOpenChange={jest.fn()}
      onDone={jest.fn()}
      {...props}
    />,
  );
}

describe("PaymentReviewDialog (F3: verificar es decidir, no rellenar)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("propone el saldo cuando el pago no trae monto y verifica con él", async () => {
    open();

    expect(screen.getByRole("button", { name: /Verificar \$/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Verificar \$/ }));

    await waitFor(() => {
      expect(mockReview).toHaveBeenCalledWith(
        "ord-1",
        "pay-1",
        expect.objectContaining({ action: "verify", amount_cents: TOTAL }),
      );
    });
  });

  it("enseña en qué queda el pedido ANTES de confirmar", () => {
    open({
      order: order({ balance_cents: TOTAL }),
      review: { payment: payment({ amount_cents: 300_000 }), action: "verify" },
    });

    expect(screen.getByText(/Después de verificar/)).toBeInTheDocument();
    expect(screen.getByText(/Se cierra cuando el saldo llegue a cero/)).toBeInTheDocument();
    expect(screen.getByText(/Abonado/)).toBeInTheDocument();
  });

  it("sin monto no deja verificar y dice por qué importa", () => {
    open({ review: { payment: payment({ amount_cents: 0 }), action: "verify" } });

    expect(screen.getByRole("button", { name: /Verificar/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Verificar/ }));
    expect(mockReview).not.toHaveBeenCalled();
  });

  it("un pago mayor que el saldo pide aceptarlo a propósito y lo manda marcado", async () => {
    open({ review: { payment: payment({ amount_cents: TOTAL + 250_000 }), action: "verify" } });

    expect(screen.getByText(/por encima del saldo/)).toBeInTheDocument();
    const verify = screen.getByRole("button", { name: /Verificar \$/ });
    expect(verify).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: "Aceptar el pago de más" }));
    fireEvent.click(screen.getByRole("button", { name: /Verificar \$/ }));

    await waitFor(() => {
      expect(mockReview).toHaveBeenCalledWith(
        "ord-1",
        "pay-1",
        expect.objectContaining({ accept_overpayment: true, amount_cents: TOTAL + 250_000 }),
      );
    });
  });

  it("rechazar sigue sin pedir monto: no es una decisión de dinero", () => {
    open({ review: { payment: payment(), action: "reject" } });

    expect(screen.queryByLabelText("Monto verificado")).toBeNull();
    expect(screen.getByRole("button", { name: "Rechazar pago" })).toBeEnabled();
  });
});
