import {
  cycleCloseLabel,
  daysOverdue,
  daysToCycleClose,
  daysToSuspension,
  dunningVariant,
  suspensionDate,
  type BillingSummaryDTO,
} from "../account";

/** Resumen mínimo: cada prueba sobrescribe solo lo que le importa. */
function summary(over: Partial<BillingSummaryDTO> = {}): BillingSummaryDTO {
  return {
    account_status: "current",
    plan_code: "sbs",
    currency: "COP",
    cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "2026-09-01T00:00:00Z" },
    next_invoice_estimate_cents: 108_600_000,
    outstanding_cents: 0,
    open_invoices: 0,
    auto_charge: false,
    has_payment_source: false,
    grace_days: 5,
    oldest_due_at: null,
    ...over,
  };
}

describe("dunningVariant", () => {
  it("al día no pinta banner", () => {
    expect(dunningVariant(summary())).toBe("none");
  });

  it("`account_status: null` es el tenant en prueba, NO un error", () => {
    // Nunca tuvo cuenta de cobro. La pantalla tiene que funcionar igual.
    expect(dunningVariant(summary({ account_status: null }))).toBe("trial");
  });

  it("en mora avisa, y el panel sigue operativo", () => {
    expect(dunningVariant(summary({ account_status: "past_due" }))).toBe("past_due");
  });

  it("la baja es informativa", () => {
    expect(dunningVariant(summary({ account_status: "cancelled" }))).toBe("cancelled");
  });

  it("`suspended` no produce banner: quien está suspendido no entra al panel", () => {
    expect(dunningVariant(summary({ account_status: "suspended" }))).toBe("none");
  });
});

describe("daysToSuspension", () => {
  it("cuenta desde el vencimiento más antiguo más la gracia del tenant", () => {
    // Venció el 6, gracia de 5 ⇒ corte el 11. El 8 quedan 3 días.
    expect(
      daysToSuspension(
        summary({ oldest_due_at: "2026-09-06T00:00:00Z", grace_days: 5 }),
        new Date("2026-09-08T00:00:00Z"),
      ),
    ).toBe(3);
  });

  it("respeta la gracia CONFIGURADA, no un 5 cableado", () => {
    expect(
      daysToSuspension(
        summary({ oldest_due_at: "2026-09-06T00:00:00Z", grace_days: 15 }),
        new Date("2026-09-08T00:00:00Z"),
      ),
    ).toBe(13);
  });

  it("el mismo día del corte devuelve 0: «hoy» sigue siendo cuenta atrás", () => {
    expect(
      daysToSuspension(
        summary({ oldest_due_at: "2026-09-06T00:00:00Z", grace_days: 5 }),
        new Date("2026-09-11T00:00:00Z"),
      ),
    ).toBe(0);
  });

  it("pasado el corte devuelve null: el panel no adelanta una suspensión que el backend no ha aplicado", () => {
    expect(
      daysToSuspension(
        summary({ oldest_due_at: "2026-09-06T00:00:00Z", grace_days: 5 }),
        new Date("2026-09-20T00:00:00Z"),
      ),
    ).toBeNull();
  });

  it("sin vencimiento no hay cuenta atrás", () => {
    expect(daysToSuspension(summary({ oldest_due_at: null }))).toBeNull();
  });

  it("una fecha corrupta no revienta la pantalla", () => {
    expect(daysToSuspension(summary({ oldest_due_at: "no-es-una-fecha" }))).toBeNull();
  });
});

describe("daysOverdue", () => {
  it("cuenta los días transcurridos desde el vencimiento", () => {
    expect(
      daysOverdue(
        summary({ oldest_due_at: "2026-09-06T00:00:00Z" }),
        new Date("2026-09-12T00:00:00Z"),
      ),
    ).toBe(6);
  });

  it("antes del vencimiento es 0, nunca negativo", () => {
    expect(
      daysOverdue(
        summary({ oldest_due_at: "2026-09-30T00:00:00Z" }),
        new Date("2026-09-12T00:00:00Z"),
      ),
    ).toBe(0);
  });
});

describe("suspensionDate", () => {
  it("da la fecha del corte, más accionable que un número de días", () => {
    const date = suspensionDate(
      summary({ oldest_due_at: "2026-09-06T00:00:00Z", grace_days: 5 }),
    );

    expect(date?.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });

  it("sin vencimiento no hay fecha", () => {
    expect(suspensionDate(summary({ oldest_due_at: null }))).toBeNull();
  });
});

describe("daysToCycleClose", () => {
  it("cuenta los días que faltan para el corte", () => {
    expect(
      daysToCycleClose(
        summary({ cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "2026-09-01T00:00:00Z" } }),
        new Date("2026-08-20T00:00:00Z"),
      ),
    ).toBe(12);
  });

  it("un resto de horas cuenta como un día entero: a nadie le cobran «en 0,5 días»", () => {
    expect(
      daysToCycleClose(
        summary({ cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "2026-09-01T00:00:00Z" } }),
        new Date("2026-08-31T12:00:00Z"),
      ),
    ).toBe(1);
  });

  it("el día del corte es 0, y 0 de verdad — no `-0`", () => {
    // `Math.ceil` de un delta negativo mínimo devuelve `-0`, que pasa el
    // filtro de negativos y se pintaría como «-0 días».
    const result = daysToCycleClose(
      summary({ cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "2026-09-01T00:00:00Z" } }),
      new Date("2026-09-01T00:00:00Z"),
    );

    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
  });

  it("sin ciclo abierto no hay cuenta atrás", () => {
    expect(daysToCycleClose(summary({ cycle: null }))).toBeNull();
  });

  it("una fecha corrupta no revienta la pantalla del dinero", () => {
    expect(
      daysToCycleClose(
        summary({ cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "no-es-fecha" } }),
      ),
    ).toBeNull();
  });

  it("si el corte ya pasó devuelve null: el panel no narra el retraso del barrido", () => {
    expect(
      daysToCycleClose(
        summary({ cycle: { period_start: "2026-08-01T00:00:00Z", period_end: "2026-09-01T00:00:00Z" } }),
        new Date("2026-09-03T00:00:00Z"),
      ),
    ).toBeNull();
  });
});

describe("cycleCloseLabel", () => {
  it("sin dato pinta una raya, jamás un cero", () => {
    expect(cycleCloseLabel(null)).toBe("—");
  });

  it("el día del corte se dice con palabras, no con un 0", () => {
    expect(cycleCloseLabel(0)).toBe("Hoy");
  });

  it("no dice «Mañana» con un día: sería falso a las 22:00 de la víspera", () => {
    expect(cycleCloseLabel(1)).toBe("En 1 día");
  });

  it("pluraliza a partir de dos", () => {
    expect(cycleCloseLabel(12)).toBe("En 12 días");
  });
});
