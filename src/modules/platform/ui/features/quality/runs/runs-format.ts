/**
 * Formato de las celdas de la lista de ejecuciones — helpers PUROS
 * (testeables sin React). `runScopeLabel` resume el alcance: suite ×N,
 * N escenarios sueltos, o `conv × turnos` en estrés (leído del `params`
 * opaco con el parser defensivo del dominio).
 */
import { parseRunParams, type RunListItem } from "../../../../domain/quality-runs";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function runScopeLabel(run: Pick<RunListItem, "kind" | "suite" | "params" | "cases_total">): string {
  if (run.kind === "stress") {
    const params = parseRunParams(run.params);
    if (params.conversations !== null && params.turns_per_conversation !== null) {
      return `${params.conversations} conv × ${params.turns_per_conversation}`;
    }
    return `${run.cases_total} conversaciones`;
  }
  if (run.suite) return `${run.suite.code} ×${run.cases_total}`;
  return run.cases_total === 1 ? "1 escenario" : `${run.cases_total} escenarios`;
}

/** Gasto de PLATAFORMA de la ejecución (null → "—"). */
export function formatSpendUsd(spend: number | null): string {
  if (spend === null || !Number.isFinite(spend)) return "—";
  return USD.format(spend);
}

export function runKindLabel(kind: RunListItem["kind"]): string {
  return kind === "stress" ? "Estrés" : "QA";
}

export function aiModeLabel(aiMode: RunListItem["ai_mode"]): string | null {
  if (aiMode === "mock") return "Mock";
  if (aiMode === "real") return "Real";
  return null;
}
