/**
 * Veredicto del juez LLM: score global + sub-scores con semáforo, severidad
 * de alucinación, resumen e issues por severidad. `evaluation` es null hasta
 * que el juez corre (o para siempre si el case se purgó/bloqueó).
 */
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import type { CaseDetail } from "../../../../../../domain/quality-runs";
import { scoreTone } from "../../../../../../domain/thresholds";
import { formatScore } from "../../../../analytics/analytics-format";
import { MetricCell } from "../../../../analytics/MetricCell";

const SUB_SCORES: { key: keyof NonNullable<CaseDetail["evaluation"]>; label: string }[] = [
  { key: "score_accuracy", label: "Precisión" },
  { key: "score_tool_usage", label: "Uso de tools" },
  { key: "score_closing", label: "Cierre" },
  { key: "score_tone", label: "Tono" },
];

const SEVERITY_CLASSES: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  major: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warning/40 bg-warning/10 text-warning",
  minor: "border-warning/40 bg-warning/10 text-warning",
  low: "border-border bg-muted text-muted-foreground",
};

export function EvaluationPanel({ evaluation }: { evaluation: CaseDetail["evaluation"] }) {
  if (!evaluation) {
    return <p className="text-sm text-muted-foreground">Sin evaluación del juez.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MetricCell tone={scoreTone(evaluation.overall_score)} className="text-lg font-semibold">
          {formatScore(evaluation.overall_score)}
          <span className="text-xs font-normal text-muted-foreground">/100</span>
        </MetricCell>
        {evaluation.outcome && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            {evaluation.outcome}
          </Badge>
        )}
        {evaluation.hallucination_severity && evaluation.hallucination_severity !== "none" && (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            Alucinación: {evaluation.hallucination_severity}
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {SUB_SCORES.map(({ key, label }) => {
          const value = evaluation[key] as number | null;
          return (
            <div key={key} className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd>
                <MetricCell tone={scoreTone(value)}>{formatScore(value)}</MetricCell>
              </dd>
            </div>
          );
        })}
      </dl>

      {evaluation.summary && <p className="text-sm text-muted-foreground">{evaluation.summary}</p>}

      {evaluation.issues.length > 0 && (
        <ul className="space-y-1.5">
          {evaluation.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className="flex items-start gap-2 text-sm">
              <Badge
                variant="outline"
                className={cn("shrink-0", SEVERITY_CLASSES[issue.severity] ?? SEVERITY_CLASSES.low)}
              >
                {issue.severity}
              </Badge>
              <span className="min-w-0">
                <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
                <span className="block text-sm">{issue.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
