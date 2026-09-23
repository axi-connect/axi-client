import {
  dailyRateActual,
  dailyRateNeeded,
  expectedPct,
  gap,
  paceStatus,
  progressPct,
  projectedPct,
} from "../pace";

describe("progressPct", () => {
  it("acota a 0–100 y sin meta no hay camino", () => {
    expect(progressPct(1_894, 3_000)).toBeCloseTo(63.13, 1);
    expect(progressPct(4_000, 3_000)).toBe(100);
    expect(progressPct(-5, 3_000)).toBe(0);
    expect(progressPct(10, 0)).toBe(0);
    expect(progressPct(10, -3)).toBe(0);
  });
});

describe("expectedPct", () => {
  it("reparte el mes por igual entre sus días hábiles", () => {
    expect(expectedPct(20, 26)).toBeCloseTo(76.92, 1);
    expect(expectedPct(0, 26)).toBe(0);
    expect(expectedPct(30, 26)).toBe(100);
    expect(expectedPct(3, 0)).toBe(0);
  });
});

describe("gap", () => {
  it("nunca devuelve un negativo: falta o sobra", () => {
    expect(gap(27, 43)).toEqual({ missing: 16, surplus: 0 });
    expect(gap(45, 43)).toEqual({ missing: 0, surplus: 2 });
    expect(gap(43, 43)).toEqual({ missing: 0, surplus: 0 });
  });
});

describe("dailyRateNeeded", () => {
  it("con días es la división; sin días todo es de hoy; sin falta es cero", () => {
    expect(dailyRateNeeded(16, 6)).toBeCloseTo(2.667, 2);
    expect(dailyRateNeeded(16, 0)).toBe(16);
    expect(dailyRateNeeded(0, 6)).toBe(0);
  });
});

describe("dailyRateActual", () => {
  it("sin días transcurridos no hay ritmo", () => {
    expect(dailyRateActual(27, 20)).toBe(1.35);
    expect(dailyRateActual(27, 0)).toBe(0);
  });
});

describe("paceStatus", () => {
  const th = { ahead_pct: 110, on_track_pct: 90, at_risk_pct: 80 };

  it("umbrales 110/90/80 sobre la razón real/esperado", () => {
    expect(paceStatus(115, 100, th, 10)).toBe("ahead");
    expect(paceStatus(110, 100, th, 10)).toBe("on_track");
    expect(paceStatus(90, 100, th, 10)).toBe("on_track");
    expect(paceStatus(85, 100, th, 10)).toBe("at_risk");
    expect(paceStatus(79, 100, th, 10)).toBe("behind");
  });

  it("con menos de 3 días hábiles no afirma nada", () => {
    expect(paceStatus(0, 100, th, 2)).toBe("insufficient_data");
    expect(paceStatus(300, 100, th, 0)).toBe("insufficient_data");
    expect(paceStatus(100, 0, th, 10)).toBe("insufficient_data");
  });

  it("la meta alcanzada gana sobre el ritmo", () => {
    expect(paceStatus(43, 32, th, 20, 43)).toBe("achieved");
    expect(paceStatus(43, 32, th, 1, 43)).toBe("achieved");
  });
});

describe("projectedPct", () => {
  it("proyecta el ritmo actual al mes entero", () => {
    expect(projectedPct(20, 20, 26, 30)).toBeCloseTo(86.67, 1);
    expect(projectedPct(0, 0, 26, 30)).toBeNull();
    expect(projectedPct(10, 5, 26, 0)).toBeNull();
  });
});
