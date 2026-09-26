import type { DealDTO } from "../deal";
import {
  closeRate,
  coolingDeals,
  daysLabel,
  describeDealEvent,
  formatCloseDate,
  stageRoute,
  stallInfo,
  weightedCents,
} from "../pipeline-summary";

const now = new Date("2026-09-25T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function deal(id: string, over: Partial<DealDTO> = {}): DealDTO {
  return {
    id,
    contact_id: "c",
    pipeline_id: "p",
    stage_id: "s-prop",
    title: id,
    value_cents: 100_000_00,
    currency: "COP",
    status: "open",
    won_at: null,
    lost_at: null,
    lost_reason: null,
    owner_user_id: null,
    conversation_id: null,
    order_id: null,
    expected_close_date: null,
    stage_entered_at: daysAgo(1),
    notes: null,
    source: "manual",
    created_by_type: "user",
    ai_moves_paused: false,
    contact: { id: "c", full_name: "Luis Pardo", phone: null, avatar_url: null },
    stage: { id: "s-prop", name: "Propuesta", color: null, probability_pct: 60 },
    created_at: daysAgo(20),
    updated_at: daysAgo(1),
    ...over,
  };
}

const stages = [
  { id: "s-cal", name: "Calificado", rotting_days: 7, position: 2 },
  { id: "s-prop", name: "Propuesta", rotting_days: 10, position: 3 },
  { id: "s-new", name: "Nuevo", rotting_days: null, position: 1 },
];

describe("weightedCents", () => {
  it("pondera el valor por la probabilidad de la etapa", () => {
    expect(weightedCents(8_900_000_00, 60)).toBe(5_340_000_00);
  });
  it("sin valor no aporta, y la probabilidad se acota a 0–100", () => {
    expect(weightedCents(null, 60)).toBe(0);
    expect(weightedCents(1000, 150)).toBe(1000);
    expect(weightedCents(1000, -20)).toBe(0);
  });
});

describe("stallInfo", () => {
  it("se enfría justo al llegar al límite de la etapa", () => {
    expect(stallInfo(deal("a", { stage_entered_at: daysAgo(10) }), 10, now)).toEqual({ days: 10, limit: 10 });
  });
  it("un día antes del límite sigue en movimiento", () => {
    expect(stallInfo(deal("a", { stage_entered_at: daysAgo(9) }), 10, now)).toBeNull();
  });
  it("una etapa que no expira o una cerrada nunca se enfrían", () => {
    expect(stallInfo(deal("a", { stage_entered_at: daysAgo(90) }), null, now)).toBeNull();
    expect(stallInfo(deal("a", { stage_entered_at: daysAgo(90), status: "won" }), 5, now)).toBeNull();
  });
});

describe("coolingDeals", () => {
  it("ordena por lo que se pasó de su etapa y luego por valor", () => {
    const list = coolingDeals(
      [
        deal("quieta-poco", { stage_id: "s-prop", stage_entered_at: daysAgo(11) }),
        deal("quieta-mucho", { stage_id: "s-cal", stage_entered_at: daysAgo(12) }),
        deal("igual-mas-valor", { stage_id: "s-prop", stage_entered_at: daysAgo(11), value_cents: 999_000_000_00 }),
        deal("en-movimiento", { stage_id: "s-prop", stage_entered_at: daysAgo(2) }),
        deal("sin-limite", { stage_id: "s-new", stage_entered_at: daysAgo(40) }),
      ],
      stages,
      now,
    );
    expect(list.map((c) => c.deal.id)).toEqual(["quieta-mucho", "igual-mas-valor", "quieta-poco"]);
    expect(list[0]).toMatchObject({ days: 12, limit: 7, stageName: "Calificado" });
  });
  it("sin ninguna quieta devuelve una lista vacía", () => {
    expect(coolingDeals([deal("a")], stages, now)).toEqual([]);
  });
});

describe("closeRate", () => {
  it("usa el porcentaje del servidor y cuenta ganadas de cerradas", () => {
    expect(closeRate({ won_count: 7, lost_count: 10, win_rate_pct: 41 })).toEqual({ pct: 41, won: 7, closed: 17 });
  });
  it("lo calcula si el servidor no lo trae", () => {
    expect(closeRate({ won_count: 1, lost_count: 3, win_rate_pct: null })).toEqual({ pct: 25, won: 1, closed: 4 });
  });
  it("sin cierres no hay tasa", () => {
    expect(closeRate({ won_count: 0, lost_count: 0, win_rate_pct: null })).toBeNull();
  });
});

describe("daysLabel y stageRoute", () => {
  it("nombra los días en singular y plural", () => {
    expect(daysLabel(0)).toBe("hoy");
    expect(daysLabel(1)).toBe("1 día");
    expect(daysLabel(12)).toBe("12 días");
  });
  it("ubica la etapa por posición, no por orden del arreglo", () => {
    expect(stageRoute(stages, "s-prop")).toEqual({ index: 3, total: 3 });
    expect(stageRoute(stages, "s-new")).toEqual({ index: 1, total: 3 });
    expect(stageRoute(stages, "otra")).toBeNull();
  });
});

describe("formatCloseDate", () => {
  it("pinta el día del calendario aunque llegue a medianoche UTC", () => {
    expect(formatCloseDate("2026-09-30T00:00:00.000Z")).toMatch(/^30 sept?$/);
    expect(formatCloseDate("2026-10-01T00:00:00Z")).toMatch(/^1 oct$/);
  });
  it("con día de la semana y sin fecha válida", () => {
    expect(formatCloseDate("2026-09-30T00:00:00Z", true)).toMatch(/^mié 30 sept?$/);
    expect(formatCloseDate("basura")).toBe("");
  });
});

describe("describeDealEvent", () => {
  const names = new Map([
    ["s-cal", "Calificado"],
    ["s-prop", "Propuesta"],
  ]);

  it("nombra el cambio de etapa desde el payload", () => {
    expect(
      describeDealEvent({ type: "stage_changed", payload: { from_stage_id: "s-cal", to_stage_id: "s-prop" } }, names, "COP"),
    ).toBe("Pasó de Calificado a Propuesta");
  });
  it("una etapa que ya no existe cae a la etiqueta genérica", () => {
    expect(
      describeDealEvent({ type: "stage_changed", payload: { from_stage_id: "borrada", to_stage_id: "x" } }, names, "COP"),
    ).toBe("Cambio de etapa");
  });
  it("el cambio de valor muestra el antes y el después", () => {
    const text = describeDealEvent({ type: "value_changed", payload: { from: 750_000_000, to: 890_000_000 } }, names, "COP");
    expect(text).toMatch(/^Valor de \$\s?7\.500\.000 a \$\s?8\.900\.000$/);
  });
  it("un valor que antes no existía se dice fijado", () => {
    expect(describeDealEvent({ type: "value_changed", payload: { from: null, to: 100_00 } }, names, "COP")).toMatch(
      /^Valor fijado en/,
    );
  });
  it("el enfriamiento dice días y límite, y sin payload no inventa", () => {
    expect(describeDealEvent({ type: "stalled", payload: { stalled_days: 12, rotting_days: 10 } }, names, "COP")).toBe(
      "Se enfrió: 12 días en la etapa, aguanta 10",
    );
    expect(describeDealEvent({ type: "stalled", payload: null }, names, "COP")).toBe("Se enfrió");
  });
  it("el resto usa su etiqueta", () => {
    expect(describeDealEvent({ type: "won", payload: null }, names, "COP")).toBe("Ganada");
    expect(describeDealEvent({ type: "stage_reverted", payload: { to_stage_id: "s-cal" } }, names, "COP")).toBe(
      "Volvió a Calificado: se deshizo el cambio",
    );
  });
});
