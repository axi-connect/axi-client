import {
  capabilityMetricText,
  capabilitySampleText,
  countByStatus,
  droppedCriterionText,
  sortCapabilities,
} from "../quality-capabilities";

describe("tablero de capacidades (F5)", () => {
  it("cuenta por estado y ordena primero lo que falla", () => {
    const rows = [
      { status: "pass" as const, label: "B" },
      { status: "fail" as const, label: "Z" },
      { status: "untested" as const, label: "A" },
      { status: "warn" as const, label: "C" },
      { status: "pass" as const, label: "A" },
    ];
    expect(countByStatus(rows)).toEqual({ pass: 2, warn: 1, fail: 1, untested: 1 });
    expect(sortCapabilities(rows).map((row) => `${row.status}:${row.label}`)).toEqual([
      "fail:Z",
      "warn:C",
      "untested:A",
      "pass:A",
      "pass:B",
    ]);
  });

  it("métrica: ratio del probe con coma, porcentaje de checks, «—» sin muestra", () => {
    expect(capabilityMetricText({ metric_label: "Recall@k (probe)", metric_value: 0.912, source: "probe" })).toBe("0,91 · Recall@k (probe)");
    expect(capabilityMetricText({ metric_label: "Checks aprobados", metric_value: 0.956, source: "checks" })).toBe("96 % · Checks aprobados");
    expect(capabilityMetricText({ metric_label: null, metric_value: null, source: null })).toBe("—");
    expect(capabilitySampleText({ sample_size: 40, source: "probe" })).toBe("40 ítems");
    expect(capabilitySampleText({ sample_size: 12, source: "cases" })).toBe("12 casos");
    expect(capabilitySampleText({ sample_size: 0, source: null })).toBe("—");
  });

  it("criterio descartado del borrador: JSON corto + motivo", () => {
    expect(droppedCriterionText({ criterion: { kind: "delivery_set", method: "express" }, reason: "método no existe" })).toBe(
      '{"kind":"delivery_set","method":"express"} — método no existe',
    );
  });
});
