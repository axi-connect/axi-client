import { cleanup, render, screen } from "@testing-library/react";

import type { OrderEventDTO } from "@/modules/orders/domain/order";
import { OrderTimeline } from "@/modules/orders/ui/components/detail/OrderTimeline";

function event(overrides: Partial<OrderEventDTO> = {}): OrderEventDTO {
  return {
    id: "e1",
    type: "payment_verified",
    actor_type: "user",
    actor_user_id: "u1",
    actor_name: "Isabel",
    payload: { payment_id: "p1", notes: null, amount_cents: 120000000 },
    created_at: "2026-09-17T15:24:00.000Z",
    ...overrides,
  };
}

/**
 * Hallazgo abierto de la auditoría de F3, cerrado en F9: en pagos parciales
 * CUÁNTO se verificó es la mitad del hecho, y si el operador corrigió lo que
 * el cliente reportó, el rastro (`reported_amount_cents`) solo vive aquí.
 */
describe("OrderTimeline · pago verificado", () => {
  it("dice cuánto se verificó, en la moneda del pedido", () => {
    render(<OrderTimeline events={[event()]} currency="COP" />);
    expect(
      screen.getByText(/1\.200\.000 verificados por Isabel/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/había reportado/)).not.toBeInTheDocument();
  });

  it("si el operador corrigió el monto, dice lo que el cliente había reportado; si coincide, no repite", () => {
    render(
      <OrderTimeline
        events={[
          event({
            payload: {
              amount_cents: 120000000,
              reported_amount_cents: 100000000,
              notes: "consignación verificada",
            },
          }),
          event({
            id: "e2",
            payload: { amount_cents: 50000000, reported_amount_cents: 50000000 },
          }),
        ]}
        currency="COP"
      />,
    );
    const corrected = screen.getByText(/había reportado/);
    expect(corrected).toHaveTextContent(/1\.000\.000/);
    // La nota del operador sigue ahí, detrás de la corrección
    expect(corrected).toHaveTextContent(/«consignación verificada»/);
    expect(screen.getAllByText(/había reportado/)).toHaveLength(1);
  });

  it("si el cliente reportó en OTRA moneda (US$ 500 en un pedido congelado a COP), el rastro la conserva", () => {
    // Hallazgo del auditor sobre a487d72: con la moneda del pedido, «US$ 500»
    // salía como «$ 500». El payload trae `reported_currency` desde el verify.
    render(
      <OrderTimeline
        events={[
          event({
            payload: {
              amount_cents: 160000000,
              reported_amount_cents: 50000,
              reported_currency: "USD",
            },
          }),
        ]}
        currency="COP"
      />,
    );
    expect(screen.getByText(/1\.600\.000 verificados/)).toBeInTheDocument();
    const trace = screen.getByText(/había reportado/);
    expect(trace).toHaveTextContent(/US\$\s?500/);
    // Sin la moneda en el payload (eventos viejos) cae a la del pedido: los dos signos
    cleanup();
    render(
      <OrderTimeline
        events={[
          event({
            payload: { amount_cents: 160000000, reported_amount_cents: 50000 },
          }),
        ]}
        currency="COP"
      />,
    );
    const legacy = screen.getByText(/había reportado/);
    expect(legacy).not.toHaveTextContent(/US\$/);
    expect(legacy).toHaveTextContent(/\$\s?500\./);
  });

  it("un evento viejo sin monto en el payload sigue leyéndose como antes", () => {
    render(
      <OrderTimeline
        events={[event({ payload: { payment_id: "p1", notes: null } })]}
      />,
    );
    expect(screen.getByText("Pago verificado por Isabel")).toBeInTheDocument();
  });
});
