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

/**
 * Reubica un escenario de `from` a `to` (semántica `arrayMove`: los de en medio
 * se corren, no se intercambian). Es la ÚNICA implementación del invariante de
 * orden: la usan tanto el arrastre como las flechas, para que los dos controles
 * no puedan divergir. No-op si algún índice está fuera de rango o `from === to`.
 */
export function reorderSuiteScenario(
  list: SuiteScenarioItem[],
  from: number,
  to: number,
): SuiteScenarioItem[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
