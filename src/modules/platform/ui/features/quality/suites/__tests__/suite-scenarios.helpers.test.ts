import { MAX_SUITE_SCENARIOS } from "../../../../../domain/quality";
import {
  addSuiteScenario,
  moveSuiteScenario,
  removeSuiteScenario,
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

describe("moveSuiteScenario", () => {
  const list = [item("a"), item("b"), item("c")];

  it("intercambia posiciones (el índice define position)", () => {
    expect(moveSuiteScenario(list, 1, -1).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(moveSuiteScenario(list, 1, 1).map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("no-op en los bordes", () => {
    expect(moveSuiteScenario(list, 0, -1)).toBe(list);
    expect(moveSuiteScenario(list, 2, 1)).toBe(list);
  });
});

describe("removeSuiteScenario", () => {
  it("quita por índice sin mutar el original", () => {
    const list = [item("a"), item("b")];
    expect(removeSuiteScenario(list, 0).map((i) => i.id)).toEqual(["b"]);
    expect(list).toHaveLength(2);
  });
});
