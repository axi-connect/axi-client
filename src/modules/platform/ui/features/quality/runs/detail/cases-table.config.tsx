/**
 * Columnas de la tabla de cases del detalle. Los `cases[]` llegan COMPLETOS
 * (sin paginar, ≤200) → DataTable en modo CLIENTE (paginación/búsqueda
 * locales; sin virtualización, decisión del plan). `invalid_criteria` en un
 * check marca ESCENARIO ROTO — se pinta en warning, no como fallo del agente.
 */
import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  isInvalidCriteriaCheck,
  parseChecks,
  type RunCase,
} from "../../../../../domain/quality-runs";
import { scoreTone } from "../../../../../domain/thresholds";
import { formatScore } from "../../../analytics/analytics-format";
import { MetricCell } from "../../../analytics/MetricCell";
import { StatusBadge } from "../../../../components/StatusBadge";
import { FailureReasonBadge } from "./FailureReasonBadge";

/** Fila plana para la tabla (solo primitivos — contrato del DataTable). */
export type CaseRow = {
  id: string;
  scenario_code: string;
  scenario_name: string;
  status: string;
  turns_used: number;
  checks_passed: number;
  checks_total: number;
  has_invalid_criteria: boolean;
  judge_score: number | null;
  failure_reason: string | null;
  purged: boolean;
  finished_at: string | null;
};

export function toCaseRow(runCase: RunCase): CaseRow {
  const checks = parseChecks(runCase.checks);
  return {
    id: runCase.id,
    scenario_code: runCase.scenario?.code ?? "—",
    scenario_name: runCase.scenario?.name ?? "Conversación sintética",
    status: runCase.status,
    turns_used: runCase.turns_used,
    checks_passed: checks.filter((check) => check.passed).length,
    checks_total: checks.length,
    has_invalid_criteria: checks.some(isInvalidCriteriaCheck),
    judge_score: runCase.judge_score,
    failure_reason: runCase.failure_reason,
    purged: runCase.purged,
    finished_at: runCase.finished_at,
  };
}

export function buildCaseColumns(runId: string): ColumnDef<CaseRow>[] {
  return [
    {
      accessorKey: "scenario_code",
      header: "Escenario",
      sortable: true,
      minWidth: 200,
      cell: ({ row }) => (
        <span className="block">
          <span className="font-mono text-xs">{row.original.scenario_code}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.scenario_name}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      sortable: true,
      searchable: false,
      alwaysVisible: true,
      minWidth: 110,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "turns_used",
      header: "Turnos",
      sortable: true,
      searchable: false,
      minWidth: 80,
      cell: ({ row }) => <span className="tabular-nums">{row.original.turns_used}</span>,
    },
    {
      accessorKey: "checks_passed",
      header: "Checks",
      sortable: true,
      searchable: false,
      minWidth: 100,
      cell: ({ row }) => {
        if (row.original.checks_total === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <span
              className={
                row.original.checks_passed === row.original.checks_total
                  ? "text-success"
                  : "text-destructive font-medium"
              }
            >
              {row.original.checks_passed}/{row.original.checks_total}
            </span>
            {row.original.has_invalid_criteria && (
              <TriangleAlert
                aria-label="Criterios ilegibles: escenario roto, no es fallo del agente"
                className="size-3.5 text-warning"
              />
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "judge_score",
      header: "Score juez",
      sortable: true,
      searchable: false,
      minWidth: 100,
      cell: ({ row }) => (
        <MetricCell tone={scoreTone(row.original.judge_score)}>
          {formatScore(row.original.judge_score)}
        </MetricCell>
      ),
    },
    {
      accessorKey: "failure_reason",
      header: "Motivo",
      searchable: false,
      minWidth: 130,
      cell: ({ row }) =>
        row.original.failure_reason ? (
          <FailureReasonBadge reason={row.original.failure_reason} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "finished_at",
      header: "Terminó",
      sortable: true,
      searchable: false,
      minWidth: 110,
      cell: ({ row }) =>
        row.original.finished_at ? (
          <RelativeDate iso={row.original.finished_at} className="text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      alwaysVisible: true,
      minWidth: 90,
      cell: ({ row }) => (
        <Link
          href={`/platform/quality/runs/${runId}/cases/${row.original.id}`}
          prefetch={false}
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Ver el case ${row.original.scenario_code}`}
        >
          Ver
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ),
    },
  ];
}
