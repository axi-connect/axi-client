import { fireEvent, render, screen } from "@testing-library/react";

import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";

const mockPlan = jest.fn<Promise<PlanDetailDTO>, [string]>();
const mockReschedule = jest.fn<Promise<unknown>, [string, unknown]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    reschedulePlan: (planId: string, lines: unknown) =>
      mockReschedule(planId, lines),
  }),
);
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { RescheduleDialog } from "@/modules/collections/ui/components/RescheduleDialog";

const PLAN: PlanDetailDTO = {
  id: "plan-1",
  order_id: "o1",
  order_number: 42,
  contact_id: "c1",
  status: "active",
  currency: "COP",
  total_cents: 2_170_315_000,
  paid_cents: 651_094_500,
  balance_cents: 1_519_220_500,
  deposit_cents: 651_094_500,
  service_date: "2027-03-14",
  final_due_at: "2027-01-13",
  final_due_source: "service_date",
  next_due_at: "2027-01-14",
  active_promise_at: null,
  assigned_user_id: null,
  installments: [
    {
      id: "i1",
      seq: 1,
      kind: "deposit",
      due_at: "2026-09-16",
      amount_cents: 651_094_500,
      paid_cents: 651_094_500,
      status: "paid",
      paid_at: "2026-09-16T10:00:00.000Z",
    },
    {
      id: "i2",
      seq: 2,
      kind: "installment",
      due_at: "2027-01-14",
      amount_cents: 759_610_200,
      paid_cents: 0,
      status: "pending",
      paid_at: null,
    },
    {
      id: "i3",
      seq: 3,
      kind: "balance",
      due_at: "2027-01-13",
      amount_cents: 759_610_300,
      paid_cents: 0,
      status: "pending",
      paid_at: null,
    },
  ],
  promises: [],
  notes: [],
  collapsed: false,
  schedule_changed_at: null,
};

describe("RescheduleDialog · en cuántas cuotas (premium P4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlan.mockResolvedValue(PLAN);
  });

  it("«1 · todo junto» deja una sola cuota por todo el saldo y se puede guardar; «3» reparte en tres que también cuadran", async () => {
    render(
      <RescheduleDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={jest.fn()}
      />,
    );
    await screen.findByLabelText("Fecha de la cuota 3");
    expect(screen.getByRole("radio", { name: "2" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "1 · todo junto" }));
    expect(screen.queryByLabelText("Fecha de la cuota 3")).toBeNull();
    expect(screen.getByLabelText("Fecha de la cuota 2")).toHaveValue(
      "2027-01-13",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /cuadran con el saldo/,
    );
    expect(
      screen.getByRole("button", { name: "Guardar cuotas" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("radio", { name: "3" }));
    expect(screen.getByLabelText("Fecha de la cuota 4")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /cuadran con el saldo/,
    );
  });

  it("un descuadre bloquea el guardado aunque el segmentado haya repartido bien antes", async () => {
    render(
      <RescheduleDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={jest.fn()}
      />,
    );
    await screen.findByLabelText("Fecha de la cuota 3");
    fireEvent.click(screen.getByRole("radio", { name: "1 · todo junto" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "100" } });
    expect(await screen.findByText(/Faltan/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cuotas" }),
    ).toBeDisabled();
  });
});
