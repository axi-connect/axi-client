"use client";

import { Clock3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import type { CopilotPipelineDTO } from "@/modules/crm/domain/copilot";
import { generatePipelineSummary } from "@/modules/crm/infrastructure/services/copilot-service.adapter";
import { Modal } from "@/shared/components/ui/modal";

function Group({ tone, title, items }: { tone: "warning" | "success"; title: string; items: string[] }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true" className={tone === "warning" ? "size-1.5 rounded-full bg-warning" : "size-1.5 rounded-full bg-success"} />
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="grid grid-cols-[0.375rem_minmax(0,1fr)] gap-3 text-[13px] leading-relaxed text-pretty break-words text-muted-foreground">
            <span aria-hidden="true" className="mt-2 size-1.5 rounded-full bg-border" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Resumen de Axi del pipeline (gate crm:copilot; lienzo CRM premium F1,
 * tablero 8). Diálogo sólido; el violeta vive solo en el icono. Genera al
 * abrir; 429/límite → aviso y cierre. El texto es el que devuelve el
 * copiloto: aquí solo se ordena.
 */
export function PipelineSummaryDialog({
  pipelineId,
  pipelineName,
  onOpenChange,
}: {
  pipelineId: string;
  pipelineName: string;
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
          });
        } else {
          showAlert({ tone: "error", title: errorMessage(err, "Axi no pudo responder") });
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
        title: `Así va ${pipelineName}`,
        description: "Resumen de Axi · usa IA del plan",
        className: "sm:max-w-2xl",
        actions: [{ label: "Cerrar", variant: "outline", asClose: true, id: "copilot-pl-close" }],
      }}
    >
      <div className="sidebar-scroll -mr-2 max-h-[60vh] min-w-0 space-y-4 overflow-y-auto overscroll-contain pr-2">
        {result === null ? (
          <div className="space-y-2.5" role="status" aria-label="Axi está leyendo el pipeline">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-accent-violet" aria-hidden="true" />
              Axi está leyendo el pipeline…
            </p>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed text-pretty break-words">{result.summary}</p>
            {(result.risks.length > 0 || result.opportunities.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.risks.length > 0 && <Group tone="warning" title="Lo que puede caerse" items={result.risks} />}
                {result.opportunities.length > 0 && (
                  <Group tone="success" title="Lo que puedes ganar" items={result.opportunities} />
                )}
              </div>
            )}
            {result.cached && (
              <p className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium">
                <Clock3 className="size-3" aria-hidden="true" />
                Respuesta guardada · no gastó IA del plan
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
