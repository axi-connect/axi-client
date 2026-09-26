import { render, screen } from "@testing-library/react";

import type { OrderDTO } from "@/modules/orders/public";

const listMock = jest.fn<
  React.ReactElement | null,
  [{ subject: { kind: string; id: string } }]
>(({ subject }) => (
  <div data-testid="documents-list">{`${subject.kind}:${subject.id}`}</div>
));
jest.mock("@/modules/documents/public", () => ({
  DocumentsList: (props: { subject: { kind: string; id: string } }) =>
    listMock(props),
}));

import { ContactOrdersDocumentsCard } from "../ContactOrdersDocumentsCard";

function order(overrides: Partial<OrderDTO>): OrderDTO {
  return {
    id: "o1",
    order_number: 42,
    status: "confirmed",
    payment_state: "partially_paid",
    total_cents: 2_170_315_000,
    paid_cents: 651_094_500,
    balance_cents: 1_519_220_500,
    currency: "COP",
    service_date: "2027-03-14",
    created_at: "2026-09-16T10:00:00.000Z",
    items: [{ product_name: "Expedición Cocuy" }],
    payments: [],
    ...overrides,
  } as unknown as OrderDTO;
}

describe("ContactOrdersDocumentsCard", () => {
  it("pedidos con saldo primero, con lo que falta y el enlace al rail; la lista de documentos va por CONTACTO", () => {
    render(
      <ContactOrdersDocumentsCard
        contactId="c1"
        orders={[
          order({
            id: "paid",
            order_number: 31,
            payment_state: "paid",
            balance_cents: 0,
            created_at: "2026-09-20T00:00:00.000Z",
          }),
          order({ id: "o1" }),
        ]}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("#0042");
    expect(rows[0]).toHaveTextContent("Falta");
    expect(rows[1]).toHaveTextContent("Pagado");
    expect(
      screen.getAllByRole("link", { name: /Abrir pedido/ })[0],
    ).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByTestId("documents-list")).toHaveTextContent(
      "contact:c1",
    );
  });

  it("sin pedidos lo dice y sigue montando la lista (el papel sobrevive al pedido)", () => {
    render(<ContactOrdersDocumentsCard contactId="c1" orders={[]} />);
    expect(screen.getByText(/Sin pedidos todavía/)).toBeInTheDocument();
    expect(screen.getByTestId("documents-list")).toBeInTheDocument();
  });
});
