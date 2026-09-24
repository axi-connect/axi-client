import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import { expectAlertContract } from "@/core/notifications/testing";
import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";

const mockPlan = jest.fn<Promise<PlanDetailDTO>, [string]>();
const mockRecord = jest.fn<
  Promise<unknown>,
  [string, Record<string, unknown>]
>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    recordPromise: (planId: string, body: Record<string, unknown>) =>
      mockRecord(planId, body),
  }),
);
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { PromiseDialog } from "@/modules/collections/ui/components/PromiseDialog";

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
  ...overrides,
});

function open() {
  const onOpenChange = jest.fn();
  const onDone = jest.fn();
  render(
    <PromiseDialog
      open
      orderId="o1"
      contactName="Diana Salazar"
      onOpenChange={onOpenChange}
      onDone={onDone}
    />,
  );
  return { onOpenChange, onDone };
}

describe("PromiseDialog: una frase con fecha, no un formulario", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date(2026, 8, 15, 10), advanceTimers: true });
    mockPlan.mockResolvedValue(plan());
  });
  afterEach(() => jest.useRealTimers());

  it("propone «en 3 días» con su fecha real, lo que falta de la cuota vencida, y dice ANTES lo que pasará", async () => {
    open();
    expect(await screen.findByText(/debe \$ 8\.120\.000/)).toBeInTheDocument();
    expect(mockPlan).toHaveBeenCalledWith("o1");
    const in3 = screen.getByRole("radio", { name: /En 3 días/ });
    expect(in3).toBeChecked();
    expect(in3).toHaveTextContent(/18 de sept de 2026/);
    // El lunes 21 cae después de los 3 días: se ofrece con su fecha
    expect(screen.getByRole("radio", { name: /El lunes/ })).toHaveTextContent(
      /21 de sept/,
    );
    // El monto propuesto es lo que falta de la cuota vencida, no el saldo
    expect(screen.getByLabelText(/Cuánto/)).toHaveValue("3.480.000");
    expect(
      screen.getByText(/en pausa hasta el 18 de sept de 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/se marca/)).toHaveTextContent(/rota/);
  });

  it("anota con la fecha del chip, el monto y la nota; el aviso cumple §9.4 y el que abrió relee", async () => {
    mockRecord.mockResolvedValue({ plan_id: "plan-1" });
    const { onOpenChange, onDone } = open();
    await screen.findByRole("radio", { name: /En 3 días/ });
    fireEvent.click(screen.getByRole("radio", { name: /El lunes/ }));
    fireEvent.change(screen.getByLabelText(/Nota para el equipo/), {
      target: { value: "Cobra el 20 y paga ese día" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Anotar promesa/ }));
    await waitFor(() =>
      expect(mockRecord).toHaveBeenCalledWith("plan-1", {
        promised_at: "2026-09-21",
        amount_cents: 348_000_000,
        note: "Cobra el 20 y paga ese día",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDone).toHaveBeenCalled();
    const alert = mockShowAlert.mock.calls[0]?.[0] as {
      title: string;
      description: string;
    };
    expect(alert.title).toBe("Promesa anotada");
    expect(alert.description).toMatch(/^Para el 21 de sept de 2026\./);
    expectAlertContract(alert);
  });

  it("«otra fecha» exige un día posterior a hoy; sin monto viaja sin amount_cents", async () => {
    mockRecord.mockResolvedValue({ plan_id: "plan-1" });
    open();
    await screen.findByRole("radio", { name: /Otra fecha/ });
    fireEvent.click(screen.getByRole("radio", { name: /Otra fecha/ }));
    const date = screen.getByLabelText("Otra fecha");
    fireEvent.change(date, { target: { value: "2026-09-15" } });
    expect(screen.getByText(/posterior a hoy/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Anotar promesa/ }),
    ).toBeDisabled();
    fireEvent.change(date, { target: { value: "2026-10-05" } });
    // Vaciar el monto: la promesa puede ser solo de fecha
    const amount = screen.getByLabelText(/Cuánto/);
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Anotar promesa/ }));
    await waitFor(() =>
      expect(mockRecord).toHaveBeenCalledWith("plan-1", {
        promised_at: "2026-10-05",
      }),
    );
  });

  it("409 «ya hay una viva» no es un error de quien está aquí: aviso info, cierra y relee; otro error queda inline", async () => {
    mockRecord.mockRejectedValueOnce(
      new HttpError({
        status: 409,
        code: "collections/promise_exists",
        message: "Ya hay una promesa de pago vigente",
      }),
    );
    const { onOpenChange, onDone } = open();
    await screen.findByRole("radio", { name: /En 3 días/ });
    fireEvent.click(screen.getByRole("button", { name: /Anotar promesa/ }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onDone).toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "info",
        title: "Ya hay una promesa viva",
      }),
    );
    expectAlertContract(mockShowAlert.mock.calls[0]?.[0]);

    mockRecord.mockRejectedValueOnce(new Error("Se cayó"));
    fireEvent.click(screen.getByRole("button", { name: /Anotar promesa/ }));
    expect(await screen.findByText("Se cayó")).toHaveAttribute("role", "alert");
    expect(mockShowAlert).toHaveBeenCalledTimes(1);
  });
});
