import { render, screen, within } from "@testing-library/react";

const mockReminders = jest.fn<Promise<unknown>, [string]>();
jest.mock(
  "@/modules/collections/infrastructure/services/collections-service.adapter",
  () => ({
    getPlanReminders: (planId: string) => mockReminders(planId),
  }),
);

import { ReminderHistory } from "@/modules/collections/ui/components/ReminderHistory";

const event = (overrides: Record<string, unknown>) => ({
  id: "r1",
  installment_id: "i1",
  reminder_key: "due_soon_7",
  channel: "whatsapp",
  attempt: 1,
  status: "sent",
  skip_reason: null,
  error_code: null,
  created_at: "2026-09-24T14:00:00.000Z",
  resolved_at: null,
  ...overrides,
});

describe("ReminderHistory (premium P5: píldora y razón)", () => {
  it("lo que salió dice «Salió» sin razón; lo que no, «No salió» con la razón en negrita", async () => {
    mockReminders.mockResolvedValue({
      data: [
        event({ id: "a" }),
        event({
          id: "b",
          reminder_key: "due_today",
          status: "skipped",
          skip_reason: "installment_paid",
          channel: "email",
        }),
      ],
    });
    render(<ReminderHistory planId="plan-1" />);
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("7 días antes");
    expect(items[0]).toHaveTextContent("Salió");
    expect(
      within(items[0]).queryByText((_, node) => node?.tagName === "B"),
    ).toBeNull();
    expect(items[1]).toHaveTextContent("No salió");
    expect(items[1]).toHaveTextContent("Por correo");
    expect(
      within(items[1]).getByText((_, node) => node?.tagName === "B")
        .textContent,
    ).not.toBe("");
  });
});
