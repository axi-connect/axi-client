"use client";

/**
 * Cabecera viva de «Ejecuciones» (quality_premium_plan F4): la isla muestra la
 * ejecución en curso más reciente DE TODAS (consulta propia, sin los filtros ni
 * la página de la tabla: QA Q1), caso por caso; al lado, tres cifras de la
 * página cargada. El endpoint no trae agregados globales, así que las cifras
 * dicen de qué salen («en esta página») en vez de inventar un «últimos 7 días».
 */
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { isRunCancelable, type RunListItem } from "../../../../domain/quality-runs";
import { BigFigure, InkPanel, Kicker, Meter, QualityTile } from "../shared/premium";
import { formatSpendUsd, runKindLabel, runScopeLabel } from "./runs-format";

/** Un tramo por caso: aprobado, fallido, bloqueado o pendiente, en ese orden. */
function caseSegments(run: Pick<RunListItem, "cases_passed" | "cases_failed" | "cases_blocked" | "cases_total">) {
  const pending = Math.max(0, run.cases_total - run.cases_passed - run.cases_failed - run.cases_blocked);
  return [
    ...Array<string>(run.cases_passed).fill("passed"),
    ...Array<string>(run.cases_failed).fill("failed"),
    ...Array<string>(run.cases_blocked).fill("blocked"),
    ...Array<string>(pending).fill("pending"),
  ];
}

const SEGMENT_CLASS: Record<string, string> = {
  passed: "bg-background dark:bg-foreground",
  failed: "bg-destructive",
  blocked: "bg-warning",
  pending: "bg-background/20 dark:bg-foreground/15",
};

export function RunsOverview({ runs, total, live }: { runs: RunListItem[]; total: number; live: RunListItem | null }) {
  const passed = runs.reduce((sum, run) => sum + run.cases_passed, 0);
  const settled = runs.reduce((sum, run) => sum + run.cases_passed + run.cases_failed + run.cases_blocked, 0);
  const spend = runs.reduce((sum, run) => sum + (run.spend_usd ?? 0), 0);
  const running = runs.filter((run) => isRunCancelable(run.status)).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] md:grid-cols-2">
      <LivePanel run={live} />
      <QualityTile label="Ejecuciones" as="article">
        <BigFigure value={total} unit="en total" />
        <p className="mt-auto text-xs text-muted-foreground">
          {running > 0 ? `${running} en curso en esta página` : "ninguna en curso en esta página"}
        </p>
      </QualityTile>
      <QualityTile label="Casos aprobados" as="article">
        <BigFigure value={settled === 0 ? "—" : Math.round((passed / settled) * 100)} unit={settled === 0 ? undefined : "%"} />
        <div className="mt-auto space-y-1.5">
          <Meter value={settled === 0 ? 0 : passed / settled} label="Casos aprobados en esta página" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {passed} de {settled} en esta página
          </p>
        </div>
      </QualityTile>
      <QualityTile label="Gasto de plataforma" as="article">
        <BigFigure value={formatSpendUsd(spend)} />
        <p className="mt-auto text-xs text-muted-foreground">
          <span className="whitespace-nowrap">en las {runs.length} de esta página</span> ·{" "}
          <span className="whitespace-nowrap">nunca al tenant</span>
        </p>
      </QualityTile>
    </div>
  );
}

function LivePanel({ run }: { run: RunListItem | null }) {
  if (!run) {
    return (
      <InkPanel label="En curso" className="md:col-span-2 xl:col-span-1">
        <Kicker>En curso</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">Nada corriendo</p>
        <p className="text-sm opacity-80">Lanza una ejecución de QA, estrés o un probe contra un tenant.</p>
        <div className="mt-auto pt-2">
          <Button asChild variant="secondary">
            <Link href="/platform/quality/runs/new" prefetch={false}>
              <Plus aria-hidden="true" />
              Nueva ejecución
            </Link>
          </Button>
        </div>
      </InkPanel>
    );
  }
  const segments = caseSegments(run);
  const done = run.cases_passed + run.cases_failed + run.cases_blocked;
  return (
    <InkPanel label="En curso" className="md:col-span-2 xl:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <Kicker>En curso</Kicker>
        <span className="text-xs opacity-70">{run.status === "pending" ? "en cola" : runKindLabel(run.kind)}</span>
      </div>
      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-2xl leading-tight font-bold tracking-tight">{run.company_name}</p>
          <p className="truncate font-mono text-xs opacity-80">{runScopeLabel(run)}</p>
        </div>
        <p className="shrink-0 font-heading leading-none font-bold whitespace-nowrap tabular-nums">
          <span className="text-4xl">{done}</span>
          <span className="ml-1 text-base font-normal opacity-70">de {run.cases_total}</span>
        </p>
      </div>
      {segments.length > 0 && segments.length <= 60 ? (
        <div aria-hidden="true" className="flex gap-[3px] pt-1">
          {segments.map((segment, index) => (
            <span key={index} className={cn("h-2 min-w-0 flex-1 rounded-full", SEGMENT_CLASS[segment])} />
          ))}
        </div>
      ) : (
        <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-background/20 dark:bg-foreground/15">
          <span
            className="block h-full rounded-full bg-background dark:bg-foreground"
            style={{ width: `${run.cases_total === 0 ? 0 : (done / run.cases_total) * 100}%` }}
          />
        </span>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <span className="opacity-80">
          <span className="whitespace-nowrap">{run.cases_passed} aprobados</span> ·{" "}
          <span className="whitespace-nowrap">{run.cases_failed} fallidos</span> ·{" "}
          <span className="whitespace-nowrap">{formatSpendUsd(run.spend_usd)}</span>
        </span>
        <Link
          href={`/platform/quality/runs/${run.id}`}
          prefetch={false}
          className="inline-flex min-h-6 items-center gap-1 font-medium whitespace-nowrap underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Ver en vivo
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </InkPanel>
  );
}
