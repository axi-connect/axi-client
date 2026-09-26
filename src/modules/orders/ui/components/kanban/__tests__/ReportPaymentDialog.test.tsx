import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { OrderRow } from "@/modules/orders/domain/order";

const mockReport = jest.fn<Promise<unknown>, [string, Record<string, unknown>]>();
jest.mock("@/modules/orders/infrastructure/services/order-payments-service.adapter", () => ({
  reportPayment: (orderId: string, dto: Record<string, unknown>) => mockReport(orderId, dto),
}));
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
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));

import { expectAlertContract } from "@/core/notifications/testing";
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

/**
 * QA real F3 (A y B): «1.000.000» en formato colombiano daba NaN y el pago se
 * registraba SIN monto con «Pago registrado»; y se precargaba el TOTAL, no el
 * saldo, así que tras un abono se proponía pagar otra vez el pedido entero.
 */
/** Monta el diálogo y deja resolver la carga de medios de pago (evita el aviso de act). */
async function open(row: OrderRow) {
  render(<ReportPaymentDialog order={row} onOpenChange={jest.fn()} />);
  await waitFor(() => expect(screen.getByLabelText("Monto")).toBeInTheDocument());
}

describe("ReportPaymentDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReport.mockResolvedValue({});
  });

  it("A · «1.000.000» es un millón de pesos y viaja como tal", async () => {
    await open(order());
    const amount = screen.getByLabelText("Monto");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "1.000.000" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith(
        "ord-1",
        expect.objectContaining({ amount_cents: 100_000_000 }),
      ),
    );
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "success",
        title: "Pago registrado",
        description: expect.stringMatching(/^\$\s?1\.000\.000\. Queda por verificar\.$/),
      }),
    );
    expectAlertContract(mockShowAlert.mock.calls[0]?.[0]);
  });

  it("A · un monto que no se entiende FRENA el envío con mensaje, en vez de mandarse vacío", async () => {
    await open(order());
    // Enfocado, como en el navegador: PriceInput conserva lo escrito mientras se teclea
    fireEvent.focus(screen.getByLabelText("Monto"));
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "un millón" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/No entendí el monto/);
    const button = screen.getByRole("button", { name: "Registrar pago" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    await Promise.resolve();
    expect(mockReport).not.toHaveBeenCalled();
    // Al salir del campo, lo ilegible se QUEDA con su error: no se pierde lo escrito
    fireEvent.blur(screen.getByLabelText("Monto"));
    expect(screen.getByLabelText("Monto")).toHaveValue("un millón");
    expect(screen.getByRole("alert")).toHaveTextContent(/No entendí el monto/);
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
    // Vacío sí se puede: el cliente no dijo cuánto, y el monto viaja ausente
    fireEvent.focus(screen.getByLabelText("Monto"));
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "" } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(mockReport).toHaveBeenCalledTimes(1));
    expect(mockReport.mock.calls[0][1].amount_cents).toBeUndefined();
  });

  it("la cifra interpretada se ve debajo ANTES de enviar: en USD, «350.00» es US$ 35.000, no 350", async () => {
    await open(order({ currency: "USD", total_cents: 350_00, balance_cents: 350_00 }));
    const amount = screen.getByLabelText("Monto");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "350.00" } });
    expect(screen.getByText(/^= US\$\s?35\.000/)).toBeInTheDocument();
    fireEvent.change(amount, { target: { value: "350" } });
    expect(screen.getByText(/^= US\$\s?350\b/)).toBeInTheDocument();
  });

  it("QA F3: un monto MAYOR que el saldo se puede reportar, pero dice cuánto sobra y qué pasará al verificar", async () => {
    await open(order({ paid_cents: 400_000_00, balance_cents: 600_000_00, payment_state: "partially_paid" }));
    const amount = screen.getByLabelText("Monto");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "700.000" } });
    expect(screen.getByText(/más que el saldo/)).toHaveTextContent(/son \$\s?100\.000 más que el saldo; al verificar tendrás que aceptar el sobrepago/);
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    // Igual o menor que el saldo: no dice nada de sobrepago
    fireEvent.change(amount, { target: { value: "600.000" } });
    expect(screen.queryByText(/más que el saldo/)).toBeNull();
  });

  it("B · propone el SALDO, no el total: tras un abono de 400.000 sobre 1.000.000 propone 600.000", async () => {
    await open(order({ paid_cents: 400_000_00, balance_cents: 600_000_00, payment_state: "partially_paid" }));
    expect(screen.getByText(/saldo \$ 600\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith(
        "ord-1",
        expect.objectContaining({ amount_cents: 600_000_00 }),
      ),
    );
    // Sin abono, el saldo ES el total: la propuesta no cambia para quien cobra de una
    mockReport.mockClear();
    // Un diálogo modal a la vez: el segundo esconde al primero del árbol accesible
    cleanup();
    await open(order({ id: "ord-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith(
        "ord-2",
        expect.objectContaining({ amount_cents: 1_000_000_00 }),
      ),
    );
  });
});
