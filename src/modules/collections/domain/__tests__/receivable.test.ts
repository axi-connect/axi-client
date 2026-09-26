import {
  daysUntil,
  dueLabel,
  groupReceivables,
  sectionOf,
  type ReceivableDTO,
} from "@/modules/collections/domain/receivable";

/**
 * La agrupación de la cartera (F4 Cobros).
 *
 * Es la decisión de diseño que gobierna la pantalla: los dos ejes —qué pasó con
 * el servicio y cuánta prisa corre el dinero— los lleva la SECCIÓN, no la fila.
 * Y las secciones son EXCLUYENTES: ver la misma deuda dos veces sería contarla
 * dos veces.
 */
const row = (overrides: Partial<ReceivableDTO> = {}): ReceivableDTO =>
  ({
    plan_id: "p1",
    order_id: "o1",
    order_number: 42,
    contact_id: "c1",
    contact_name: "Laura Gómez",
    service_date: null,
    travelled: false,
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
    assigned_user_id: null,
    ...overrides,
  }) as ReceivableDTO;

describe("sectionOf (F4: la estructura lleva los dos ejes)", () => {
  it("quien ya viajó y debe encabeza, aunque además esté en mora", () => {
    // Es el caso que la decisión del dueño hizo posible, y el que más urge: el
    // servicio se prestó y no queda nada que retener.
    expect(sectionOf(row({ travelled: true, days_overdue: 47 }))).toBe(
      "travelled",
    );
  });

  it("las secciones son excluyentes: una deuda aparece UNA vez", () => {
    const rows = [
      row({ plan_id: "a", travelled: true, days_overdue: 47 }),
      row({ plan_id: "b", days_overdue: 6 }),
      row({ plan_id: "c", next_due_at: futureDay(3) }),
      row({ plan_id: "d", next_due_at: futureDay(90) }),
    ];
    const sections = groupReceivables(rows);

    expect(sections.map((section) => section.key)).toEqual([
      "travelled",
      "overdue",
      "soon",
      "current",
    ]);
    const ids = sections.flatMap((section) =>
      section.rows.map((one) => one.plan_id),
    );
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("una sección sin filas no se pinta", () => {
    expect(
      groupReceivables([row({ days_overdue: 3 })]).map((s) => s.key),
    ).toEqual(["overdue"]);
  });

  it("lo que vence dentro de la semana es «por vencer»; más allá, al día", () => {
    expect(sectionOf(row({ next_due_at: futureDay(7) }))).toBe("soon");
    expect(sectionOf(row({ next_due_at: futureDay(8) }))).toBe("current");
  });
});

describe("dueLabel", () => {
  const today = new Date("2026-09-17T15:00:00.000Z");

  it("la mora se cuenta en días, y un día es «ayer»", () => {
    expect(
      dueLabel(row({ next_due_at: "2026-09-16", days_overdue: 1 }), today),
    ).toBe("Venció ayer");
    expect(
      dueLabel(row({ next_due_at: "2026-08-01", days_overdue: 47 }), today),
    ).toBe("Venció hace 47 días");
  });

  it("lo próximo se dice en días y lo lejano se deja a la fecha", () => {
    expect(dueLabel(row({ next_due_at: "2026-09-17" }), today)).toBe(
      "Vence hoy",
    );
    expect(dueLabel(row({ next_due_at: "2026-09-20" }), today)).toBe(
      "Vence en 3 días",
    );
    expect(dueLabel(row({ next_due_at: "2027-01-13" }), today)).toBe("");
  });

  it("sin cuota pendiente no se inventa una fecha", () => {
    expect(dueLabel(row(), today)).toBe("Sin cuota pendiente");
  });
});

describe("daysUntil", () => {
  it("cuenta en el día LOCAL: a las 20:30 de Bogotá todavía es hoy", () => {
    // Midiendo en UTC, la cuenta salía un día corta las últimas cinco horas de
    // cada jornada — el mismo fallo que costó una ronda en el cliente de F3.
    const nocheDeBogota = new Date("2026-09-18T01:30:00.000Z");
    expect(daysUntil("2026-09-20", nocheDeBogota)).toBe(3);
    expect(daysUntil("2026-09-17", nocheDeBogota)).toBe(0);
  });

  it("sin fecha no hay cuenta", () => {
    expect(daysUntil(null)).toBeNull();
  });
});

/** Un día futuro a N días de hoy, en el calendario local. */
function futureDay(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
