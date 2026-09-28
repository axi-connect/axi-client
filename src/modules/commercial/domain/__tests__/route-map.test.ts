import { learningPace, pace, plan, proposal } from "../../ui/__tests__/fixtures";
import { NARROW_ROAD, pointAt, roadPath, roadSlice, routeOptions, sampleRoad, stopFractions, todaySteps, WIDE_ROAD } from "../route-map";

describe("la carretera", () => {
  const road = sampleRoad(WIDE_ROAD);

  it("0 es la salida, 1 es la meta, y la fracción se acota", () => {
    const [start] = WIDE_ROAD.segments[0];
    const end = WIDE_ROAD.segments[WIDE_ROAD.segments.length - 1][3];
    expect(pointAt(road, 0)).toEqual({ x: start[0], y: start[1] });
    expect(pointAt(road, 1)).toEqual({ x: end[0], y: end[1] });
    expect(pointAt(road, -2)).toEqual(pointAt(road, 0));
    expect(pointAt(road, 7)).toEqual(pointAt(road, 1));
    expect(pointAt(road, Number.NaN)).toEqual(pointAt(road, 0));
  });

  it("las distancias crecen y todo cae dentro de su caja", () => {
    for (let i = 1; i < road.lengths.length; i += 1) expect(road.lengths[i]).toBeGreaterThanOrEqual(road.lengths[i - 1]);
    for (const layout of [WIDE_ROAD, NARROW_ROAD]) {
      for (const p of sampleRoad(layout).points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(layout.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("un tramo empieza y acaba en sus fracciones; sin tramo, nada", () => {
    const slice = roadSlice(road, 0.2, 0.5).split(" ");
    const first = pointAt(road, 0.2);
    const last = pointAt(road, 0.5);
    expect(slice[0]).toBe(`${first.x.toFixed(1)},${first.y.toFixed(1)}`);
    expect(slice[slice.length - 1]).toBe(`${last.x.toFixed(1)},${last.y.toFixed(1)}`);
    expect(roadSlice(road, 0.5, 0.5)).toBe("");
    expect(roadSlice(road, 0.6, 0.4)).toBe("");
    expect(roadPath(NARROW_ROAD)).toMatch(/^M 50 340 C /);
  });
});

describe("todaySteps", () => {
  it("lo que falta ÷ los días que quedan, hacia arriba; las de ritmo bajo primero, en el orden del plan", () => {
    expect(todaySteps(pace).map((step) => [step.title, step.detail])).toEqual([
      ["Cierra 3 ventas hoy", "vas a 1,35 al día · faltan 16"],
      ["Envía 7 cotizaciones", "vas a 3,6 al día · faltan 39"],
      ["Haz 11 llamadas", "vas a 6,4 al día · faltan 62"],
      ["Contacta a 10 personas", "vas a 7,6 al día · faltan 58"],
    ]);
  });

  it("en singular, sin lo ya cumplido y con el último día como uno", () => {
    const sales = { ...pace.key_results[0], actual: 42, target: 43 };
    const done = { ...pace.key_results[1], actual: 120, target: 110 };
    const steps = todaySteps({ ...pace, business_days_left: 0, key_results: [sales, done] });
    expect(steps.map((step) => [step.title, step.detail])).toEqual([["Cierra 1 venta hoy", "vas a 1,35 al día · falta 1"]]);
  });

  it("aprendiendo o con la meta cumplida no hay indicaciones", () => {
    expect(todaySteps(learningPace)).toEqual([]);
    expect(todaySteps({ ...pace, status: "achieved" })).toEqual([]);
  });
});

describe("routeOptions", () => {
  it("la ruta actual llega a la proyección; una acción suma sus ventas estimadas × el ticket del plan", () => {
    const [actual, faster] = routeOptions(pace, plan, [proposal]);
    expect(actual).toMatchObject({ id: null, pct: "82 %", money: "≈ $ 24,6 M" });
    // 24.620.000 + 2 × 700.000 = 26.020.000 → 87 % de 30.000.000.
    expect(faster).toMatchObject({ id: proposal.id, kicker: "+2 ventas", pct: "87 %", money: "≈ $ 26 M" });
  });

  it("solo las pendientes son rutas, la que más acerca primero", () => {
    const small = { ...proposal, id: "p2", estimated_sales: 1 };
    const decided = { ...proposal, id: "p3", status: "approved" as const };
    expect(routeOptions(pace, plan, [small, decided, proposal]).map((option) => option.id)).toEqual([null, proposal.id, "p2"]);
  });

  it("aprendiendo no promete llegada; sin ticket, la acción tampoco", () => {
    expect(routeOptions(learningPace, plan, [proposal]).map((option) => option.pct)).toEqual([null, null]);
    const noTicket = { ...plan, inputs: { ...plan.inputs, avg_ticket_cents: null } };
    const [, faster] = routeOptions({ ...pace, avg_ticket_actual_cents: null }, noTicket, [proposal]);
    expect(faster.pct).toBeNull();
  });
});

describe("stopFractions", () => {
  it("reparte las paradas sin tocar la salida ni la meta", () => {
    expect(stopFractions(0)).toEqual([]);
    const five = stopFractions(5);
    expect(five).toHaveLength(5);
    expect(five[0]).toBeGreaterThan(0.08);
    expect(five[4]).toBeLessThan(0.92);
    for (let i = 1; i < five.length; i += 1) expect(five[i]).toBeGreaterThan(five[i - 1]);
  });
});
