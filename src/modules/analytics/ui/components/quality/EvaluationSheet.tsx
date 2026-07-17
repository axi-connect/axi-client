"use client";

import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { relativeTime } from "@/core/lib/relative-time";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  HALLUCINATION_LABELS,
  SEVERITY_LABELS,
  funnelStageLabel,
  issueLabel,
  outcomeLabel,
} from "@/modules/analytics/domain/labels";
import type { EvaluationDTO } from "@/modules/analytics/domain/analytics";
import { SubScoreBars } from "@/modules/analytics/ui/components/charts/SubScoreBars";
import { ScoreBadge } from "./score-badge";

/**
 * Sheet de detalle de una evaluación (drawer derecho, `spring.soft` vía
 * DetailSheet). AV2: lectura. La calibración y el re-evaluar (manage) se
 * añaden en AV3 vía `footer`.
 */
export function EvaluationSheet({
  evaluation,
  notEvaluated = false,
  agentName,
  open,
  onOpenChange,
  footer,
}: {
  evaluation: EvaluationDTO | null;
  /** Deep-link a una conversación sin evaluación (404 = estado, no error). */
  notEvaluated?: boolean;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Slot AV3: calibración + re-evaluar (solo `analytics:manage`). */
  footer?: React.ReactNode;
}) {
  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="lg"
      title="Detalle de evaluación"
    >
      {notEvaluated && !evaluation && (
        <p className="px-1 py-8 text-center text-sm text-muted-foreground">
          Esta conversación aún no tiene evaluación.
        </p>
      )}
      {evaluation && (
        <div className="space-y-5 px-1 pb-4">
          <header className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {evaluation.overall_score !== null && (
                <ScoreBadge score={evaluation.overall_score} className="text-sm" />
              )}
              <span className="font-medium">{agentName}</span>
              <span className="text-muted-foreground">
                · {relativeTime(evaluation.created_at)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{outcomeLabel(evaluation.outcome)}</span>
              {evaluation.hallucination_severity &&
                evaluation.hallucination_severity !== "none" && (
                  <span
                    className={
                      evaluation.hallucination_severity === "major"
                        ? "inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"
                        : "inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning"
                    }
                  >
                    <TriangleAlert aria-hidden className="size-3" />
                    {HALLUCINATION_LABELS[evaluation.hallucination_severity] ??
                      evaluation.hallucination_severity}
                  </span>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
              Etapa alcanzada: {funnelStageLabel(evaluation.funnel_stage)}
            </p>
          </header>

          {evaluation.summary && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Resumen del evaluador</h3>
              <p className="text-sm text-muted-foreground">“{evaluation.summary}”</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Sub-puntajes</h3>
            <SubScoreBars scores={evaluation.scores} />
          </section>

          {evaluation.missed_opportunity && (
            <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              Oportunidad perdida: el cliente mostró intención de compra y se dejó ir.
            </p>
          )}

          {evaluation.issues.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Problemas detectados</h3>
              <ul className="space-y-3">
                {evaluation.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className="space-y-1">
                    <p
                      className={
                        issue.severity === "high"
                          ? "flex items-center gap-1.5 text-sm font-medium text-destructive"
                          : "flex items-center gap-1.5 text-sm font-medium"
                      }
                    >
                      {issue.severity === "high" && (
                        <TriangleAlert aria-hidden className="size-3.5" />
                      )}
                      {issueLabel(issue.code)}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({(SEVERITY_LABELS[issue.severity] ?? issue.severity).toLowerCase()})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{issue.detail}</p>
                    {issue.evidence_quote && (
                      <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                        “{issue.evidence_quote}”
                      </blockquote>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button asChild variant="outline" size="sm">
            <Link href={`/workspace/inbox/${evaluation.conversation_id}`}>
              Ver conversación
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>

          {footer && (
            <>
              <Separator />
              {footer}
            </>
          )}
        </div>
      )}
    </DetailSheet>
  );
}
