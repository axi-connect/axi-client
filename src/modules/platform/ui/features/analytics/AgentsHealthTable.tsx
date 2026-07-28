"use client";

/**
 * Tabla de triage de agentes: el backend YA ordena por peor salud y ese
 * orden se respeta por defecto ("Ordenado por severidad"); click en un
 * encabezado re-habilita el sort manual (`sortRows`). Semáforos por
 * `thresholds.ts` vía `MetricCell`. Fila → detalle del tenant.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AgentHealth } from "../../../domain/analytics";
import {
  failureRateTone,
  hallucinationsTone,
  latencyTone,
  scoreTone,
} from "../../../domain/thresholds";
import { sortRows } from "../../lib/sort-rows";
import { formatLatency, formatPct, formatScore } from "./analytics-format";
import { MetricCell } from "./MetricCell";

type SortState = { by: keyof AgentHealth & string; dir: "asc" | "desc" } | null;

const SORTABLE: { key: keyof AgentHealth & string; label: string; numeric?: boolean }[] = [
  { key: "agent_name", label: "Agente" },
  { key: "company_name", label: "Tenant" },
  { key: "turns", label: "Turnos", numeric: true },
  { key: "failure_rate_pct", label: "Fallo", numeric: true },
  { key: "latency_p95_ms", label: "P95", numeric: true },
  { key: "avg_overall_score", label: "Score", numeric: true },
  { key: "major_hallucinations", label: "Aluc.", numeric: true },
];

export function AgentsHealthTable({ agents }: { agents: AgentHealth[] }) {
  const router = useRouter();
  // null = orden del backend (severidad). Solo se ordena bajo interacción.
  const [sort, setSort] = useState<SortState>(null);

  const rows = useMemo(
    () => (sort ? sortRows(agents, sort.by, sort.dir) : agents),
    [agents, sort],
  );

  function toggleSort(by: keyof AgentHealth & string) {
    setSort((current) =>
      current?.by === by
        ? current.dir === "asc"
          ? { by, dir: "desc" }
          : null // tercer click: vuelve al orden del backend
        : { by, dir: "asc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            {SORTABLE.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.numeric && "text-right")}
                aria-sort={
                  sort?.by === column.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                    sort?.by === column.key && "text-foreground",
                  )}
                  aria-label={`Ordenar por ${column.label}`}
                >
                  {column.label}
                  <ArrowUpDown aria-hidden="true" className="size-3 opacity-50" />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((agent) => (
            <TableRow
              key={agent.agent_id}
              onClick={() => router.push(`/platform/tenants/${agent.company_id}`)}
              // Operable por teclado: la fila navega igual que el click.
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/platform/tenants/${agent.company_id}`);
                }
              }}
              aria-label={`Ver tenant de ${agent.agent_name}`}
              className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <TableCell className="font-medium">{agent.agent_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {agent.company_name ?? `${agent.company_id.slice(0, 8)}…`}
              </TableCell>
              <TableCell className="text-right tabular-nums">{agent.turns.toLocaleString("es-CO")}</TableCell>
              <TableCell className="text-right">
                <MetricCell tone={failureRateTone(agent.failure_rate_pct)}>
                  {formatPct(agent.failure_rate_pct)}
                </MetricCell>
              </TableCell>
              <TableCell className="text-right">
                <MetricCell tone={latencyTone(agent.latency_p95_ms)}>
                  {formatLatency(agent.latency_p95_ms)}
                </MetricCell>
              </TableCell>
              <TableCell className="text-right">
                <MetricCell tone={scoreTone(agent.avg_overall_score)}>
                  {formatScore(agent.avg_overall_score)}
                </MetricCell>
              </TableCell>
              <TableCell className="text-right">
                <MetricCell tone={hallucinationsTone(agent.major_hallucinations)}>
                  {agent.major_hallucinations}
                </MetricCell>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
