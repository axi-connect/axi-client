import { fireEvent, render, screen } from "@testing-library/react";

import type { OrderRow } from "@/modules/orders/domain/order";
import { PendingProofsStrip } from "@/modules/orders/ui/components/kanban/OrdersKanban";

const row = (
  id: string,
  pending: boolean,
  name: string,
  number: number,
): OrderRow =>
  ({
    id,
    pending_payment: pending,
    contact_name: name,
    order_number: number,
  }) as unknown as OrderRow;

describe("PendingProofsStrip (premium P3: la franja de tinta del tablero)", () => {
  it("sin comprobantes pendientes no existe", () => {
    const { container } = render(
      <PendingProofsStrip
        orders={[row("a", false, "Ana", 45)]}
        canManage
        onReview={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("cuenta solo los pendientes, nombra los dos primeros y revisa el primero", () => {
    const onReview = jest.fn();
    const first = row("a", true, "Ana Gómez", 45);
    render(
      <PendingProofsStrip
        orders={[
          first,
          row("b", false, "Sofía", 41),
          row("c", true, "Luis Pardo", 48),
          row("d", true, "Marta", 39),
        ]}
        canManage
        onReview={onReview}
      />,
    );
    const strip = screen.getByRole("region", {
      name: "Comprobantes por revisar",
    });
    expect(strip).toHaveClass("island-ink");
    expect(strip).toHaveTextContent("3comprobantes por revisar");
    expect(strip).toHaveTextContent(
      "Ana Gómez · #0045 y Luis Pardo · #0048 y 1 más",
    );
    fireEvent.click(screen.getByRole("button", { name: "Revisar el primero" }));
    expect(onReview).toHaveBeenCalledWith(first);
  });

  it("sin permiso de gestionar se informa pero no se ofrece revisar", () => {
    render(
      <PendingProofsStrip
        orders={[row("a", true, "Ana", 45)]}
        canManage={false}
        onReview={jest.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Revisar el primero" }),
    ).toBeNull();
  });
});
