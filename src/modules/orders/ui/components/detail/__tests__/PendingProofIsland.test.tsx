import { fireEvent, render, screen } from "@testing-library/react";

import type { OrderDTO, OrderPaymentDTO } from "@/modules/orders/domain/order";
import { PendingProofIsland } from "@/modules/orders/ui/components/detail/OrderDetailRail";

const pay = (
  id: string,
  status: OrderPaymentDTO["status"],
  amount: number | null,
  created_at: string,
): OrderPaymentDTO =>
  ({
    id,
    status,
    amount_cents: amount,
    currency: "COP",
    method_label: "Nequi",
    created_at,
    attachment_id: null,
  }) as unknown as OrderPaymentDTO;

const order = (payments: OrderPaymentDTO[]): OrderDTO =>
  ({
    id: "o1",
    currency: "COP",
    balance_cents: 19_458_586_00,
    payments,
  }) as unknown as OrderDTO;

describe("PendingProofIsland (premium P3: lo más accionable del pedido)", () => {
  it("sin comprobantes por revisar no existe: no se inventa otro «lo próximo»", () => {
    const { container } = render(
      <PendingProofIsland
        order={order([
          pay("a", "verified", 8_339_394_00, "2026-09-22T10:00:00Z"),
        ])}
        onReview={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("con dos pendientes cuenta los dos, muestra el MÁS ANTIGUO y lo que faltaría si es cierto", () => {
    const onReview = jest.fn();
    const older = pay("old", "reported", 5_000_000_00, "2026-09-25T09:41:00Z");
    render(
      <PendingProofIsland
        order={order([
          pay("new", "reported", 1_000_000_00, "2026-09-25T15:00:00Z"),
          older,
        ])}
        onReview={onReview}
      />,
    );
    const island = screen.getByRole("region", {
      name: "Comprobante por revisar",
    });
    expect(island).toHaveTextContent("Llegaron 2 comprobantes");
    expect(island).toHaveTextContent("$ 5.000.000");
    expect(island).toHaveTextContent("$ 14.458.586");
    fireEvent.click(screen.getByRole("button", { name: "Revisar el pago" }));
    expect(onReview).toHaveBeenCalledWith(older);
  });

  it("un comprobante sin monto no calcula un saldo que no se puede saber", () => {
    render(
      <PendingProofIsland
        order={order([pay("x", "reported", null, "2026-09-25T09:41:00Z")])}
        onReview={jest.fn()}
      />,
    );
    expect(screen.getByText("sin monto")).toBeInTheDocument();
    expect(screen.queryByText("Si es cierto, falta")).toBeNull();
  });
});
