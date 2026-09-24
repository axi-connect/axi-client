import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockPlan = jest.fn<Promise<unknown>, [string]>();
const mockSend = jest.fn<Promise<unknown>, [string, unknown]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanByOrder: (orderId: string) => mockPlan(orderId),
    sendReminder: (planId: string, input: unknown) => mockSend(planId, input),
  }),
);

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { SendReminderDialog } from "@/modules/collections/ui/components/SendReminderDialog";

function plan(dueAt: string) {
  return {
    id: "plan-1",
    order_id: "o1",
    order_number: 44,
    contact_id: "c1",
    status: "active",
    currency: "COP",
    total_cents: 9_640_000,
    paid_cents: 0,
    balance_cents: 9_640_000,
    overdue_cents: 0,
    deposit_cents: 0,
    service_date: null,
    final_due_at: null,
    final_due_source: "fallback",
    next_due_at: dueAt,
    active_promise_at: null,
    assigned_user_id: null,
    installments: [
      {
        id: "i1",
        seq: 1,
        kind: "installment",
        due_at: dueAt,
        amount_cents: 3_213_333,
        paid_cents: 0,
        status: "pending",
        paid_at: null,
      },
    ],
  };
}

function future(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * El envío manual (F5 Cobros).
 *
 * Lo que el diálogo tiene que enseñar antes de mandar —y es su razón de ser— es
 * QUÉ texto va a salir y por qué. Se salta la cadencia, no la fecha.
 */
describe("SendReminderDialog", () => {
  beforeEach(() => {
    mockPlan.mockReset();
    mockSend.mockReset();
    mockShowAlert.mockReset();
  });

  it("una cuota que aún no vence NO anuncia el texto de mora", async () => {
    mockPlan.mockResolvedValue(plan(future(4)));
    render(
      <SendReminderDialog
        open
        orderId="o1"
        contactName="Julián Torres"
        onOpenChange={() => undefined}
      />,
    );

    expect(await screen.findByText(/aún no vence/i)).toBeInTheDocument();
    expect(screen.queryByText(/ya vencida/i)).not.toBeInTheDocument();
    expect(screen.getByText(/todavía no ha vencido/i)).toBeInTheDocument();
  });

  it("una cuota vencida sí", async () => {
    mockPlan.mockResolvedValue(plan(future(-3)));
    render(
      <SendReminderDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={() => undefined}
      />,
    );

    expect(await screen.findByText(/ya vencida/i)).toBeInTheDocument();
  });

  it("un `skipped` del servidor NO se cuenta como enviado", async () => {
    // No es un error de red: el servidor decidió no mandarlo. Decir «listo»
    // haría creer al operador que el cliente ya sabe, y no lo sabe.
    mockPlan.mockResolvedValue(plan(future(-1)));
    mockSend.mockResolvedValue({ plan_id: "plan-1", outcome: "skipped" });
    render(
      <SendReminderDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={() => undefined}
      />,
    );

    // Esperar a que el PLAN esté cargado: el botón existe antes, pero hasta
    // que no hay cuota no manda nada, y un click prematuro probaría un camino
    // que el operador nunca recorre.
    await screen.findByLabelText("Texto del recordatorio");
    fireEvent.click(screen.getByRole("button", { name: /Enviar ahora/i }));

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalled();
    });
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "warning", title: "No se envió" }),
    );
  });

  it("sin cuotas pendientes no deja escribir: sería pedirle dinero a quien no debe", async () => {
    const settled = plan(future(-1));
    settled.installments[0].status = "paid";
    mockPlan.mockResolvedValue(settled);
    render(
      <SendReminderDialog
        open
        orderId="o1"
        contactName="Laura Gómez"
        onOpenChange={() => undefined}
      />,
    );

    expect(
      await screen.findByText(/no tiene cuotas pendientes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Enviar ahora/i }),
    ).toBeDisabled();
  });
});
