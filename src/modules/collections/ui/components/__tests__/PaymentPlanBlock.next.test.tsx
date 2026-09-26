import { fireEvent, render, screen } from "@testing-library/react";

import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";

const mockPlan = jest.fn<Promise<PlanDetailDTO>, [string]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    getPlanReminders: () => Promise.resolve({ data: [] }),
    recordPromise: jest.fn(),
    reschedulePlan: jest.fn(),
    addPlanNote: jest.fn(),
    sendReminder: jest.fn(),
  }),
);
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import { PaymentPlanBlock } from "@/modules/collections/ui/components/PaymentPlanBlock";

const plan = (overrides: Partial<PlanDetailDTO> = {}): PlanDetailDTO => ({
  id: "plan-1",
  order_id: "o1",
  order_number: 47,
  contact_id: "c1",
  status: "active",
  currency: "COP",
  total_cents: 1_160_000_000,
  paid_cents: 348_000_000,
  balance_cents: 812_000_000,
  deposit_cents: 348_000_000,
  service_date: "2027-03-14",
  final_due_at: "2027-01-13",
  final_due_source: "service_date",
  next_due_at: "2026-09-10",
  active_promise_at: null,
  assigned_user_id: null,
  installments: [
    {
      id: "i1",
      seq: 1,
      kind: "deposit",
      due_at: "2026-07-02",
      amount_cents: 348_000_000,
      paid_cents: 348_000_000,
      status: "paid",
      paid_at: "2026-07-02T10:00:00.000Z",
    },
    {
      id: "i2",
      seq: 2,
      kind: "installment",
      due_at: "2026-09-10",
      amount_cents: 348_000_000,
      paid_cents: 0,
      status: "overdue",
      paid_at: null,
    },
    {
      id: "i3",
      seq: 3,
      kind: "balance",
      due_at: "2027-01-13",
      amount_cents: 464_000_000,
      paid_cents: 0,
      status: "pending",
      paid_at: null,
    },
  ],
  promises: [],
  notes: [],
  collapsed: false,
  schedule_changed_at: null,
  ...overrides,
});

describe("PaymentPlanBlock · lo próximo y el riel (premium P4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockImplementation(() => true);
  });

  it("la cuota que toca es la isla «Lo próximo», con lo que falta de ella y la acción del rail", async () => {
    mockPlan.mockResolvedValue(plan());
    const onRegisterPayment = jest.fn();
    render(
      <PaymentPlanBlock orderId="o1" onRegisterPayment={onRegisterPayment} />,
    );
    const island = await screen.findByRole("region", { name: "Lo próximo" });
    expect(island).toHaveTextContent("Cuota 2 de 3, el");
    expect(island).toHaveTextContent("$ 3.480.000");
    expect(island).toHaveTextContent("Venció");
    fireEvent.click(screen.getByRole("button", { name: "Registrar el abono" }));
    expect(onRegisterPayment).toHaveBeenCalledTimes(1);
  });

  it("con otra isla en el rail, lo próximo baja a ficha y sin la acción no ofrece botón", async () => {
    mockPlan.mockResolvedValue(plan());
    render(<PaymentPlanBlock orderId="o1" island={false} />);
    await screen.findByRole("list", { name: "Cuotas" });
    expect(screen.queryByRole("region", { name: "Lo próximo" })).toBeNull();
    expect(
      screen.getByText(/Cuota 2 de 3 · \$ 3\.480\.000/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Registrar el abono" }),
    ).toBeNull();
  });

  it("el calendario lista cada cuota una vez y un saldo reprogramado no se repite como «Saldo final»", async () => {
    const base = plan();
    mockPlan.mockResolvedValue(
      plan({
        installments: [
          base.installments[0],
          {
            ...base.installments[2],
            id: "old",
            seq: 2,
            amount_cents: 100_000_000,
            paid_cents: 100_000_000,
            status: "paid",
            paid_at: "2026-09-01T10:00:00.000Z",
          },
          { ...base.installments[2], id: "new", seq: 3 },
        ],
      }),
    );
    render(<PaymentPlanBlock orderId="o1" />);
    const list = await screen.findByRole("list", { name: "Cuotas" });
    const items = Array.from(list.querySelectorAll("li")).map(
      (li) => li.querySelector("p")?.textContent,
    );
    expect(items).toEqual(["Anticipo", "Cuota 2 de 3", "Saldo final"]);
  });

  it("B7: una cuota vencida dentro de la gracia (aún `pending`) dice «Venció…», no «Próxima cuota en hace…»", async () => {
    const base = plan();
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const due = past.toLocaleDateString("en-CA");
    mockPlan.mockResolvedValue(
      plan({
        installments: [
          base.installments[0],
          { ...base.installments[1], due_at: due, status: "pending" },
          base.installments[2],
        ],
      }),
    );
    render(<PaymentPlanBlock orderId="o1" island={false} />);
    expect(await screen.findByText("Venció hace 3 días")).toBeInTheDocument();
    expect(screen.queryByText(/Próxima cuota en hace/)).toBeNull();
  });
});
