"use client";

/**
 * Tabla de ejecuciones sobre primitivos (patrón `AgentsHealthTable`): el
 * endpoint no tiene búsqueda ni orden — el backend lista por `created_at
 * desc` y así se respeta. Semáforo del score con `thresholds.ts`. En F3 la
 * fila no navega (el detalle llega en F4).
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { RunListItem } from "../../../../domain/quality-runs";
import { scoreTone } from "../../../../domain/thresholds";
import { formatScore } from "../../analytics/analytics-format";
import { MetricCell } from "../../analytics/MetricCell";
import { StatusBadge } from "../../../components/StatusBadge";
import { RunRowActions } from "./RunRowActions";
import { aiModeLabel, formatSpendUsd, runKindLabel, runScopeLabel } from "./runs-format";

export function RunsTable({ runs }: { runs: RunListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>Alcance</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead className="text-right">Score juez</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead>Creada</TableHead>
            <TableHead aria-label="Acciones" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const mode = aiModeLabel(run.ai_mode);
            const settled = run.cases_passed + run.cases_failed + run.cases_blocked;
            return (
              <TableRow key={run.id}>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        run.kind === "stress"
                          ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                          : "border-border text-muted-foreground"
                      }
                    >
                      {runKindLabel(run.kind)}
                    </Badge>
                    {mode && <span className="text-xs text-muted-foreground">{mode}</span>}
                  </span>
                </TableCell>
                <TableCell className="max-w-44 truncate font-medium">{run.company_name}</TableCell>
                <TableCell className="max-w-40">
                  {run.target_agent ? (
                    <span className="block truncate">
                      {run.target_agent.name}
                      <span className="block truncate text-xs text-muted-foreground">
                        {run.target_agent.model}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs">{runScopeLabel(run)}</TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {settled === 0 && run.cases_total === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="whitespace-nowrap">
                      <span className="text-success">{run.cases_passed}✓</span>{" "}
                      <span className={run.cases_failed > 0 ? "text-destructive" : "text-muted-foreground"}>
                        {run.cases_failed}✗
                      </span>
                      {run.cases_blocked > 0 && (
                        <span className="text-warning"> {run.cases_blocked}⊘</span>
                      )}
                      <span className="text-muted-foreground"> / {run.cases_total}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <MetricCell tone={scoreTone(run.avg_judge_score)}>
                    {formatScore(run.avg_judge_score)}
                  </MetricCell>
                </TableCell>
                <TableCell
                  className="text-right tabular-nums text-muted-foreground"
                  title="Gasto de plataforma (bill_to: platform)"
                >
                  {formatSpendUsd(run.spend_usd)}
                </TableCell>
                <TableCell>
                  <RelativeDate iso={run.created_at} className="text-muted-foreground" />
                </TableCell>
                <TableCell className="w-10">
                  <RunRowActions run={run} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
