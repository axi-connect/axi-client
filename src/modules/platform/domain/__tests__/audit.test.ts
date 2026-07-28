import { ACTION_GROUPS, AUDIT_LIMITS, diffChanges, RISK_ACTIONS } from "../audit";

describe("diffChanges (parseo defensivo)", () => {
  it("forma {campo: [antes, después]}", () => {
    expect(diffChanges({ name: ["Acme", "Acme Corp"], status: ["trial", "active"] })).toEqual([
      { field: "name", before: "Acme", after: "Acme Corp" },
      { field: "status", before: "trial", after: "active" },
    ]);
  });

  it("forma {campo: {from, to}} con valores no-string serializados", () => {
    expect(diffChanges({ margin_multiplier: { from: 1.25, to: 1.3 }, effective_to: { from: null, to: "2026-07-17" } })).toEqual([
      { field: "margin_multiplier", before: "1.25", after: "1.3" },
      { field: "effective_to", before: "null", after: "2026-07-17" },
    ]);
  });

  it("forma {before, after} alinea campos de ambos lados", () => {
    const rows = diffChanges({ before: { name: "Acme", city: "Cali" }, after: { name: "Acme Corp" } });
    expect(rows).toEqual([
      { field: "city", before: "Cali", after: "—" },
      { field: "name", before: "Acme", after: "Acme Corp" },
    ]);
  });

  it("formas desconocidas → null (la UI cae a JSON crudo)", () => {
    expect(diffChanges(null)).toBeNull();
    expect(diffChanges("texto")).toBeNull();
    expect(diffChanges([1, 2])).toBeNull();
    expect(diffChanges({ nota: "sin estructura de diff" })).toBeNull();
    expect(diffChanges({})).toBeNull();
  });
});

describe("catálogos de auditoría", () => {
  it("las acciones de riesgo pertenecen a los grupos conocidos", () => {
    const known = new Set(ACTION_GROUPS.flatMap((g) => g.actions));
    for (const action of RISK_ACTIONS) expect(known.has(action)).toBe(true);
  });

  it("los límites nunca superan 200 (contrato del backend)", () => {
    expect(Math.max(...AUDIT_LIMITS)).toBeLessThanOrEqual(200);
  });
});
