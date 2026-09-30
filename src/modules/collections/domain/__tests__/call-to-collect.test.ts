import { callSummaryFromPlan, callSummaryFromRow, canCallToCollect } from "../call-to-collect";
import type { PlanDetailDTO } from "../payment-plan";
import type { ReceivableDTO } from "../receivable";

const installment = (seq: number, due_at: string, status: PlanDetailDTO["installments"][number]["status"], paid = 0) => ({
  id: `i${String(seq)}`,
  seq,
  kind: "installment" as const,
  due_at,
  amount_cents: 5_000_000,
  paid_cents: paid,
  status,
  paid_at: null,
});

describe("«Llamar para cobrar» (F3): lo que ve quien llama", () => {
  it("desde el plan: lo vencido suma lo que falta de cada cuota vencida y cuenta desde la más vieja", () => {
    const plan = {
      id: "p1",
      order_number: 1042,
      currency: "COP",
      balance_cents: 12_000_000,
      status: "active",
      next_due_at: "2026-09-20",
      active_promise_at: null,
      installments: [
        installment(1, "2026-09-10", "paid", 5_000_000),
        installment(2, "2026-09-20", "overdue", 1_000_000),
        installment(3, "2026-09-25", "overdue"),
        installment(4, "2026-10-08", "pending"),
      ],
    } as unknown as PlanDetailDTO;
    expect(callSummaryFromPlan(plan, new Date(2026, 8, 30))).toEqual({
      plan_id: "p1",
      order_number: 1042,
      currency: "COP",
      balance_cents: 12_000_000,
      overdue_cents: 9_000_000,
      days_overdue: 10,
      next_due_at: "2026-09-20",
      promised_at: null,
    });
  });

  it("desde la fila de la cartera: todo sale de la fila", () => {
    const row = {
      plan_id: "p2",
      order_number: null,
      currency: "COP",
      balance_cents: 8_000_000,
      overdue_cents: 0,
      days_overdue: 0,
      next_due_at: "2026-10-08",
      active_promise_at: "2026-10-02",
    } as unknown as ReceivableDTO;
    expect(callSummaryFromRow(row)).toMatchObject({ plan_id: "p2", overdue_cents: 0, promised_at: "2026-10-02" });
  });

  it("sin saldo o con el plan cerrado no se ofrece la llamada", () => {
    expect(canCallToCollect({ balance_cents: 0 })).toBe(false);
    expect(canCallToCollect({ balance_cents: 100, status: "settled" })).toBe(false);
    expect(canCallToCollect({ balance_cents: 100, status: "active" })).toBe(true);
    expect(canCallToCollect({ balance_cents: 100 })).toBe(true);
  });
});
