import {
  checksByAxis,
  hasQualitySignals,
  readAxisEvaluable,
  readQualityAxes,
  readQualityChecks,
} from "../lead";

const SIGNALS = {
  axes: { contactability: 18, identity: 20, fit: 30, provenance: 14 },
  evaluable: { contactability: 22, identity: 20, fit: 35, provenance: 20 },
  checks: [
    {
      key: "email_mx",
      axis: "contactability",
      outcome: "pass",
      evidence: "El dominio recibe",
    },
    {
      key: "email_deliverable",
      axis: "contactability",
      outcome: "unknown",
      evidence: "Sin verificar",
    },
    {
      key: "own_domain",
      axis: "identity",
      outcome: "pass",
      evidence: "Dominio propio",
    },
    {
      key: "category_match",
      axis: "fit",
      outcome: "pass",
      evidence: "Sector que buscas",
    },
  ],
};

describe("readQualityChecks", () => {
  it("lee las señales con su evidencia", () => {
    const checks = readQualityChecks(SIGNALS);
    expect(checks).toHaveLength(4);
    expect(checks[0]).toMatchObject({ key: "email_mx", outcome: "pass" });
  });

  it("CONSERVA las señales sin medir: son parte de la explicación", () => {
    const checks = readQualityChecks(SIGNALS);
    // Son la respuesta a «¿por qué 74 y no 90?» cuando el motivo no es que algo
    // falle sino que nadie lo ha mirado. Ocultarlas haría el número arbitrario.
    expect(checks.some((check) => check.outcome === "unknown")).toBe(true);
  });

  it("descarta lo que no tiene forma de señal en vez de romper la pantalla", () => {
    const checks = readQualityChecks({
      checks: [
        { key: "ok", axis: "identity", outcome: "pass", evidence: "bien" },
        { key: "sin_eje", axis: "inventado", outcome: "pass", evidence: "x" },
        { key: "sin_evidencia", axis: "identity", outcome: "pass" },
        "no soy un objeto",
        null,
      ],
    });
    expect(checks).toHaveLength(1);
  });

  it("un lead sin puntuar no tiene señales, y eso no es un error", () => {
    expect(readQualityChecks(null)).toEqual([]);
    expect(readQualityChecks({})).toEqual([]);
    expect(readQualityChecks({ checks: "no es una lista" })).toEqual([]);
  });
});

describe("checksByAxis", () => {
  it("agrupa por eje para pintarlas bajo su barra", () => {
    const checks = readQualityChecks(SIGNALS);
    expect(checksByAxis(checks, "contactability")).toHaveLength(2);
    expect(checksByAxis(checks, "provenance")).toEqual([]);
  });
});

describe("readAxisEvaluable", () => {
  it("devuelve cuántos puntos se pudieron medir, no el peso del eje", () => {
    // Decir «18 de 25» cuando solo se midieron 22 sería mentir sobre lo que se
    // sabe: el denominador es lo evaluable.
    expect(readAxisEvaluable(SIGNALS, "contactability")).toBe(22);
  });

  it("sin el dato devuelve 0 y la UI cae al peso del eje", () => {
    expect(readAxisEvaluable(null, "fit")).toBe(0);
    expect(readAxisEvaluable({ evaluable: { fit: "mucho" } }, "fit")).toBe(0);
  });
});

describe("readQualityAxes + hasQualitySignals", () => {
  it("un lead puntuado se distingue de uno que nadie miró", () => {
    expect(hasQualitySignals(SIGNALS)).toBe(true);
    expect(hasQualitySignals(null)).toBe(false);
    expect(
      hasQualitySignals({
        axes: { contactability: 0, identity: 0, fit: 0, provenance: 0 },
      }),
    ).toBe(false);
  });

  it("los cuatro ejes siempre están, aunque el lead no tenga ninguno", () => {
    expect(readQualityAxes(null)).toHaveLength(4);
  });
});
