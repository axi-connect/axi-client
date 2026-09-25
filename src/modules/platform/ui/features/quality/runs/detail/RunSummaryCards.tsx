/**
 * KPIs de una ejecución QA/estrés (diseño premium F4): la cifra de casos
 * asentados con su tramo por caso, aprobados, fallidos, score del juez (null
 * hasta finalizar) y gasto de PLATAFORMA. El tono va en el punto (AA).
 */
import type { RunDetail } from "../../../../../domain/quality-runs";
import { formatScore } from "../../../analytics/analytics-format";
import { BigFigure, Meter, QualityTile, ToneDot } from "../../shared/premium";
import { formatSpendUsd } from "../runs-format";

export function RunSummaryCards({ run }: { run: RunDetail }) {
  const settled = run.cases_passed + run.cases_failed + run.cases_blocked;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 min-[1400px]:grid-cols-5">
      <QualityTile label="Casos" as="article" className="col-span-2 lg:col-span-1">
        <BigFigure value={settled} unit={`de ${run.cases_total}`} />
        <Meter value={run.cases_total === 0 ? 0 : settled / run.cases_total} label="Casos asentados" className="mt-auto" />
      </QualityTile>
      <QualityTile label="Aprobados" as="article">
        <BigFigure value={run.cases_passed} />
        <p className="mt-auto text-xs text-muted-foreground tabular-nums">
          {settled === 0 ? "aún sin casos" : `${Math.round((run.cases_passed / settled) * 100)} % de los asentados`}
        </p>
      </QualityTile>
      <QualityTile label="Fallidos" as="article" aside={run.cases_failed > 0 ? <ToneDot tone="destructive" className="size-2" /> : undefined}>
        <BigFigure value={run.cases_failed} />
        <p className="mt-auto text-xs text-muted-foreground tabular-nums">
          {run.cases_blocked > 0 ? `${run.cases_blocked} bloqueados aparte` : "sin bloqueados"}
        </p>
      </QualityTile>
      <QualityTile label="Score del juez" as="article">
        <BigFigure value={formatScore(run.avg_judge_score)} unit={run.avg_judge_score === null ? undefined : "/100"} />
        <p className="mt-auto text-xs text-muted-foreground">{run.avg_judge_score === null ? "al finalizar" : "promedio de los casos"}</p>
      </QualityTile>
      <QualityTile label="Gasto de plataforma" as="article">
        <BigFigure value={formatSpendUsd(run.spend_usd)} />
        <p className="mt-auto text-xs text-muted-foreground">nunca al tenant</p>
      </QualityTile>
    </div>
  );
}
