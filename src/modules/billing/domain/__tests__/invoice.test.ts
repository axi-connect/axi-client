import {
  INVOICE_STATUS_MAP,
  hasWithholding,
  isCreditLine,
  isOverdue,
  isPayable,
  type InvoiceStatus,
} from "../invoice";

const ALL_STATUSES: InvoiceStatus[] = [
  "draft",
  "open",
  "partially_paid",
  "paid",
  "void",
  "uncollectible",
];

describe("INVOICE_STATUS_MAP", () => {
  it("cubre los seis estados: uno sin entrada saldría crudo en la insignia", () => {
    for (const status of ALL_STATUSES) {
      expect(INVOICE_STATUS_MAP[status]).toBeDefined();
      expect(INVOICE_STATUS_MAP[status].label).not.toBe("");
    }
  });

  it("solo `paid` es verde: pago parcial sigue debiendo dinero", () => {
    expect(INVOICE_STATUS_MAP.paid.tone).toBe("success");
    expect(INVOICE_STATUS_MAP.partially_paid.tone).toBe("warning");
    expect(INVOICE_STATUS_MAP.open.tone).toBe("warning");
  });

  it("anulada e incobrable son neutras, no destructivas: no son un error del usuario", () => {
    expect(INVOICE_STATUS_MAP.void.tone).toBe("neutral");
    expect(INVOICE_STATUS_MAP.uncollectible.tone).toBe("neutral");
  });
});

describe("isPayable", () => {
  it("una factura abierta con saldo se puede pagar", () => {
    expect(isPayable({ status: "open", outstanding_cents: 110_000 })).toBe(true);
  });

  it("un pago parcial con saldo se puede completar", () => {
    expect(isPayable({ status: "partially_paid", outstanding_cents: 11_000_000 })).toBe(true);
  });

  it("SALDO CERO no es pagable aunque el estado sea `partially_paid`", () => {
    // El caso que rompe las implementaciones ingenuas: el cliente retuvo
    // ReteFuente, giró menos que el total y la factura está saldada. Ofrecerle
    // pagar sería cobrarle dos veces.
    expect(isPayable({ status: "partially_paid", outstanding_cents: 0 })).toBe(false);
  });

  it("ningún estado terminal admite pago, ni con saldo", () => {
    for (const status of ["paid", "void", "uncollectible", "draft"] as InvoiceStatus[]) {
      expect(isPayable({ status, outstanding_cents: 29_900_000 })).toBe(false);
    }
  });

  it("un saldo negativo (sobrepago) tampoco es pagable", () => {
    expect(isPayable({ status: "open", outstanding_cents: -1 })).toBe(false);
  });
});

describe("hasWithholding", () => {
  it("cualquier retención practicada se muestra: no se esconde", () => {
    expect(hasWithholding({ withholding_cents: 1 })).toBe(true);
    expect(hasWithholding({ withholding_cents: 0 })).toBe(false);
  });
});

describe("isCreditLine", () => {
  it("solo `credit` resta del total", () => {
    expect(isCreditLine({ kind: "credit" })).toBe(true);
    expect(isCreditLine({ kind: "adjustment" })).toBe(false);
    expect(isCreditLine({ kind: "subscription" })).toBe(false);
    expect(isCreditLine({ kind: "overage" })).toBe(false);
  });
});

describe("isOverdue", () => {
  const NOW = new Date("2026-09-12T10:00:00Z");

  it("venció y sigue con saldo", () => {
    expect(
      isOverdue(
        { status: "open", outstanding_cents: 110_000, due_at: "2026-09-06T00:00:00Z" },
        NOW,
      ),
    ).toBe(true);
  });

  it("vence en el futuro: todavía no está vencida", () => {
    expect(
      isOverdue(
        { status: "open", outstanding_cents: 110_000, due_at: "2026-09-30T00:00:00Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("una factura saldada NO está vencida aunque la fecha haya pasado", () => {
    expect(
      isOverdue({ status: "paid", outstanding_cents: 0, due_at: "2026-01-01T00:00:00Z" }, NOW),
    ).toBe(false);
  });

  it("sin vencimiento no hay mora que pintar", () => {
    expect(isOverdue({ status: "open", outstanding_cents: 110_000, due_at: null }, NOW)).toBe(
      false,
    );
  });
});
