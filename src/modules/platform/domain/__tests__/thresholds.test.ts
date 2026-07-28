import {
  alertProgressPct,
  failureRateTone,
  hallucinationsTone,
  latencyTone,
  scoreTone,
} from "../thresholds";

describe("umbrales de analytics (spec §4, fronteras exactas)", () => {
  it("failure_rate_pct: >10 rojo, >5 ámbar, resto verde", () => {
    expect(failureRateTone(10.1)).toBe("destructive");
    expect(failureRateTone(10)).toBe("warning");
    expect(failureRateTone(5.1)).toBe("warning");
    expect(failureRateTone(5)).toBe("success");
    expect(failureRateTone(0)).toBe("success");
  });

  it("avg_overall_score: <60 rojo, <80 ámbar, null neutro", () => {
    expect(scoreTone(59.9)).toBe("destructive");
    expect(scoreTone(60)).toBe("warning");
    expect(scoreTone(79.9)).toBe("warning");
    expect(scoreTone(80)).toBe("success");
    expect(scoreTone(null)).toBe("neutral");
  });

  it("major_hallucinations: >0 rojo", () => {
    expect(hallucinationsTone(1)).toBe("destructive");
    expect(hallucinationsTone(0)).toBe("success");
  });

  it("latency_p95_ms: >5000 rojo, >2500 ámbar, null neutro", () => {
    expect(latencyTone(5001)).toBe("destructive");
    expect(latencyTone(5000)).toBe("warning");
    expect(latencyTone(2501)).toBe("warning");
    expect(latencyTone(2500)).toBe("success");
    expect(latencyTone(null)).toBe("neutral");
  });
});

describe("alertProgressPct", () => {
  it("proporción value/threshold con clamp a 100", () => {
    expect(alertProgressPct(5, 10)).toBe(50);
    expect(alertProgressPct(12, 10)).toBe(100);
    expect(alertProgressPct(10, 10)).toBe(100);
  });

  it("umbral 0 (regla 'mayor que 0') → 100 si hay valor; valor 0 → 0", () => {
    expect(alertProgressPct(3, 0)).toBe(100);
    expect(alertProgressPct(0, 0)).toBe(0);
    expect(alertProgressPct(0, 10)).toBe(0);
  });
});
