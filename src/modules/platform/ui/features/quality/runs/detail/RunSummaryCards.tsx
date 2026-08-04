/**
 * KPIs de la ejecución (StatTile del dashboard): progreso de cases, score
 * del juez (null hasta finalizar) y gasto de PLATAFORMA. Números tabulares.
 */
import { StatTile } from "../../../dashboard/StatTile";
import type { RunDetail } from "../../../../../domain/quality-runs";
import { formatScore } from "../../../analytics/analytics-format";
import { formatSpendUsd } from "../runs-format";

export function RunSummaryCards({ run }: { run: RunDetail }) {
  const settled = run.cases_passed + run.cases_failed + run.cases_blocked;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Casos" value={`${settled}/${run.cases_total}`} />
      <StatTile label="Aprobados" value={run.cases_passed} />
      <StatTile
        label="Fallidos"
        value={run.cases_failed}
        tone={run.cases_failed > 0 ? "warning" : "default"}
      />
      <StatTile label="Score juez" value={formatScore(run.avg_judge_score)} />
      <StatTile label="Gasto plataforma" value={formatSpendUsd(run.spend_usd)} />
    </div>
  );
}
