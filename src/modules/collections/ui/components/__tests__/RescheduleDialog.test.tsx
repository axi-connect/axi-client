import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import { expectAlertContract } from "@/core/notifications/testing";
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
};

describe("RescheduleDialog: solo lo pendiente, y la suma cuadra mientras se escribe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlan.mockResolvedValue(PLAN);
  });

  it("edita SOLO las cuotas pendientes con lo que les falta, numeradas después de las pagadas, y cuadra al abrir", async () => {
    render(
      <RescheduleDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={jest.fn()}
      />,
    );
    expect(
      await screen.findByText(/1 cuota pagada no se toca/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de la cuota 2")).toHaveValue(
      "2027-01-14",
    );
    expect(screen.getByLabelText("Fecha de la cuota 3")).toHaveValue(
      "2027-01-13",
    );
    expect(screen.queryByLabelText("Fecha de la cuota 1")).toBeNull();
    expect(screen.getByText(/cuadran con el saldo/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cuotas" }),
    ).toBeEnabled();
  });

  it("si no suman el saldo, dice cuánto falta y el botón no se puede pulsar; al cuadrar, guarda y avisa según §9.4", async () => {
    mockReschedule.mockResolvedValue({ plan_id: "plan-1" });
    const onDone = jest.fn();
    render(
      <RescheduleDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={jest.fn()}
        onDone={onDone}
      />,
    );
    await screen.findByLabelText("Fecha de la cuota 3");
    const inputs = screen.getAllByRole("textbox");
    const lastAmount = inputs[inputs.length - 1];
    fireEvent.focus(lastAmount);
    fireEvent.change(lastAmount, { target: { value: "5.000.000" } });
    expect(await screen.findByText(/Faltan/)).toHaveTextContent(
      /\$ 2\.596\.103/,
    );
    expect(
      screen.getByRole("button", { name: "Guardar cuotas" }),
    ).toBeDisabled();
    // Quitar la cuota 3 y volverla a añadir: la nueva nace con lo que falta
    fireEvent.click(screen.getByRole("button", { name: "Quitar la cuota 3" }));
    fireEvent.click(screen.getByRole("button", { name: /Añadir cuota/ }));
    await waitFor(() =>
      expect(screen.getByText(/cuadran con el saldo/)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Fecha de la cuota 3"), {
      target: { value: "2027-02-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cuotas" }));
    await waitFor(() =>
      expect(mockReschedule).toHaveBeenCalledWith("plan-1", [
        { due_at: "2027-01-14", amount_cents: 759_610_200 },
        { due_at: "2027-02-01", amount_cents: 759_610_300 },
      ]),
    );
    expect(onDone).toHaveBeenCalled();
    const alert = mockShowAlert.mock.calls[0]?.[0] as { title: string };
    expect(alert.title).toBe("Cuotas reprogramadas");
    expectAlertContract(alert);
  });

  it("el 409 del servidor (el saldo cambió mientras tanto) se dice con sus cifras, inline", async () => {
    mockReschedule.mockRejectedValueOnce(
      new HttpError({
        status: 409,
        code: "collections/schedule_mismatch",
        message: "no cuadra",
        problem: {
          type: "about:blank",
          title: "No cuadra",
          status: 409,
          code: "collections/schedule_mismatch",
          detail: "Las cuotas suman $ 15.192.205 y el saldo es $ 14.192.205",
        },
      }),
    );
    render(
      <RescheduleDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={jest.fn()}
      />,
    );
    await screen.findByLabelText("Fecha de la cuota 3");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cuotas" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/14\.192\.205/);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });
});
