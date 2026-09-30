import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatUsd, parseDecisionComparison } from "../../../../../domain/decisions";
import { parseProbeMetrics } from "../../../../../domain/quality-datasets";
import type { RunDetail } from "../../../../../domain/quality-runs";
import { formatLatency } from "../../../analytics/analytics-format";

/**
 * P1b (regla d): el mismo dataset contra cada par del motor de decisiones y
 * contra el clasificador actual (línea base). Solo aparece si la corrida
 * comparó proveedores. Mockup aprobado: docs/design/mockups/decisiones-ia/.
 */
export function DecisionComparisonCard({ run }: { run: RunDetail }) {
  const rows = parseDecisionComparison(run.metrics);
  const metrics = parseProbeMetrics(run.metrics);
  if (rows.length === 0 || metrics === null || metrics.probe_kind !== "intent") return null;

  // El gasto del clasificador actual = el de la corrida menos lo que costó el motor.
  const engineCost = rows.reduce((sum, row) => sum + row.cost_usd, 0);
  const all = [
    {
      key: "baseline",
      name: "Clasificador actual",
      detail: "el de las conversaciones de hoy",
      baseline: true,
      accuracy: metrics.accuracy,
      hits: metrics.hits,
      items: metrics.items,
      p50_ms: metrics.p50_ms,
      p95_ms: metrics.p95_ms,
      cost_usd: Math.max(0, (run.spend_usd ?? 0) - engineCost),
    },
    ...rows.map((row) => ({
      key: row.key,
      name: row.model,
      detail: `${row.provider} · ${row.model}${row.errors > 0 ? ` · ${String(row.errors)} con error` : ""}`,
      baseline: false,
      accuracy: row.accuracy,
      hits: row.hits,
      items: row.items,
      p50_ms: row.p50_ms,
      p95_ms: row.p95_ms,
      cost_usd: row.cost_usd,
    })),
  ];
  const best = Math.max(...all.map((row) => row.accuracy));

  return (
    <section aria-labelledby="probe-compare" className="border-border bg-card @container rounded-3xl border">
      <header className="px-5 pt-5 pb-3 sm:px-6">
        <h2 id="probe-compare" className="font-heading text-lg font-bold tracking-tight">
          Comparación de proveedores
        </h2>
        <p className="text-muted-foreground text-sm">
          Los mismos {metrics.items.toLocaleString("es-CO")} textos, la misma etiqueta. El costo es el de esta corrida.
        </p>
      </header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5 sm:pl-6">Proveedor y modelo</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead className="hidden text-right @xl:table-cell">Aciertos</TableHead>
            <TableHead className="hidden text-right @2xl:table-cell">p50</TableHead>
            <TableHead className="text-right">p95</TableHead>
            <TableHead className="pr-5 text-right sm:pr-6">Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {all.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="pl-5 sm:pl-6">
                <div className="flex min-w-0 flex-col gap-0.5 @md:min-w-44">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                    {row.baseline && (
                      <span className="bg-muted inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium">
                        línea base
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">{row.detail}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <span aria-hidden="true" className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                    <span className="bg-foreground block h-full rounded-full" style={{ width: `${Math.round(row.accuracy * 100)}%` }} />
                  </span>
                  <span className="tabular-nums">{Math.round(row.accuracy * 100)} %</span>
                  {row.accuracy === best && best > 0 && <span className="text-xs font-semibold">mejor</span>}
                </div>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums whitespace-nowrap @xl:table-cell">
                {row.hits.toLocaleString("es-CO")} de {row.items.toLocaleString("es-CO")}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums whitespace-nowrap @2xl:table-cell">
                {formatLatency(row.p50_ms)}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{formatLatency(row.p95_ms)}</TableCell>
              <TableCell className="pr-5 text-right tabular-nums whitespace-nowrap sm:pr-6">{formatUsd(row.cost_usd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
