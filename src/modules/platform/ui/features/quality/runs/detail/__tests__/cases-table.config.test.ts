import { toCaseRow } from "../cases-table.config";
import type { RunCase } from "../../../../../../domain/quality-runs";

const BASE: RunCase = {
  id: "c-1",
  status: "passed",
  scenario: { code: "buyer_multi_product", name: "Comprador decidido" },
  conversation_id: "conv-1",
  turns_used: 6,
  judge_score: 80,
  checks: [
    { kind: "order_created", passed: true, detail: "pedido con 5 unidades" },
    { kind: "max_reply_ms", passed: false, detail: "p100 9800 ms > 5000 ms" },
  ],
  failure_reason: null,
  purged: false,
  started_at: "2026-08-03T00:00:00Z",
  finished_at: "2026-08-03T00:02:00Z",
} as RunCase;

describe("toCaseRow", () => {
  it("aplana el case con el conteo de checks aprobados", () => {
    const row = toCaseRow(BASE);
    expect(row).toMatchObject({
      id: "c-1",
      scenario_code: "buyer_multi_product",
      checks_passed: 1,
      checks_total: 2,
      has_invalid_criteria: false,
      judge_score: 80,
      purged: false,
    });
  });

  it("stress (scenario null) → placeholders y checks vacíos sin romper", () => {
    const row = toCaseRow({ ...BASE, scenario: null, checks: null, judge_score: null });
    expect(row.scenario_code).toBe("—");
    expect(row.scenario_name).toBe("Conversación sintética");
    expect(row.checks_total).toBe(0);
    expect(row.judge_score).toBeNull();
  });

  it("detecta invalid_criteria (escenario roto) y checks ilegibles se descartan", () => {
    const row = toCaseRow({
      ...BASE,
      checks: [
        { kind: "invalid_criteria", passed: false, detail: "criterios ilegibles" },
        "basura",
      ],
    });
    expect(row.has_invalid_criteria).toBe(true);
    expect(row.checks_total).toBe(1);
    expect(row.checks_passed).toBe(0);
  });
});
