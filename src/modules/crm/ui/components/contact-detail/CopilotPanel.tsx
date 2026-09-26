"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy as CopyIcon, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
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
  { value: "action", label: "Siguiente paso" },
  { value: "draft", label: "Borrador" },
];

const URGENCY_TONE: Record<CopilotUrgency, StatePillTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
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
        });
      } else {
        showAlert({ tone: "error", title: errorMessage(err, "Axi no pudo responder") });
      }
    } finally {
      setLoading(null);
    }
  };

  const copyDraft = (message: string) => {
    void navigator.clipboard?.writeText(message);
    showAlert({ tone: "success", title: "Borrador copiado — pégalo en el inbox" });
  };

  return (
    // Tarjeta sólida (continuidad, F4–F9): el violeta vive solo en el icono de
    // Axi. La isla de la ficha es «Lo próximo»; una por pantalla (§9.5).
    <section className="rounded-3xl border border-border bg-card p-5 md:p-6" aria-labelledby={`copilot-${contactId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`copilot-${contactId}`} className="flex items-center gap-2 font-heading text-lg font-bold">
          <Sparkles className="size-4 text-accent-violet" aria-hidden />
          Axi
        </h3>
        <span className="text-xs text-muted-foreground">usa IA del plan</span>
      </div>
      <div role="group" aria-label="Qué le pides a Axi" className="mt-3 inline-flex max-w-full flex-wrap gap-0.5 rounded-full border border-border p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            disabled={loading !== null}
            aria-pressed={result?.tab === tab.value}
            onClick={() => void generate(tab.value)}
            className={cn(
              "h-8 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
              result?.tab === tab.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading !== null && (
        <div className="mt-4 space-y-2" role="status" aria-label="Generando con IA">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-violet" aria-hidden />
            Axi está leyendo la relación…
          </p>
          <div className="h-3.5 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {result !== null && loading === null && (
        <div className="mt-4 space-y-3 text-sm">
          {result.tab === "summary" && (
            <>
              <p className="leading-relaxed text-pretty break-words">{result.data.summary}</p>
              {result.data.highlights.length > 0 && (
                <ul className="space-y-1.5 text-[13px] text-muted-foreground">
                  {result.data.highlights.map((highlight, index) => (
                    <li key={index} className="grid grid-cols-[0.375rem_minmax(0,1fr)] gap-2.5 break-words">
                      <span aria-hidden className="mt-2 size-1.5 rounded-full bg-border" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {result.tab === "action" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 font-medium text-pretty break-words">{result.data.action}</p>
                <StatePill tone={URGENCY_TONE[result.data.urgency]}>
                  Urgencia {COPILOT_URGENCY_LABELS[result.data.urgency].toLowerCase()}
                </StatePill>
              </div>
              <p className="text-pretty break-words text-muted-foreground">{result.data.rationale}</p>
              {/* F5: de consejo a acción en un clic. El botón PRE-RELLENA el
                  formulario de seguimiento; no programa nada por su cuenta —
                  una propuesta del modelo nunca abre sola una conversación con
                  un cliente. `null` cuando lo que toca no es contactarle. */}
              {result.data.proposal !== null && (
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link href={proposalHref(contactId, result.data.proposal)}>
                    <Sparkles className="size-3.5 text-accent-violet" aria-hidden />
                    Programar este seguimiento
                  </Link>
                </Button>
              )}
            </>
          )}

          {result.tab === "draft" && (
            <>
              <blockquote className="rounded-2xl bg-muted p-3.5 leading-relaxed text-pretty break-words">
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

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {result.data.cached && (
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs text-muted-foreground">
                Guardado · no gastó IA del plan
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs text-muted-foreground"
              disabled={!result.data.cached}
              aria-describedby={result.data.cached ? undefined : `copilot-regen-${contactId}`}
              onClick={() => void generate(result.tab)}
            >
              <RotateCcw className="size-3" aria-hidden />
              Regenerar
            </Button>
            {!result.data.cached && (
              <span id={`copilot-regen-${contactId}`} className="text-xs text-muted-foreground">
                Recién generado: podrás pedir otro cuando expire.
              </span>
            )}
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

/**
 * La propuesta viaja por la URL al flujo de «Programar seguimiento» de F2: es
 * la misma pantalla que usa el operador a mano, con los campos ya escritos.
 * Reutilizarla —en vez de un formulario propio del copiloto— es lo que hace
 * que el aviso de ventana, el horario silencioso y la plantilla de apertura se
 * apliquen igual a lo que propone la IA.
 */
function proposalHref(
  contactId: string,
  proposal: { task_channel: string; objective: string; due_in_hours: number },
): string {
  const params = new URLSearchParams({
    executor: "agent",
    contact_id: contactId,
    objective: proposal.objective,
    medium: proposal.task_channel,
    due_in_hours: String(proposal.due_in_hours),
  });
  return `/crm/tasks/create?${params.toString()}`;
}
