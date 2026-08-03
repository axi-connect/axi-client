/**
 * Helpers PUROS de la composición de una suite (testeables sin React).
 * Invariantes del PUT de reemplazo total: 1–50 escenarios, sin duplicados,
 * el orden del array define `position`.
 */
import { MAX_SUITE_SCENARIOS } from "../../../../domain/quality";

export type SuiteScenarioItem = {
  id: string;
  code: string;
  name: string;
  status: string;
};

/** No-op si ya está incluido o la suite llegó al tope de 50. */
export function addSuiteScenario(list: SuiteScenarioItem[], item: SuiteScenarioItem): SuiteScenarioItem[] {
  if (list.length >= MAX_SUITE_SCENARIOS) return list;
  if (list.some((existing) => existing.id === item.id)) return list;
  return [...list, item];
}

export function removeSuiteScenario(list: SuiteScenarioItem[], index: number): SuiteScenarioItem[] {
  return list.filter((_, i) => i !== index);
}

/** Mueve una posición arriba (-1) o abajo (+1); no-op en los bordes. */
export function moveSuiteScenario(
  list: SuiteScenarioItem[],
  index: number,
  dir: -1 | 1,
): SuiteScenarioItem[] {
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
