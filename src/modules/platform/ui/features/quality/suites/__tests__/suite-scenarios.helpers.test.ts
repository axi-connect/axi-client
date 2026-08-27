import { MAX_SUITE_SCENARIOS } from "../../../../../domain/quality";
import {
  addSuiteScenario,
  removeSuiteScenario,
  reorderSuiteScenario,
  type SuiteScenarioItem,
} from "../suite-scenarios.helpers";

const item = (id: string): SuiteScenarioItem => ({ id, code: `c_${id}`, name: id, status: "active" });

describe("addSuiteScenario", () => {
  it("añade al final y rechaza duplicados (invariante del PUT)", () => {
    const list = [item("a")];
    expect(addSuiteScenario(list, item("b")).map((i) => i.id)).toEqual(["a", "b"]);
    expect(addSuiteScenario(list, item("a"))).toBe(list);
  });

  it("no supera el tope de 50", () => {
    const full = Array.from({ length: MAX_SUITE_SCENARIOS }, (_, i) => item(String(i)));
    expect(addSuiteScenario(full, item("extra"))).toBe(full);
  });
});

describe("reorderSuiteScenario", () => {
  const list = [item("a"), item("b"), item("c"), item("d")];

  it("corre los de en medio, no los intercambia (semántica arrayMove)", () => {
    // Arrastrar el primero al final NO puede dejar a "d" en la cabeza.
    expect(reorderSuiteScenario(list, 0, 3).map((i) => i.id)).toEqual(["b", "c", "d", "a"]);
    expect(reorderSuiteScenario(list, 3, 0).map((i) => i.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("un salto adyacente equivale a intercambiar (el caso de las flechas ↑↓)", () => {
    expect(reorderSuiteScenario(list, 1, 0).map((i) => i.id)).toEqual(["b", "a", "c", "d"]);
    expect(reorderSuiteScenario(list, 1, 2).map((i) => i.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("no muta el original", () => {
    reorderSuiteScenario(list, 0, 3);
    expect(list.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("no-op sin movimiento real o con índices fuera de rango", () => {
    expect(reorderSuiteScenario(list, 2, 2)).toBe(list);
    expect(reorderSuiteScenario(list, -1, 0)).toBe(list);
    expect(reorderSuiteScenario(list, 0, 4)).toBe(list);
    expect(reorderSuiteScenario(list, 9, 0)).toBe(list);
  });
});

describe("removeSuiteScenario", () => {
  it("quita por índice sin mutar el original", () => {
    const list = [item("a"), item("b")];
    expect(removeSuiteScenario(list, 0).map((i) => i.id)).toEqual(["b"]);
    expect(list).toHaveLength(2);
  });
});
