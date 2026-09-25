import { dailyRateNeeded, displayStatus, expectedPct, gap, isLearning, progressPct } from "../pace";

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

describe("displayStatus", () => {
  it("cumplida gana aunque falten datos; sin datos se aprende, diga lo que diga el ritmo", () => {
    expect(displayStatus({ status: "achieved", data_sufficiency: "insufficient" })).toBe("achieved");
    expect(displayStatus({ status: "ahead", data_sufficiency: "insufficient" })).toBe("insufficient_data");
    expect(displayStatus({ status: "behind", data_sufficiency: "ok" })).toBe("behind");
    expect(isLearning({ status: "behind", data_sufficiency: "insufficient" })).toBe(true);
    expect(isLearning({ status: "achieved", data_sufficiency: "insufficient" })).toBe(false);
  });
});
