import type { PlatformInvoice } from "@/modules/platform/domain/billing";
import { toPortfolioRow } from "../portfolio-table.config";

function invoice(over: Partial<PlatformInvoice> = {}): PlatformInvoice {
  return {
    id: "018f0000-0000-7000-8000-000000000042",
    company_id: "018f0000-0000-7000-8000-0000000000c1",
    company_name: "Distribuidora Andina S.A.S.",
    number: "AXI-000042",
    status: "open",
    period_start: "2026-08-01T00:00:00.000Z",
    period_end: "2026-08-31T23:59:59.000Z",
    issued_at: "2026-09-01T00:00:00.000Z",
    due_at: "2026-09-06T00:00:00.000Z",
    total_cents: 122_900_000,
    paid_cents: 0,
    withholding_cents: 0,
    outstanding_cents: 122_900_000,
    currency: "COP",
    ...over,
  };
}

const NOW = new Date("2026-09-12T10:00:00.000Z");

describe("toPortfolioRow", () => {
  it("cuenta los días desde el vencimiento", () => {
    expect(toPortfolioRow(invoice(), NOW).days_overdue).toBe(6);
  });

  it("una factura que aún no vence tiene 0 días, nunca negativos", () => {
    expect(
      toPortfolioRow(invoice({ due_at: "2026-09-30T00:00:00.000Z" }), NOW).days_overdue,
    ).toBe(0);
  });

  it("sin vencimiento no cuenta días", () => {
    const row = toPortfolioRow(invoice({ due_at: null }), NOW);
    expect(row.days_overdue).toBe(0);
    expect(row.due_at).toBe("");
  });

  it("sin nombre de empresa cae al id truncado, no a una fila anónima", () => {
    // Es una pantalla de cobranza: una fila sin identificar no sirve para nada,
    // y nadie llama a un uuid completo.
    const row = toPortfolioRow(invoice({ company_name: null }), NOW);
    expect(row.company).toBe("018f0000…");
    expect(row.company_id).toBe("018f0000-0000-7000-8000-0000000000c1");
  });

  it("la fila es PLANA: el DataTable exige primitivos", () => {
    // Un objeto anidado aquí revienta el ordenamiento y la búsqueda del
    // componente compartido.
    for (const value of Object.values(toPortfolioRow(invoice(), NOW))) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  });

  it("conserva `outstanding_cents` tal cual: la retención ya está descontada", () => {
    const source = invoice({
      paid_cents: 100_000_000,
      withholding_cents: 22_900_000,
      outstanding_cents: 0,
    });
    const row = toPortfolioRow(source, NOW);

    // El cliente giró 100.000.000 y retuvo 22.900.000: la factura está saldada.
    // total − pagado daría 22.900.000 de deuda a quien pagó bien.
    expect(row.outstanding_cents).toBe(0);
    expect(source.total_cents - source.paid_cents).toBe(22_900_000);
  });

  it("no arrastra `paid_cents` a la fila: la decisión de anular necesita la factura completa", () => {
    // `canVoidInvoice` mira los pagos aplicados, y para eso el panel recibe el
    // `PlatformInvoice` entero vía `getInvoice`, no la fila aplanada.
    expect("paid_cents" in toPortfolioRow(invoice(), NOW)).toBe(false);
  });
});
