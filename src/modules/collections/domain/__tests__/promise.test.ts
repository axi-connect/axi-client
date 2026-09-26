import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";
import {
  canPromise,
  canReschedule,
  dateChips,
  isoDay,
  pendingSchedule,
  promiseCard,
  promiseHistory,
  promiseLine,
  scheduleCheck,
  splitSchedule,
  suggestedPromiseCents,
  type PromiseDTO,
} from "@/modules/collections/domain/promise";

const promise = (overrides: Partial<PromiseDTO> = {}): PromiseDTO => ({
  id: "pr1",
  promised_at: "2026-09-22",
  amount_cents: 348_000_000,
  note: "Cobra el 20 y paga ese día",
  status: "pending",
  created_at: "2026-09-16T15:00:00.000Z",
  resolved_at: null,
  created_by_user_id: "u1",
  ...overrides,
});

const installment = (
  overrides: Partial<PlanDetailDTO["installments"][number]> = {},
): PlanDetailDTO["installments"][number] => ({
  id: "i1",
  seq: 1,
  kind: "installment",
  due_at: "2026-09-10",
  amount_cents: 348_000_000,
  paid_cents: 0,
  status: "overdue",
  paid_at: null,
  ...overrides,
});

describe("promiseCard: tres estados, tres frases", () => {
  it("viva: cuánto y cuándo, la pausa, la nota y «Escribir»", () => {
    const card = promiseCard({ promises: [promise()], currency: "COP" });
    expect(card).toMatchObject({
      tone: "info",
      title: expect.stringMatching(
        /^Prometió pagar \$\s?3\.480\.000 el 22 de sept de 2026\.$/,
      ),
      detail: "Los recordatorios quedan en pausa hasta ese día.",
      note: "Cobra el 20 y paga ese día",
      actions: ["write"],
    });
    // Sin monto, la frase no inventa uno
    expect(
      promiseCard({
        promises: [promise({ amount_cents: null })],
        currency: "COP",
      })?.title,
    ).toBe("Prometió pagar el 22 de sept de 2026.");
  });

  it("cumplida: pagó el día que pagó, «un día antes» si adelantó; sin salidas", () => {
    const card = promiseCard({
      promises: [
        promise({ status: "kept", resolved_at: "2026-09-21T14:00:00.000Z" }),
      ],
      currency: "COP",
    });
    expect(card?.tone).toBe("success");
    expect(card?.title).toBe(
      "Cumplió la promesa del 22 de sept de 2026: pagó el 21 de sept de 2026, un día antes.",
    );
    expect(card?.actions).toEqual([]);
    // Pagó el mismo día: sin «antes»
    expect(
      promiseCard({
        promises: [
          promise({ status: "kept", resolved_at: "2026-09-22T09:00:00.000Z" }),
        ],
        currency: "COP",
      })?.title,
    ).toMatch(/pagó el 22 de sept de 2026\.$/);
  });

  it("rota: la consecuencia con su fecha y las dos salidas; cancelada no dice nada", () => {
    const card = promiseCard({
      promises: [
        promise({ status: "broken", resolved_at: "2026-09-23T05:00:00.000Z" }),
      ],
      currency: "COP",
    });
    expect(card).toMatchObject({
      tone: "warning",
      title: "No cumplió la promesa del 22 de sept de 2026.",
      detail: "Los recordatorios volvieron solos el 23 de sept de 2026.",
      actions: ["promise_again", "write"],
    });
    expect(
      promiseCard({
        promises: [promise({ status: "cancelled" })],
        currency: "COP",
      }),
    ).toBeNull();
    expect(promiseCard({ promises: [], currency: "COP" })).toBeNull();
  });

  it("la MÁS RECIENTE manda: una rota vieja bajo una viva nueva enseña la viva", () => {
    const card = promiseCard({
      promises: [
        promise({ id: "new", promised_at: "2026-10-05" }),
        promise({ id: "old", status: "broken" }),
      ],
      currency: "COP",
    });
    expect(card?.tone).toBe("info");
    expect(
      promiseHistory({
        promises: [
          promise({ id: "new", promised_at: "2026-10-05" }),
          promise({ id: "old", status: "broken" }),
        ],
      }).map((line) => line.tone),
    ).toEqual(["info", "warning"]);
  });
});

describe("promiseLine: la promesa en la fila de la Cartera", () => {
  it("viva → fecha y avisos en pausa; rota sin otra viva → no cumplió; cumplida o nada → null", () => {
    expect(
      promiseLine({
        active_promise_at: "2026-09-22",
        last_promise: { promised_at: "2026-09-22", status: "pending" },
      }),
    ).toEqual({
      tone: "info",
      text: "prometió el 22 de sept de 2026 · avisos en pausa",
    });
    expect(
      promiseLine({
        active_promise_at: null,
        last_promise: { promised_at: "2026-09-22", status: "broken" },
      }),
    ).toEqual({
      tone: "warning",
      text: "no cumplió la promesa del 22 de sept de 2026",
    });
    expect(
      promiseLine({
        active_promise_at: null,
        last_promise: { promised_at: "2026-09-22", status: "kept" },
      }),
    ).toBeNull();
    expect(
      promiseLine({ active_promise_at: null, last_promise: null }),
    ).toBeNull();
  });
});

describe("canPromise / canReschedule", () => {
  it("solo un plan activo sin promesa viva admite otra; solo un plan activo con saldo se reprograma", () => {
    expect(canPromise({ status: "active", active_promise_at: null })).toBe(
      true,
    );
    expect(
      canPromise({ status: "active", active_promise_at: "2026-09-22" }),
    ).toBe(false);
    expect(canPromise({ status: "on_hold", active_promise_at: null })).toBe(
      false,
    );
    expect(canReschedule({ status: "active", balance_cents: 1 })).toBe(true);
    expect(canReschedule({ status: "active", balance_cents: 0 })).toBe(false);
    expect(canReschedule({ status: "settled", balance_cents: 1 })).toBe(false);
  });
});

describe("dateChips: fechas que se entienden, con su día real", () => {
  it("mañana, en 3 días, el lunes si cae después, y otra fecha", () => {
    // Martes 15 de septiembre de 2026 → lunes 21 (6 días): sale
    const chips = dateChips(new Date(2026, 8, 15, 10));
    expect(chips.map((chip) => chip.key)).toEqual([
      "tomorrow",
      "in3",
      "monday",
      "other",
    ]);
    expect(chips[0]).toMatchObject({ label: "Mañana", date: "2026-09-16" });
    expect(chips[1]).toMatchObject({ label: "En 3 días", date: "2026-09-18" });
    expect(chips[2]).toMatchObject({ label: "El lunes", date: "2026-09-21" });
    expect(chips[3].date).toBeNull();
    // Viernes 18: el lunes 21 está a 3 días → ya lo cubre «en 3 días», no se repite
    expect(
      dateChips(new Date(2026, 8, 18, 10)).map((chip) => chip.key),
    ).toEqual(["tomorrow", "in3", "other"]);
    // El día local, no el UTC
    expect(isoDay(new Date(2026, 8, 15, 23, 30))).toBe("2026-09-15");
  });
});

describe("suggestedPromiseCents y el calendario pendiente", () => {
  it("propone lo que falta de la cuota vencida; sin mora, la siguiente; sin cuotas, el saldo", () => {
    const plan = {
      balance_cents: 812_000_000,
      installments: [
        installment({ id: "a", status: "paid", paid_cents: 348_000_000 }),
        installment({
          id: "b",
          seq: 2,
          status: "overdue",
          paid_cents: 68_552_200,
        }),
        installment({
          id: "c",
          seq: 3,
          due_at: "2027-01-13",
          status: "pending",
        }),
      ],
    };
    expect(suggestedPromiseCents(plan, new Date(2026, 8, 16))).toBe(
      348_000_000 - 68_552_200,
    );
    expect(
      suggestedPromiseCents(
        {
          balance_cents: 1,
          installments: [
            installment({ due_at: "2027-01-13", status: "pending" }),
          ],
        },
        new Date(2026, 8, 16),
      ),
    ).toBe(348_000_000);
    expect(
      suggestedPromiseCents({ balance_cents: 500, installments: [] }),
    ).toBe(500);
  });

  it("pendingSchedule deja fuera lo pagado y resta lo abonado; scheduleCheck exige que sumen el saldo", () => {
    const lines = pendingSchedule({
      installments: [
        installment({ id: "a", status: "paid", paid_cents: 348_000_000 }),
        installment({
          id: "b",
          seq: 2,
          status: "partially_paid",
          paid_cents: 48_000_000,
        }),
        installment({
          id: "c",
          seq: 3,
          due_at: "2027-01-13",
          status: "pending",
        }),
      ],
    });
    expect(lines).toEqual([
      { due_at: "2026-09-10", amount_cents: 300_000_000 },
      { due_at: "2027-01-13", amount_cents: 348_000_000 },
    ]);
    expect(scheduleCheck(lines, 648_000_000)).toEqual({
      sum: 648_000_000,
      diff: 0,
      valid: true,
    });
    expect(scheduleCheck(lines, 700_000_000)).toMatchObject({
      diff: 52_000_000,
      valid: false,
    });
    expect(scheduleCheck(lines, 600_000_000)).toMatchObject({
      diff: -48_000_000,
      valid: false,
    });
    // Una línea sin fecha o sin monto no cuadra aunque la suma dé
    expect(
      scheduleCheck([{ due_at: "", amount_cents: 648_000_000 }], 648_000_000)
        .valid,
    ).toBe(false);
    expect(scheduleCheck([], 0).valid).toBe(false);
  });
});

describe("splitSchedule (premium P4: «En cuántas cuotas»)", () => {
  const current = [
    { due_at: "2026-10-01", amount_cents: 463_466_300 },
    { due_at: "2026-10-14", amount_cents: 463_466_300 },
  ];

  it("en pesos enteros, la última se lleva el resto y la suma cuadra con el saldo", () => {
    const three = splitSchedule(current, 926_932_600, 3, "2026-09-26");
    expect(three.map((line) => line.amount_cents)).toEqual([
      308_977_500, 308_977_500, 308_977_600,
    ]);
    expect(scheduleCheck(three, 926_932_600).valid).toBe(true);
  });

  it("B10: con menos cuotas originales que las pedidas, las fechas se reparten y ninguna se repite", () => {
    const three = splitSchedule(current, 926_932_600, 3, "2026-09-26");
    expect(three.map((line) => line.due_at)).toEqual([
      "2026-10-01",
      "2026-10-07",
      "2026-10-14",
    ]);
    const onlyBalance = splitSchedule(
      [current[1]!],
      926_932_600,
      3,
      "2026-09-26",
    );
    expect(onlyBalance.map((line) => line.due_at)).toEqual([
      "2026-10-02",
      "2026-10-08",
      "2026-10-14",
    ]);
    expect(new Set(onlyBalance.map((line) => line.due_at)).size).toBe(3);
  });

  it("con cuotas de sobra reutiliza sus fechas; todo junto va en la fecha del saldo", () => {
    expect(
      splitSchedule(current, 926_932_600, 2).map((line) => line.due_at),
    ).toEqual(["2026-10-01", "2026-10-14"]);
    expect(splitSchedule(current, 926_932_600, 1)).toEqual([
      { due_at: "2026-10-14", amount_cents: 926_932_600 },
    ]);
  });
});
