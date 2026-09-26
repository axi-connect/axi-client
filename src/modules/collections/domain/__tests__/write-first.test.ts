import {
  groupReceivables,
  type ReceivableDTO,
} from "@/modules/collections/domain/receivable";
import {
  initialsOf,
  reminderFact,
  writeFirst,
} from "@/modules/collections/domain/write-first";

const NOW = new Date(2026, 8, 25, 10, 0, 0);

const row = (overrides: Partial<ReceivableDTO> = {}): ReceivableDTO =>
  ({
    plan_id: "p1",
    order_id: "o1",
    order_number: 42,
    contact_id: "c1",
    contact_name: "Laura Gómez",
    service_date: null,
    travelled: false,
    last_reminder: null,
    currency: "COP",
    total_cents: 1_000_000,
    paid_cents: 300_000,
    balance_cents: 700_000,
    overdue_cents: 0,
    next_due_at: null,
    days_overdue: 0,
    bucket: "current",
    installments_total: 3,
    installments_paid: 1,
    active_promise_at: null,
    last_promise: null,
    assigned_user_id: null,
    paused: false,
    ...overrides,
  }) as ReceivableDTO;

describe("writeFirst (premium P4: la isla es la primera fila del orden)", () => {
  it("toma la primera fila de la primera sección, no otra", () => {
    const first = row({
      plan_id: "a",
      contact_name: "Andrés",
      travelled: true,
      days_overdue: 6,
      overdue_cents: 500,
    });
    const second = row({
      plan_id: "b",
      contact_name: "Marta",
      days_overdue: 40,
      overdue_cents: 900,
    });
    const result = writeFirst(groupReceivables([second, first]), NOW);
    expect(result?.row.plan_id).toBe("a");
    expect(result?.why).toMatch(/Ya viajó/);
  });

  it("si todos van al día no hay a quién escribir primero; con uno por vencer, sí", () => {
    expect(writeFirst(groupReceivables([row()]), NOW)).toBeNull();
    expect(writeFirst([], NOW)).toBeNull();
    const soon = writeFirst(
      groupReceivables([row({ next_due_at: "2026-09-26" })]),
      NOW,
    );
    expect(soon?.section).toBe("soon");
    expect(soon?.facts[0]).toEqual({ label: "Vence", value: "mañana" });
  });

  it("pide lo vencido cuando hay; si es solo una parte del saldo lo marca, y si es todo no", () => {
    const partial = writeFirst(
      groupReceivables([
        row({
          days_overdue: 6,
          overdue_cents: 685_522_00,
          balance_cents: 2_056_566_00,
        }),
      ]),
      NOW,
    );
    expect(partial).toMatchObject({
      askCents: 685_522_00,
      askKind: "overdue",
      partial: true,
    });
    const all = writeFirst(
      groupReceivables([
        row({
          days_overdue: 47,
          overdue_cents: 8_100_000_00,
          balance_cents: 8_100_000_00,
        }),
      ]),
      NOW,
    );
    expect(all).toMatchObject({
      askCents: 8_100_000_00,
      askKind: "overdue",
      partial: false,
    });
    expect(all?.facts[0]).toEqual({ label: "Venció", value: "hace 47 días" });
  });

  it("quien viajó sin cuota vencida debe todo el saldo: se pide el saldo", () => {
    const result = writeFirst(
      groupReceivables([row({ travelled: true, balance_cents: 700_000 })]),
      NOW,
    );
    expect(result).toMatchObject({
      askCents: 700_000,
      askKind: "balance",
      partial: false,
    });
  });

  it("la promesa manda sobre la sección en el porqué: viva o rota, cada una dice lo suyo", () => {
    const live = writeFirst(
      groupReceivables([
        row({
          days_overdue: 3,
          overdue_cents: 10,
          active_promise_at: "2026-09-29",
        }),
      ]),
      NOW,
    );
    expect(live?.why).toMatch(/^Prometió pagar: los avisos/);
    expect(live?.facts.map((fact) => fact.label)).toEqual([
      "Venció",
      "Promesa",
      "Último aviso",
    ]);
    const broken = writeFirst(
      groupReceivables([
        row({
          days_overdue: 3,
          overdue_cents: 10,
          last_promise: { promised_at: "2026-09-22", status: "broken" },
        }),
      ]),
      NOW,
    );
    expect(broken?.why).toBe("Prometió pagar y el día pasó sin el pago.");
    expect(broken?.facts.map((fact) => fact.label)).toEqual([
      "Venció",
      "Último aviso",
    ]);
  });
});

describe("reminderFact", () => {
  it("dice si el aviso llegó, sin repetir la razón que ya lleva la fila", () => {
    const yesterday = new Date(2026, 8, 24, 18, 0, 0).toISOString();
    expect(reminderFact(null, NOW)).toBe("ninguno todavía");
    expect(
      reminderFact(
        {
          at: yesterday,
          status: "skipped",
          channel: "whatsapp",
          skip_reason: "outside_service_window_no_hsm",
        },
        NOW,
      ),
    ).toBe("ayer · no salió");
    expect(
      reminderFact(
        {
          at: yesterday,
          status: "failed",
          channel: "whatsapp",
          skip_reason: null,
        },
        NOW,
      ),
    ).toBe("ayer · falló");
    expect(
      reminderFact(
        {
          at: NOW.toISOString(),
          status: "delivered",
          channel: "whatsapp",
          skip_reason: null,
        },
        NOW,
      ),
    ).toBe("hoy · entregado");
  });
});

describe("initialsOf", () => {
  it("nombre y último apellido; un nombre solo, sus dos letras; vacío, nada", () => {
    expect(initialsOf("Marta León Villegas")).toBe("MV");
    expect(initialsOf("  andrés  ")).toBe("AN");
    expect(initialsOf("")).toBe("");
  });
});
