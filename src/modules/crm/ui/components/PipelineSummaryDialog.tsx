"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Modal } from "@/shared/components/ui/modal";
import type { CopilotPipelineDTO } from "@/modules/crm/domain/copilot";
import { generatePipelineSummary } from "@/modules/crm/infrastructure/services/copilot-service.adapter";

/**
 * Resumen IA del pipeline (F7, gate crm:copilot): modal con summary, riesgos
 * y oportunidades. Genera al abrir; 429/límite → toast y cierre.
 */
export function PipelineSummaryDialog({
  pipelineId,
  onOpenChange,
}: {
  pipelineId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const [result, setResult] = useState<CopilotPipelineDTO | null>(null);

  useEffect(() => {
    generatePipelineSummary(pipelineId)
      .then(setResult)
      .catch((err: unknown) => {
        if (isHttpError(err) && err.status === 429) {
          showAlert({
            tone: "warning",
            title: err.is("usage/limit_exceeded")
              ? "Límite de IA del plan alcanzado"
              : `Demasiadas consultas de IA. Intenta de nuevo en ${err.retryAfterSeconds ?? 60} s`,
            open: true,
          });
        } else {
          showAlert({ tone: "error", title: errorMessage(err, "El copiloto no pudo responder"), open: true });
        }
        onOpenChange(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  return (
    <Modal
      open={true}
      onOpenChange={onOpenChange}
      config={{
        title: "Resumen IA del pipeline",
        description: "Análisis del estado actual: usa IA del plan.",
        className: "sm:max-w-lg",
        actions: [{ label: "Cerrar", variant: "outline", asClose: true, id: "copilot-pl-close" }],
      }}
    >
      {result === null ? (
        <div className="space-y-2" role="status" aria-label="Generando con IA">
          <div className="h-4 w-full animate-pulse rounded bg-accent-violet/15" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-accent-violet/15" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-accent-violet/15" />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p>{result.summary}</p>

          {result.risks.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingDown className="size-3.5 text-warning" aria-hidden />
                Riesgos
              </h4>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                {result.risks.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {result.opportunities.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-3.5 text-success" aria-hidden />
                Oportunidades
              </h4>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                {result.opportunities.map((opportunity, index) => (
                  <li key={index}>{opportunity}</li>
                ))}
              </ul>
            </div>
          )}

          {result.cached && (
            <Badge variant="outline" className="border-border text-muted-foreground">
              <Sparkles className="size-3" aria-hidden />
              respuesta de caché — no consumió tokens
            </Badge>
          )}
        </div>
      )}
    </Modal>
  );
}
