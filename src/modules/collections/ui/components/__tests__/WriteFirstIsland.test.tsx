import { fireEvent, render, screen } from "@testing-library/react";

import {
  groupReceivables,
  type ReceivableDTO,
} from "@/modules/collections/domain/receivable";
import { writeFirst } from "@/modules/collections/domain/write-first";
import { WriteFirstIsland } from "@/modules/collections/ui/components/WriteFirstIsland";

const row = (overrides: Partial<ReceivableDTO> = {}): ReceivableDTO =>
  ({
    plan_id: "p1",
    order_id: "o1",
    order_number: 33,
    contact_id: "c1",
    contact_name: "Andrés Molina",
    service_date: "2026-09-19",
    travelled: true,
    last_reminder: null,
    currency: "COP",
    total_cents: 3_000_000_00,
    paid_cents: 944_625_00,
    balance_cents: 2_055_375_00,
    overdue_cents: 685_125_00,
    next_due_at: "2026-09-19",
    days_overdue: 6,
    bucket: "d1_30",
    installments_total: 3,
    installments_paid: 1,
    active_promise_at: null,
    last_promise: null,
    assigned_user_id: null,
    paused: false,
    ...overrides,
  }) as ReceivableDTO;

const firstOf = (r: ReceivableDTO) => {
  const first = writeFirst(groupReceivables([r]));
  if (first === null) throw new Error("sin isla");
  return first;
};

describe("WriteFirstIsland (premium P4: «Escribe primero a»)", () => {
  it("dice a quién, cuánto pedirle y el total, y «Escribirle» abre a esa persona", () => {
    const onWrite = jest.fn();
    render(
      <WriteFirstIsland
        first={firstOf(row())}
        onWrite={onWrite}
        onPromise={jest.fn()}
      />,
    );
    const island = screen.getByRole("region", { name: "Escribe primero a" });
    expect(island).toHaveTextContent("Andrés Molina");
    expect(island).toHaveTextContent("$ 685.125");
    expect(island).toHaveTextContent("vencido · debe $ 2.055.375 en total");
    expect(island).toHaveTextContent("Vencióhace 6 días");
    expect(island).toHaveTextContent("Último avisoninguno todavía");
    // Lo que el servidor no entrega no se inventa.
    expect(island).not.toHaveTextContent("Respondió");
    fireEvent.click(screen.getByRole("button", { name: "Escribirle" }));
    expect(onWrite).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: "p1" }),
    );
  });

  it("«Anotar promesa» solo con permiso y sin promesa viva", () => {
    const onPromise = jest.fn();
    const { rerender } = render(
      <WriteFirstIsland
        first={firstOf(row())}
        onWrite={jest.fn()}
        onPromise={onPromise}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Anotar promesa" }));
    expect(onPromise).toHaveBeenCalledTimes(1);

    rerender(<WriteFirstIsland first={firstOf(row())} onWrite={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Anotar promesa" })).toBeNull();

    rerender(
      <WriteFirstIsland
        first={firstOf(row({ active_promise_at: "2026-09-29" }))}
        onWrite={jest.fn()}
        onPromise={onPromise}
      />,
    );
    expect(screen.queryByRole("button", { name: "Anotar promesa" })).toBeNull();
  });
});
