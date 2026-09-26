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
    promises: [],
    notes: [],
    collapsed: false,
    schedule_changed_at: null,
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

describe("SendReminderDialog · por dónde (premium P5)", () => {
  beforeEach(() => {
    mockPlan.mockReset();
    mockSend.mockReset();
  });

  it("dice qué texto toca y manda por el canal elegido; por defecto WhatsApp", async () => {
    mockPlan.mockResolvedValue(plan(future(4)));
    mockSend.mockResolvedValue({ plan_id: "plan-1", outcome: "queued" });
    render(
      <SendReminderDialog
        open
        orderId="o1"
        contactName="Julián Torres"
        onOpenChange={() => undefined}
      />,
    );
    expect(await screen.findByText(/aún no vence/)).toHaveTextContent(
      "Toca el texto «Antes de vencer» · aún no vence.",
    );
    expect(screen.getByRole("radio", { name: /WhatsApp/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Correo/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar ahora por Correo" }),
    );
    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith(
        "plan-1",
        expect.objectContaining({ channel: "email" }),
      ),
    );
  });
});
