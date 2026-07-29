"use client";

import { useState } from "react";
import { Copy as CopyIcon, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  COPILOT_URGENCY_LABELS,
  type CopilotActionDTO,
  type CopilotDraftDTO,
  type CopilotSummaryDTO,
  type CopilotUrgency,
} from "@/modules/crm/domain/copilot";
import {
  generateContactSummary,
  generateFollowupDraft,
  generateNextBestAction,
} from "@/modules/crm/infrastructure/services/copilot-service.adapter";

type CopilotTab = "summary" | "action" | "draft";

type CopilotResult =
  | { tab: "summary"; data: CopilotSummaryDTO }
  | { tab: "action"; data: CopilotActionDTO }
  | { tab: "draft"; data: CopilotDraftDTO };

const TABS: Array<{ value: CopilotTab; label: string }> = [
  { value: "summary", label: "Resumen" },
  { value: "action", label: "Siguiente acción" },
  { value: "draft", label: "Borrador de seguimiento" },
];

const URGENCY_CLASSES: Record<CopilotUrgency, string> = {
  low: "border-transparent bg-secondary text-secondary-foreground",
  medium: "border-transparent bg-info/12 text-info",
  high: "border-transparent bg-warning/12 text-warning",
};

/**
 * Copiloto del vendedor (F7, gate crm:copilot — sin permiso no se renderiza).
 * Cada acción consume tokens del tenant (se avisa); `cached: true` = respuesta
 * de caché de 10 min sin costo, con botón Regenerar deshabilitado si acaba de
 * generarse. 429 → toast con Retry-After; límite de plan → mensaje claro.
 */
export function CopilotPanel({ contactId }: { contactId: string }) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState<CopilotTab | null>(null);
  const [result, setResult] = useState<CopilotResult | null>(null);

  if (!hasPermission("crm:copilot")) return null;

  const generate = async (tab: CopilotTab) => {
    setLoading(tab);
    try {
      const data =
        tab === "summary"
          ? await generateContactSummary(contactId)
          : tab === "action"
            ? await generateNextBestAction(contactId)
            : await generateFollowupDraft(contactId);
      setResult({ tab, data } as CopilotResult);
    } catch (err) {
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
    } finally {
      setLoading(null);
    }
  };

  const copyDraft = (message: string) => {
    void navigator.clipboard?.writeText(message);
    showAlert({ tone: "success", title: "Borrador copiado — pégalo en el inbox", open: true });
  };

  return (
    <section className="rounded-2xl border border-accent-violet/30 bg-accent-violet/5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-base font-semibold">
          <Sparkles className="size-4 text-accent-violet" aria-hidden />
          Copiloto
        </h3>
        <span className="text-[11px] text-muted-foreground">usa IA del plan</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            disabled={loading !== null}
            aria-pressed={result?.tab === tab.value}
            onClick={() => void generate(tab.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              result?.tab === tab.value
                ? "border-accent-violet/50 bg-accent-violet/10 text-accent-violet"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading !== null && (
        <div className="mt-4 space-y-2" role="status" aria-label="Generando con IA">
          <div className="h-4 w-full animate-pulse rounded bg-accent-violet/15" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-accent-violet/15" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-accent-violet/15" />
        </div>
      )}

      {result !== null && loading === null && (
        <div className="mt-4 space-y-3 text-sm">
          {result.tab === "summary" && (
            <>
              <p>{result.data.summary}</p>
              {result.data.highlights.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {result.data.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {result.tab === "action" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{result.data.action}</p>
                <Badge variant="outline" className={cn(URGENCY_CLASSES[result.data.urgency])}>
                  urgencia {COPILOT_URGENCY_LABELS[result.data.urgency].toLowerCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground">{result.data.rationale}</p>
            </>
          )}

          {result.tab === "draft" && (
            <>
              <blockquote className="rounded-xl border border-accent-violet/20 bg-background p-3 italic">
                {result.data.message}
              </blockquote>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => copyDraft(result.data.message)}
              >
                <CopyIcon className="size-3.5" />
                Copiar borrador
              </Button>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            {result.data.cached && (
              <Badge variant="outline" className="border-border text-muted-foreground">
                respuesta de caché — no consumió tokens
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs text-muted-foreground"
              disabled={!result.data.cached}
              title={result.data.cached ? undefined : "Recién generada — espera a que expire la caché"}
              onClick={() => void generate(result.tab)}
            >
              <RotateCcw className="size-3" />
              Regenerar
            </Button>
          </div>
        </div>
      )}

      {result === null && loading === null && (
        <p className="mt-4 text-sm text-muted-foreground">
          Resume la relación, sugiere el siguiente paso o redacta el mensaje de seguimiento por ti.
        </p>
      )}
    </section>
  );
}
