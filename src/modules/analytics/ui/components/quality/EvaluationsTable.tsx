"use client";

import { useCallback, useMemo } from "react";
import { CheckCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { relativeTime } from "@/core/lib/relative-time";
import { errorMessage } from "@/core/lib/error-messages";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CardEmpty } from "@/shared/components/features/card-empty";
import BasicPagination from "@/shared/components/ui/pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getEvaluations } from "@/modules/analytics/infrastructure/services/analytics-service.adapter";
import {
  HALLUCINATION_LABELS,
  ISSUE_LABELS,
  SCORE_BAND_LABELS,
  issueLabel,
  outcomeLabel,
  type ScoreBand,
} from "@/modules/analytics/domain/labels";
import type {
  AnalyticsPeriod,
  EvaluationDTO,
  EvaluationSort,
} from "@/modules/analytics/domain/analytics";
import { ScoreBadge } from "./score-badge";
import { SectionError } from "../conversion/section-states";

const SORT_LABELS: Record<EvaluationSort, string> = {
  score_asc: "Peores primero",
  score_desc: "Mejores primero",
  recent: "Recientes",
};

/** Rango de score por banda (params `min_score`/`max_score` del backend). */
const BAND_RANGE: Record<ScoreBand, { min_score?: number; max_score?: number }> = {
  critical: { max_score: 49 },
  warning: { min_score: 50, max_score: 79 },
  good: { min_score: 80 },
};

const BANDS: ScoreBand[] = ["critical", "warning", "good"];

export type EvaluationFilters = {
  sort: EvaluationSort;
  agentId: string | null;
  issueCode: string | null;
  band: ScoreBand | null;
};

/** Preset del dominio: el owner entra a Calidad a encontrar qué arreglar. */
export const DEFAULT_EVALUATION_FILTERS: EvaluationFilters = {
  sort: "score_asc",
  agentId: null,
  issueCode: null,
  band: null,
};

/**
 * Card "Evaluaciones": listado paginado del LLM-judge (usePaginatedList) con
 * filtros de orden/agente/problema/banda. Fila rica clicable → Sheet de
 * detalle. `major` SIEMPRE visible en destructive.
 */
export function EvaluationsTable({
  period,
  filters,
  agents,
  refreshToken = 0,
  onFiltersChange,
  onOpenEvaluation,
}: {
  period: AnalyticsPeriod;
  filters: EvaluationFilters;
  /** Para el filtro por agente y resolver nombres en las filas. */
  agents: { agent_id: string; name: string }[];
  /** Incrementarlo fuerza un re-fetch (calibración guardada, WS). */
  refreshToken?: number;
  onFiltersChange: (filters: EvaluationFilters) => void;
  onOpenEvaluation: (evaluation: EvaluationDTO) => void;
}) {
  const agentNames = useMemo(
    () => new Map(agents.map((agent) => [agent.agent_id, agent.name])),
    [agents],
  );

  // `refreshToken` solo cambia la identidad del objeto: fuerza el re-fetch
  // de usePaginatedList sin tocar la query real (no viaja al backend).
  const extraParams = useMemo(
    () => ({
      period,
      sort: filters.sort,
      ...(filters.agentId ? { agent_id: filters.agentId } : {}),
      ...(filters.issueCode ? { issue_code: filters.issueCode } : {}),
      ...(filters.band ? BAND_RANGE[filters.band] : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, filters, refreshToken],
  );

  const fetcher = useCallback(
    (params: Record<string, unknown>) =>
      getEvaluations(params as Parameters<typeof getEvaluations>[0]),
    [],
  );

  const list = usePaginatedList<EvaluationDTO>({
    fetcher,
    pageSize: 20,
    extraParams,
  });

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const patch = (partial: Partial<EvaluationFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <DashboardCard title="Evaluaciones">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={filters.sort}
          onValueChange={(value) => patch({ sort: value as EvaluationSort })}
        >
          <SelectTrigger className="h-8 w-40" aria-label="Orden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as EvaluationSort[]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.agentId ?? "all"}
          onValueChange={(value) => patch({ agentId: value === "all" ? null : value })}
        >
          <SelectTrigger className="h-8 w-40" aria-label="Agente">
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los agentes</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.agent_id} value={agent.agent_id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.issueCode ?? "all"}
          onValueChange={(value) => patch({ issueCode: value === "all" ? null : value })}
        >
          <SelectTrigger className="h-8 w-48" aria-label="Problema">
            <SelectValue placeholder="Problema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los problemas</SelectItem>
            {Object.entries(ISSUE_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Bandas de score">
          {BANDS.map((band) => {
            const active = filters.band === band;
            return (
              <button
                key={band}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ band: active ? null : band })}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {SCORE_BAND_LABELS[band]}
                {band === "critical" && " <50"}
                {band === "warning" && " 50–79"}
                {band === "good" && " ≥80"}
              </button>
            );
          })}
        </div>
      </div>

      {list.error ? (
        <SectionError message={errorMessage(list.error)} onRetry={() => void list.refresh()} />
      ) : list.loading && list.items.length === 0 ? (
        <div role="status" aria-label="Cargando evaluaciones" className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : list.items.length === 0 ? (
        <CardEmpty
          glyph="ai"
          message="Aún no hay evaluaciones. Cada conversación cerrada se evalúa automáticamente para ayudarte a mejorar a tus agentes."
        />
      ) : (
        <>
          <ul className={cn("divide-y divide-border", list.loading && "opacity-60")}>
            {list.items.map((evaluation) => {
              const agentName = evaluation.ai_agent_id
                ? (agentNames.get(evaluation.ai_agent_id) ?? "Agente")
                : "Agente";
              const firstIssue = evaluation.issues[0];
              return (
                <li key={evaluation.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEvaluation(evaluation)}
                    className="flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {relativeTime(evaluation.created_at)}
                      </span>
                      <span className="font-medium">{agentName}</span>
                      {evaluation.overall_score !== null && (
                        <ScoreBadge score={evaluation.overall_score} />
                      )}
                      <span className="text-muted-foreground">
                        {outcomeLabel(evaluation.outcome)}
                      </span>
                      {evaluation.hallucination_severity === "major" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                          <TriangleAlert aria-hidden className="size-3" />
                          {HALLUCINATION_LABELS.major}
                        </span>
                      )}
                      {evaluation.human_score !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCheck aria-hidden className="size-3.5" />
                          calibrada ({Math.round(evaluation.human_score)})
                        </span>
                      )}
                    </span>
                    {(evaluation.summary || firstIssue) && (
                      <span className="flex flex-wrap items-center gap-2 pl-[4.5rem] text-xs text-muted-foreground">
                        {evaluation.summary && (
                          <span className="line-clamp-1 max-w-xl">
                            “{evaluation.summary}”
                          </span>
                        )}
                        {firstIssue && (
                          <span className="shrink-0 rounded-full border border-border px-2 py-0.5">
                            {issueLabel(firstIssue.code)}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <BasicPagination
                totalPages={totalPages}
                page={list.page}
                onPageChange={list.setPage}
              />
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
}
