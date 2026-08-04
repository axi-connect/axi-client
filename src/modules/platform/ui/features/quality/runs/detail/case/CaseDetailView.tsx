"use client";

/**
 * Detalle de un case EN VIVO: dos columnas (transcript 60 % | veredicto
 * 40 %, apiladas en <lg). `useRunCaseQuery` pollea cada 3 s mientras el
 * case no esté asentado. Case purgado → transcript vacío + evaluación null
 * (el backend responde 200): se explica en un EmptyState, no se rompe.
 */
import Link from "next/link";
import { ArrowLeft, EyeOff } from "lucide-react";
import { TableSkeleton } from "@/shared/components/features/loading";
import { isCaseSettled } from "../../../../../../domain/quality-runs";
import { useRunCaseQuery } from "../../../../../../infrastructure/api/hooks/use-quality-runs";
import { EmptyState } from "../../../../../components/EmptyState";
import { ProblemAlert } from "../../../../../components/ProblemAlert";
import { StatusBadge } from "../../../../../components/StatusBadge";
import { FailureReasonBadge } from "../FailureReasonBadge";
import { ChecksPanel } from "./ChecksPanel";
import { EvaluationPanel } from "./EvaluationPanel";
import { TimingsPanel } from "./TimingsPanel";
import { TranscriptPanel } from "./TranscriptPanel";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function CaseDetailView({ runId, caseId }: { runId: string; caseId: string }) {
  const caseQuery = useRunCaseQuery(runId, caseId);

  if (caseQuery.isPending) return <TableSkeleton rows={6} />;
  if (caseQuery.isError) {
    return <ProblemAlert error={caseQuery.error} onRetry={() => void caseQuery.refetch()} />;
  }
  const runCase = caseQuery.data;
  if (!runCase) return null;

  const live = !isCaseSettled(runCase.status);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href={`/platform/quality/runs/${runId}`}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Detalle de la ejecución
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {runCase.scenario ? (
              <>
                <span className="font-mono text-base">{runCase.scenario.code}</span>
                <span className="ml-2 text-muted-foreground">{runCase.scenario.name}</span>
              </>
            ) : (
              "Conversación sintética"
            )}
          </h2>
          <StatusBadge status={runCase.status} />
          <FailureReasonBadge reason={runCase.failure_reason} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {runCase.turns_used} {runCase.turns_used === 1 ? "turno" : "turnos"}
          </span>
        </div>

        {runCase.scenario_goal && (
          <p className="text-sm text-muted-foreground">Objetivo: {runCase.scenario_goal}</p>
        )}
      </div>

      {runCase.purged && (
        <EmptyState
          icon={EyeOff}
          title="Datos purgados"
          description="El transcript y la evaluación de este case fueron eliminados al purgar la ejecución; los checks y scores agregados se conservan abajo."
        />
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Purgado: el transcript ya no existe — el EmptyState de arriba lo explica. */}
        {!runCase.purged && (
          <section className="space-y-2 lg:col-span-3">
            <h3 className="text-sm font-semibold">
              Transcript
              {live && <span className="ml-2 text-xs font-normal text-muted-foreground">actualizándose…</span>}
            </h3>
            <div className="rounded-2xl border border-border bg-background p-4">
              <TranscriptPanel transcript={runCase.transcript} />
            </div>
          </section>
        )}

        <div className={runCase.purged ? "space-y-5 lg:col-span-5" : "space-y-5 lg:col-span-2"}>
          <div className="space-y-5 rounded-2xl border border-border bg-background p-4">
            <Section title="Checks">
              <ChecksPanel checks={runCase.checks} />
            </Section>
            <Section title="Veredicto del juez">
              <EvaluationPanel evaluation={runCase.evaluation} />
            </Section>
            <Section title="Latencia por turno">
              <TimingsPanel timings={runCase.timings} />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
