import {
  ACCOUNT_STATUS_MAP,
  OVERAGE_METRICS,
  OVERAGE_METRIC_LABELS,
  PRICE_VIGENCY_MAP,
  canVoidInvoice,
  includedLabel,
  isInvoiceClosed,
  isSettledAfter,
  unitSizeLabel,
  vigencyKey,
} from "../billing";

describe("canVoidInvoice", () => {
  it("una factura abierta sin pagos se puede anular", () => {
    expect(canVoidInvoice({ status: "open", paid_cents: 0 })).toBe(true);
  });

  it("CON pagos aplicados NO se puede anular: la vía es la nota de crédito", () => {
    // El backend responde 409. El botón se deshabilita en vez de dejar que el
    // operador lo descubra al pulsarlo: un botón que solo falla al pulsarlo es
    // un botón que miente.
    expect(canVoidInvoice({ status: "partially_paid", paid_cents: 1 })).toBe(
      false,
    );
    expect(canVoidInvoice({ status: "open", paid_cents: 90_000_000 })).toBe(
      false,
    );
  });

  it("una factura ya pagada, anulada o incobrable no se anula", () => {
    expect(canVoidInvoice({ status: "paid", paid_cents: 0 })).toBe(false);
    expect(canVoidInvoice({ status: "void", paid_cents: 0 })).toBe(false);
    expect(canVoidInvoice({ status: "uncollectible", paid_cents: 0 })).toBe(
      false,
    );
  });
});

describe("isInvoiceClosed", () => {
  it("anulada e incobrable no admiten más administración", () => {
    expect(isInvoiceClosed({ status: "void" })).toBe(true);
    expect(isInvoiceClosed({ status: "uncollectible" })).toBe(true);
    expect(isInvoiceClosed({ status: "open" })).toBe(false);
  });
});

describe("isSettledAfter", () => {
  const base = {
    invoice_id: "018f0000-0000-7000-8000-000000000001",
    status: "paid",
    total_cents: 111_900_000,
    paid_cents: 90_000_000,
    withholding_cents: 21_900_000,
  };

  it("saldo cero significa que el backend YA reactivó el servicio", () => {
    // Es lo que hay que decirle al operador: si no, no sabe que su clic acaba
    // de devolverle el acceso a una empresa.
    expect(isSettledAfter({ ...base, outstanding_cents: 0 })).toBe(true);
  });

  it("un sobrepago también queda saldado", () => {
    expect(isSettledAfter({ ...base, outstanding_cents: -500 })).toBe(true);
  });

  it("con saldo restante no se anuncia reactivación", () => {
    expect(isSettledAfter({ ...base, outstanding_cents: 11_000_000 })).toBe(
      false,
    );
  });
});

describe("vigencyKey y PRICE_VIGENCY_MAP", () => {
  it("la vigente se distingue de una programada y de una desactivada", () => {
    expect(vigencyKey({ is_current: true, is_active: true })).toBe("current");
    expect(vigencyKey({ is_current: false, is_active: true })).toBe(
      "scheduled",
    );
    expect(vigencyKey({ is_current: false, is_active: false })).toBe(
      "disabled",
    );
  });

  it("solo la vigente es verde", () => {
    expect(PRICE_VIGENCY_MAP.current.tone).toBe("success");
    expect(PRICE_VIGENCY_MAP.scheduled.tone).toBe("neutral");
    expect(PRICE_VIGENCY_MAP.disabled.tone).toBe("neutral");
  });

  it("cada clave que produce vigencyKey tiene entrada en el mapa", () => {
    for (const key of ["current", "scheduled", "disabled"]) {
      expect(PRICE_VIGENCY_MAP[key]).toBeDefined();
    }
  });
});

describe("ACCOUNT_STATUS_MAP", () => {
  it("cubre los cuatro estados del backend", () => {
    for (const status of ["current", "past_due", "suspended", "cancelled"]) {
      expect(ACCOUNT_STATUS_MAP[status]).toBeDefined();
    }
  });

  it("suspendido es destructivo y la mora solo advertencia: la mora no bloquea", () => {
    expect(ACCOUNT_STATUS_MAP.suspended.tone).toBe("destructive");
    expect(ACCOUNT_STATUS_MAP.past_due.tone).toBe("warning");
  });
});

describe("etiquetas de excedentes", () => {
  it("toda métrica del enum está traducida: nadie debería traducir ai_tokens_input a mano", () => {
    // Sin número fijo a propósito. La COBERTURA la garantiza el Record
    // exhaustivo en tiempo de compilación —añadir una métrica al backend rompe
    // el typecheck, que es donde debe romper— así que un `toHaveLength(N)` aquí
    // solo obligaba a venir a subir el número cada vez. Lo que este test sí
    // aporta es que ninguna etiqueta se quedó con el nombre técnico.
    expect(OVERAGE_METRICS.length).toBeGreaterThan(0);
    for (const metric of OVERAGE_METRICS) {
      expect(OVERAGE_METRIC_LABELS[metric]).toBeTruthy();
      expect(OVERAGE_METRIC_LABELS[metric]).not.toContain("_");
    }
  });

  it("el bloque se presenta como «por cada N», no como un entero desnudo", () => {
    // Confundir el bloque facturable con la cantidad incluida hace que alguien
    // publique una tarifa mil veces más cara.
    expect(
      unitSizeLabel({ unit_size: 1_000_000, metric: "ai_tokens_input" }),
    ).toBe("por cada 1.000.000");
  });

  it("`included_quantity: null` significa tomar el tope del plan, y lo dice", () => {
    expect(includedLabel({ included_quantity: null })).toBe(
      "incluido: el tope del plan",
    );
    expect(includedLabel({ included_quantity: 1_000 })).toBe("incluido: 1.000");
  });
});
